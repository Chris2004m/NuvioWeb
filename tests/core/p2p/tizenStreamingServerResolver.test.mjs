import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Platform } from "../../../js/platform/index.js";
import { TizenStreamingServerResolver } from "../../../js/core/p2p/tizenStreamingServerResolver.js";
import { resetTizenCapabilitiesCache } from "../../../js/platform/tizen/tizenCapabilities.js";

const originalPlatformOverride = globalThis.__NUVIO_PLATFORM__;
const originalTizen = globalThis.tizen;
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const TORRENT = { infoHash: "0123456789abcdef0123456789abcdef01234567" };

function installTizen(version, webService = true) {
  globalThis.__NUVIO_PLATFORM__ = "tizen";
  globalThis.tizen = {
    systeminfo: {
      getCapability(name) {
        if (name === "http://tizen.org/feature/platform.version") {
          return version;
        }
        if (name === "http://tizen.org/feature/web.service") {
          return webService;
        }
        return false;
      }
    }
  };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { userAgent: `Mozilla/5.0 Tizen/${version} Chrome/${version === "4.0" ? 56 : 63}.0` }
  });
  Platform.current = null;
  resetTizenCapabilitiesCache();
}

afterEach(() => {
  if (typeof originalPlatformOverride === "undefined") {
    delete globalThis.__NUVIO_PLATFORM__;
  } else {
    globalThis.__NUVIO_PLATFORM__ = originalPlatformOverride;
  }
  if (typeof originalTizen === "undefined") {
    delete globalThis.tizen;
  } else {
    globalThis.tizen = originalTizen;
  }
  if (originalNavigatorDescriptor) {
    Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
  } else {
    delete globalThis.navigator;
  }
  Platform.current = null;
  resetTizenCapabilitiesCache();
});

test("Tizen 4 torrent sources are identified but cannot be resolved", () => {
  installTizen("4.0");

  assert.equal(TizenStreamingServerResolver.isTorrentStream(TORRENT), true);
  assert.equal(TizenStreamingServerResolver.canResolveStream(TORRENT), false);
  assert.equal(TizenStreamingServerResolver.isUnsupportedOnCurrentTizen(TORRENT), true);
});

test("Tizen 5 torrent sources remain eligible when the service is available", () => {
  installTizen("5.0");

  assert.equal(TizenStreamingServerResolver.canResolveStream(TORRENT), true);
  assert.equal(TizenStreamingServerResolver.isUnsupportedOnCurrentTizen(TORRENT), false);
});

test("Tizen P2P is disabled when the web service capability is absent", () => {
  installTizen("5.0", false);

  assert.equal(TizenStreamingServerResolver.canResolveStream(TORRENT), false);
  assert.equal(TizenStreamingServerResolver.isUnsupportedOnCurrentTizen(TORRENT), true);
});
