import { SupabaseApi } from "./supabaseApi.js";
import { createStorageAssetUrl, revokeStorageAssetUrl } from "./storageAsset.js";

const PROFILE_BACKGROUND_BUCKET = "membership-profile-backgrounds";

let remoteCatalog = null;
let catalogLoadPromise = null;
let cacheGeneration = 0;
const assetPromises = new Map();
const objectUrls = new Set();
const listeners = new Set();

function mapBackground(row = {}) {
  return {
    id: String(row.id || "").trim(),
    displayName: String(row.display_name || row.displayName || row.name || "Background"),
    storagePath: String(row.storage_path || row.storagePath || "").trim(),
    portraitStoragePath: String(row.portrait_storage_path || row.portraitStoragePath || "").trim(),
    assetVersion: Number(row.asset_version || row.assetVersion || 1) || 1,
    imageUrl: null
  };
}

function notify() {
  const catalog = remoteCatalog || [];
  listeners.forEach((listener) => {
    try {
      listener(catalog);
    } catch (error) {
      console.warn("Profile background listener failed", error);
    }
  });
}

async function loadAndPublish(item) {
  if (!item?.id || item.imageUrl) {
    return item?.imageUrl || null;
  }
  if (assetPromises.has(item.id)) {
    return assetPromises.get(item.id);
  }
  const generation = cacheGeneration;
  let promise;
  promise = (async () => {
    try {
      const blob = await SupabaseApi.downloadStorageObject(
        PROFILE_BACKGROUND_BUCKET,
        item.storagePath,
        true
      );
      const imageUrl = await createStorageAssetUrl(blob);
      if (!imageUrl) {
        return null;
      }
      if (generation !== cacheGeneration) {
        revokeStorageAssetUrl(imageUrl);
        return null;
      }
      objectUrls.add(imageUrl);
      if (remoteCatalog) {
        const target = remoteCatalog.find((entry) => entry.id === item.id);
        if (target) {
          target.imageUrl = imageUrl;
          notify();
        }
      }
      return imageUrl;
    } catch (error) {
      console.warn(`Unable to load supporter profile background ${item.id}`, error);
      return null;
    } finally {
      if (assetPromises.get(item.id) === promise) {
        assetPromises.delete(item.id);
      }
    }
  })();
  assetPromises.set(item.id, promise);
  return promise;
}

export const ProfileBackgroundRepository = {
  async ensureLoaded() {
    if (Array.isArray(remoteCatalog)) {
      return remoteCatalog;
    }
    if (catalogLoadPromise) {
      return catalogLoadPromise;
    }
    const generation = cacheGeneration;
    let requestPromise;
    requestPromise = (async () => {
      try {
        const response = await SupabaseApi.rpc("get_member_profile_background_catalog", {}, true);
        if (generation !== cacheGeneration) {
          return [];
        }
        remoteCatalog = (Array.isArray(response) ? response : [])
          .map((row) => mapBackground(row))
          .filter((item) => item.id && item.storagePath);
        notify();
        return remoteCatalog;
      } catch (error) {
        if (generation !== cacheGeneration) {
          return [];
        }
        console.warn("Unable to load supporter profile background catalog", error);
        remoteCatalog = [];
        notify();
        return remoteCatalog;
      } finally {
        if (catalogLoadPromise === requestPromise) {
          catalogLoadPromise = null;
        }
      }
    })();
    catalogLoadPromise = requestPromise;
    return requestPromise;
  },

  getCatalog() {
    return Array.isArray(remoteCatalog) ? remoteCatalog : [];
  },

  getImageUrl(id) {
    const normalizedId = String(id || "").trim();
    if (!normalizedId) {
      return null;
    }
    return this.getCatalog().find((item) => item.id === normalizedId)?.imageUrl || null;
  },

  async loadSelectedAndPreload(selectedId = null) {
    const catalog = await this.ensureLoaded();
    const selected = catalog.find((item) => item.id === String(selectedId || "").trim());
    if (selected) {
      await loadAndPublish(selected);
    }
    await Promise.all(
      catalog.filter((item) => item !== selected).map((item) => loadAndPublish(item))
    );
    return catalog;
  },

  preloadImages() {
    return this.loadSelectedAndPreload(null);
  },

  subscribe(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }
    listeners.add(listener);
    listener(this.getCatalog());
    return () => listeners.delete(listener);
  },

  invalidateCache() {
    cacheGeneration += 1;
    assetPromises.clear();
    objectUrls.forEach((url) => revokeStorageAssetUrl(url));
    objectUrls.clear();
    remoteCatalog = null;
    catalogLoadPromise = null;
    notify();
  }
};
