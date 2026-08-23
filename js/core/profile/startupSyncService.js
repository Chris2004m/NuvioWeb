import { AuthManager } from "../auth/authManager.js";
import { addonRepository } from "../../data/repository/addonRepository.js";
import { ProfileManager } from "./profileManager.js";
import { ProfileSyncService } from "./profileSyncService.js";
import { LibrarySyncService } from "./librarySyncService.js";
import { WatchProgressSyncService } from "./watchProgressSyncService.js";
import { SavedLibrarySyncService } from "./savedLibrarySyncService.js";
import { WatchedItemsSyncService } from "./watchedItemsSyncService.js";
import { PluginSyncService } from "./pluginSyncService.js";
import { ProfileSettingsSyncService } from "./profileSettingsSyncService.js";
import { TraktCredentialSyncService } from "./traktCredentialSyncService.js";
import { SimklCredentialSyncService } from "./simklCredentialSyncService.js";
import { ProviderCredentialSyncService } from "./providerCredentialSyncService.js";
import { SimklSyncService } from "../../data/repository/simklSyncService.js";
import { watchProgressRepository } from "../../data/repository/watchProgressRepository.js";
import { TraktSettingsStore, WatchProgressSource } from "../../data/local/traktSettingsStore.js";
import { CollectionSyncService } from "./collectionSyncService.js";
import { HomeCatalogSettingsSyncService } from "./homeCatalogSettingsSyncService.js";
import { ThemeManager } from "../../ui/theme/themeManager.js";
import { MemberAccessRepository } from "../../data/remote/supabase/memberAccessRepository.js";
import { I18n } from "../../i18n/index.js";

const SYNC_INTERVAL_MS = 120000;
const ADDON_PUSH_DEBOUNCE_MS = 1000;
const MAX_PULL_ATTEMPTS = 3;
// Home must not remain behind a remote Continue Watching preflight forever.
// Keep the underlying sync alive so it can still update local state, but let
// the initial Home load fall back to its local snapshot/progress reads when a
// TV network request is slow or unavailable.
const HOME_CONTINUE_WATCHING_PREFLIGHT_TIMEOUT_MS = 12000;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withTimeout(promise, timeoutMs, fallback) {
  const durationMs = Math.max(0, Number(timeoutMs || 0));
  if (!durationMs) {
    return Promise.resolve(fallback);
  }

  let timer = null;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(fallback), durationMs);
    })
  ]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

