import { AVATAR_PUBLIC_BASE_URL, SUPABASE_URL } from "../../../config.js";
import { SupabaseApi } from "./supabaseApi.js";
import { createStorageAssetUrl, revokeStorageAssetUrl } from "./storageAsset.js";

const AVATAR_BUCKET = "avatars";
const MEMBER_AVATAR_BUCKET = "membership-profile-avatars";

let cachedStandardCatalog = null;
let cachedMemberCatalog = null;
let memberCatalogPromise = null;
let memberCacheGeneration = 0;
const memberObjectUrls = new Set();

function avatarImageUrl(storagePath = "") {
  const normalizedPath = String(storagePath || "")
    .trim()
    .replace(/^\/+/, "");
  if (!normalizedPath) {
    return null;
  }
  const configuredBaseUrl = String(AVATAR_PUBLIC_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");
  if (configuredBaseUrl) {
    return `${configuredBaseUrl}/${normalizedPath}`;
  }
  return `${String(SUPABASE_URL || "").replace(/\/+$/, "")}/storage/v1/object/public/${AVATAR_BUCKET}/${normalizedPath}`;
}

function mapAvatar(row = {}) {
  return {
    id: String(row.id || ""),
    displayName: String(row.display_name || row.displayName || "Avatar"),
    imageUrl: avatarImageUrl(row.storage_path || row.storagePath || ""),
    category: String(row.category || "all")
      .trim()
      .toLowerCase(),
    sortOrder: Number(row.sort_order || row.sortOrder || 0),
    bgColor: row.bg_color || row.bgColor || null,
    memberOnly: Boolean(row.member_only || row.memberOnly)
  };
}

function mapMemberAvatar(row = {}) {
  return {
    id: String(row.id || ""),
    displayName: String(row.display_name || row.displayName || "Avatar"),
    imageUrl: null,
    category: String(row.category || "supporter")
      .trim()
      .toLowerCase(),
    sortOrder: Number(row.sort_order || row.sortOrder || 0),
    bgColor: row.bg_color || row.bgColor || null,
    storagePath: String(row.storage_path || row.storagePath || "").trim(),
    assetVersion: Number(row.asset_version || row.assetVersion || 1) || 1,
    memberOnly: true
  };
}

async function loadMemberAvatarAsset(avatar, generation = memberCacheGeneration) {
  if (!avatar?.storagePath || avatar.imageUrl) {
    return avatar;
  }
  try {
    const blob = await SupabaseApi.downloadStorageObject(
      MEMBER_AVATAR_BUCKET,
      avatar.storagePath,
      true
    );
    const imageUrl = await createStorageAssetUrl(blob);
    if (generation !== memberCacheGeneration) {
      revokeStorageAssetUrl(imageUrl);
      return null;
    }
    if (imageUrl) {
      memberObjectUrls.add(imageUrl);
    }
    return imageUrl ? { ...avatar, imageUrl } : null;
  } catch (error) {
    console.warn(`Unable to load supporter avatar ${avatar.id}`, error);
    return null;
  }
}

async function loadMemberCatalog() {
  if (Array.isArray(cachedMemberCatalog)) {
    return cachedMemberCatalog;
  }
  if (memberCatalogPromise) {
    return memberCatalogPromise;
  }
  const generation = memberCacheGeneration;
  let requestPromise;
  requestPromise = (async () => {
    try {
      const response = await SupabaseApi.rpc("get_member_profile_avatar_catalog", {}, true);
      const entries = (Array.isArray(response) ? response : [])
        .map((row) => mapMemberAvatar(row))
        .filter((avatar) => avatar.id && avatar.storagePath);
      const loaded = await Promise.all(
        entries.map((avatar) => loadMemberAvatarAsset(avatar, generation))
      );
      if (generation !== memberCacheGeneration) {
        return [];
      }
      cachedMemberCatalog = loaded.filter(Boolean);
      return cachedMemberCatalog;
    } catch (error) {
      if (generation !== memberCacheGeneration) {
        return [];
      }
      console.warn("Unable to load supporter avatar catalog", error);
      cachedMemberCatalog = [];
      return cachedMemberCatalog;
    } finally {
      if (memberCatalogPromise === requestPromise) {
        memberCatalogPromise = null;
      }
    }
  })();
  memberCatalogPromise = requestPromise;
  return requestPromise;
}

export const AvatarRepository = {
  async getAvatarCatalog(hasMemberAccess = false) {
    if (!Array.isArray(cachedStandardCatalog)) {
      const response = await SupabaseApi.rpc("get_avatar_catalog", {}, false);
      cachedStandardCatalog = (Array.isArray(response) ? response : [])
        .map((row) => mapAvatar(row))
        .filter((avatar) => avatar.id && avatar.imageUrl);
    }

    if (!hasMemberAccess) {
      return cachedStandardCatalog;
    }

    const memberCatalog = await loadMemberCatalog();
    return [...cachedStandardCatalog, ...memberCatalog];
  },

  getAvatarImageUrl(avatarId, catalog = cachedStandardCatalog || []) {
    const normalizedId = String(avatarId || "").trim();
    if (!normalizedId) {
      return null;
    }
    return catalog.find((avatar) => avatar.id === normalizedId)?.imageUrl || null;
  },

  invalidateCache() {
    cachedStandardCatalog = null;
    cachedMemberCatalog = null;
    memberCatalogPromise = null;
    memberCacheGeneration += 1;
    memberObjectUrls.forEach((url) => revokeStorageAssetUrl(url));
    memberObjectUrls.clear();
  }
};