function normalizeProfileId(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

async function collectKnownProfileIds(profiles = []) {
  const ids = [
    normalizeProfileId(ProfileManager.getActiveProfileId()),
    ...(Array.isArray(profiles) ? profiles : []).map((profile) =>
      normalizeProfileId(profile?.id ?? profile?.profileIndex)
    )
  ].filter(Boolean);

  if (ids.length <= 1) {
    const storedProfiles = await ProfileManager.getProfiles().catch(() => []);
    ids.push(
      ...storedProfiles
        .map((profile) => normalizeProfileId(profile?.id ?? profile?.profileIndex))
        .filter(Boolean)
    );
  }

  return Array.from(new Set(ids));
}

export const StartupSyncService = {
  started: false,
  intervalId: null,
  inFlight: false,
  inFlightPromise: null,
  continueWatchingInFlightPromise: null,
  profileScopedSyncEnabled: false,
  addonPushTimer: null,
  unsubscribeAddonChanges: null,

  async start({ profileScopedSyncEnabled = false, runInitialPull = true } = {}) {
    if (this.started) {
      if (profileScopedSyncEnabled) {
        this.profileScopedSyncEnabled = true;
      }
      return;
    }
    this.started = true;
    this.profileScopedSyncEnabled = Boolean(profileScopedSyncEnabled);

    this.unsubscribeAddonChanges = addonRepository.onInstalledAddonsChanged(() => {
      this.scheduleAddonPush();
    });

    if (runInitialPull) {
      await this.syncPull({ includeProfileScoped: this.profileScopedSyncEnabled });
    }

    this.intervalId = setInterval(() => {
      this.syncCycle();
    }, SYNC_INTERVAL_MS);
  },

  stop() {
    this.started = false;
    this.profileScopedSyncEnabled = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.addonPushTimer) {
      clearTimeout(this.addonPushTimer);
      this.addonPushTimer = null;
    }
    if (this.unsubscribeAddonChanges) {
      this.unsubscribeAddonChanges();
      this.unsubscribeAddonChanges = null;
    }
  },

  enableProfileScopedSync() {
    this.profileScopedSyncEnabled = true;
  },

  async requestSyncNow({ pushAfterPull = false } = {}) {
    if (!this.started) {
      return false;
    }
    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }
    if (this.continueWatchingInFlightPromise) {
      await this.continueWatchingInFlightPromise.catch(() => false);
      if (this.inFlightPromise) {
        return this.inFlightPromise;
      }
    }

    let requestPromise = null;
    requestPromise = (async () => {
      this.inFlight = true;
      try {
        const includeProfileScoped = this.profileScopedSyncEnabled;
        await this.syncPull({ includeProfileScoped });
        if (pushAfterPull && includeProfileScoped) {
          await this.syncPush();
        }
        return true;
      } finally {
        this.inFlight = false;
        if (this.inFlightPromise === requestPromise) {
          this.inFlightPromise = null;
        }
      }
    })();
    this.inFlightPromise = requestPromise;
    return requestPromise;
  },

  async requestContinueWatchingSyncNow() {
    if (!this.started || !AuthManager.isAuthenticated) {
      return false;
    }
    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }
    if (this.continueWatchingInFlightPromise) {
      return this.continueWatchingInFlightPromise;
    }

    let requestPromise = null;
    requestPromise = (async () => {
      try {
        const activeProfileId = ProfileManager.getActiveProfileId();

        // The active profile's settings determine which Continue Watching
        // source Home must read. Other profile settings remain background work.
        await ProfileSettingsSyncService.pull(activeProfileId);

        const requestedSource = TraktSettingsStore.get().watchProgressSource;
        if (requestedSource === WatchProgressSource.TRAKT) {
          await TraktCredentialSyncService.pullFromRemote(activeProfileId);
        } else if (requestedSource === WatchProgressSource.SIMKL) {
          await SimklCredentialSyncService.pullFromRemote(activeProfileId);
        }

        // Nuvio progress is stored in the synced local repository. Trakt and
        // Simkl are fetched by watchProgressRepository when it is warmed below.
        if (
          watchProgressRepository.getContinueWatchingSource() === WatchProgressSource.NUVIO_SYNC
        ) {
          await WatchProgressSyncService.pull();
        }
        return true;
      } catch (error) {
        console.warn("Continue Watching sync failed", error);
        return false;
      } finally {
        if (this.continueWatchingInFlightPromise === requestPromise) {
          this.continueWatchingInFlightPromise = null;
        }
      }
    })();
    this.continueWatchingInFlightPromise = requestPromise;
    return requestPromise;
  },

  async requestHomeSyncNow() {
    const deadline = Date.now() + HOME_CONTINUE_WATCHING_PREFLIGHT_TIMEOUT_MS;
    const remainingTime = () => Math.max(0, deadline - Date.now());
    const synced = await withTimeout(this.requestContinueWatchingSyncNow(), remainingTime(), false);
    if (!synced) {
      return false;
    }

    // Warm the same repository Home reads so the first Home render does not
    // race the provider snapshot request for Trakt or Simkl profiles.
    await withTimeout(
      watchProgressRepository.getAllForContinueWatching().catch((error) => {
        console.warn("Initial Continue Watching warm-up failed", error);
        return null;
      }),
      remainingTime(),
      null
    );
    return true;
  },

  async syncPull({ includeProfileScoped = this.profileScopedSyncEnabled } = {}) {
    if (!AuthManager.isAuthenticated) {
      return false;
    }
    let didApplyProfileSettings = false;
    for (let attempt = 1; attempt <= MAX_PULL_ATTEMPTS; attempt += 1) {
      try {
        const profiles = await ProfileSyncService.pull();
        const profileIds = await collectKnownProfileIds(profiles);
        for (const profileId of profileIds) {
          didApplyProfileSettings =
            (await ProfileSettingsSyncService.pull(profileId)) || didApplyProfileSettings;
        }
        if (didApplyProfileSettings) {
          await I18n.init();
          const memberAccess = await MemberAccessRepository.getAccess().catch(() =>
            MemberAccessRepository.getCurrentAccess()
          );
          ThemeManager.apply({ enforceAccess: true, access: memberAccess });
          I18n.apply();
        }
        await TraktCredentialSyncService.pullFromRemote(ProfileManager.getActiveProfileId());
        await SimklCredentialSyncService.pullFromRemote(ProfileManager.getActiveProfileId());
        await ProviderCredentialSyncService.syncFromRemote(ProfileManager.getActiveProfileId());
        await SimklSyncService.refresh().catch((error) => {
          console.warn("Simkl automatic refresh failed", error);
        });
        if (!includeProfileScoped) {
          return didApplyProfileSettings;
        }
        await CollectionSyncService.pull();
        await HomeCatalogSettingsSyncService.pull();
        await PluginSyncService.pull();
        await LibrarySyncService.pull();
        await SavedLibrarySyncService.pull();
        await WatchedItemsSyncService.pull();
        await WatchProgressSyncService.pull();
        return didApplyProfileSettings;
      } catch (error) {
        console.warn(`Startup sync pull failed (attempt ${attempt}/${MAX_PULL_ATTEMPTS})`, error);
        if (attempt < MAX_PULL_ATTEMPTS) {
          await sleep(3000);
        }
      }
    }
    return didApplyProfileSettings;
  },

  async syncPush() {
    if (!AuthManager.isAuthenticated) {
      return;
    }
    try {
      await ProfileSyncService.push();
      await ProfileSettingsSyncService.push();
      await TraktCredentialSyncService.pushCurrentToRemote(ProfileManager.getActiveProfileId());
      await SimklCredentialSyncService.pushCurrentToRemote(ProfileManager.getActiveProfileId());
      await CollectionSyncService.push();
      await HomeCatalogSettingsSyncService.push();
      await PluginSyncService.push();
      await LibrarySyncService.push();
      await SavedLibrarySyncService.push();
      await WatchedItemsSyncService.push();
      await WatchProgressSyncService.push();
    } catch (error) {
      console.warn("Startup sync push failed", error);
    }
  },

  async syncCycle() {
    return this.requestSyncNow({ pushAfterPull: true });
  },

  scheduleAddonPush() {
    if (!this.started || !this.profileScopedSyncEnabled) {
      return;
    }
    if (this.addonPushTimer) {
      clearTimeout(this.addonPushTimer);
    }
    this.addonPushTimer = setTimeout(async () => {
      this.addonPushTimer = null;
      if (!AuthManager.isAuthenticated) {
        return;
      }
      try {
        await LibrarySyncService.push();
      } catch (error) {
        console.warn("Addon auto push failed", error);
      }
    }, ADDON_PUSH_DEBOUNCE_MS);
  }
};
