import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getTizenCapabilities,
  TizenCapabilities
} from "../../js/platform/tizen/tizenCapabilities.js";

function makeRuntime({
  version = "5.0",
  chromium = 63,
  webService = true,
  engineFsServicePackaged,
  intersectionObserver = false,
  resizeObserver = false
} = {}) {
  const runtime = {
    navigator: {
      userAgent: `Mozilla/5.0 Tizen/${version} AppleWebKit/537.36 Chrome/${chromium}.0 Safari/537.36`
    },
    tizen: {
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
    },
    IntersectionObserver: intersectionObserver ? class {} : undefined,
    ResizeObserver: resizeObserver ? class {} : undefined,
    WebAssembly: undefined
  };
  if (engineFsServicePackaged !== undefined) {
    runtime.__NUVIO_TIZEN_ENGINEFS_SERVICE_ENABLED__ = engineFsServicePackaged;
  }
  return runtime;
}

test("Tizen 4 is recognized as a legacy runtime and P2P is disabled", () => {
  const capabilities = getTizenCapabilities(makeRuntime({ version: "4.0", chromium: 56 }));

  assert.equal(capabilities.isTizen, true);
  assert.equal(capabilities.tizenMajorVersion, 4);
  assert.equal(capabilities.chromiumMajorVersion, 56);
  assert.equal(capabilities.supportsP2p, false);
  assert.equal(capabilities.supportsTizenAvPlayDashAudioSwitching, false);
  assert.equal(capabilities.advancedSubtitleStylingLimited, true);
  assert.equal(capabilities.supportsWebService, true);
});

test("Tizen 5 keeps P2P and DASH AVPlay audio switching eligible", () => {
  const capabilities = getTizenCapabilities(
    makeRuntime({ version: "5.0", chromium: 63, webService: true })
  );

  assert.equal(capabilities.tizenMajorVersion, 5);
  assert.equal(capabilities.supportsP2p, true);
  assert.equal(capabilities.supportsTizenAvPlayDashAudioSwitching, true);
  assert.equal(
    TizenCapabilities.isDashAudioSwitchingUnsupported({
      dashManifest: true,
      usingAvPlay: true,
      runtime: makeRuntime({ version: "5.0", chromium: 63 })
    }),
    false
  );
});

test("explicitly unavailable web service disables P2P without disabling version detection", () => {
  const runtime = makeRuntime({ version: "5.0", chromium: 63, webService: false });
  const capabilities = getTizenCapabilities(runtime);

  assert.equal(capabilities.tizenMajorVersion, 5);
  assert.equal(capabilities.supportsWebService, false);
  assert.equal(capabilities.supportsP2p, false);
});

test("public-store builds disable EngineFS even on Tizen 5", () => {
  const runtime = makeRuntime({
    version: "5.0",
    chromium: 63,
    webService: true,
    engineFsServicePackaged: false
  });
  const capabilities = getTizenCapabilities(runtime);

  assert.equal(capabilities.engineFsServicePackaged, false);
  assert.equal(capabilities.supportsWebService, false);
  assert.equal(capabilities.supportsP2p, false);
});

test("unknown web service capability does not disable generic Tizen services", () => {
  const runtime = makeRuntime({ version: "4.0", chromium: 56 });
  runtime.tizen.systeminfo.getCapability = (name) => {
    if (name === "http://tizen.org/feature/platform.version") {
      return "4.0";
    }
    if (name === "http://tizen.org/feature/web.service") {
      return null;
    }
    return false;
  };

  const capabilities = getTizenCapabilities(runtime);

  assert.equal(capabilities.webServiceSupported, null);
  assert.equal(capabilities.supportsWebService, true);
  assert.equal(capabilities.supportsP2p, false);
});

test("runtime feature detection records IntersectionObserver and ResizeObserver independently", () => {
  const capabilities = getTizenCapabilities(
    makeRuntime({
      version: "5.0",
      chromium: 63,
      intersectionObserver: true,
      resizeObserver: false
    })
  );

  assert.equal(capabilities.hasIntersectionObserver, true);
  assert.equal(capabilities.hasResizeObserver, false);
  assert.equal(capabilities.advancedSubtitleStylingLimited, true);
});

test("unknown Tizen versions fail closed for P2P", () => {
  const runtime = {
    navigator: { userAgent: "Mozilla/5.0 Tizen TV" },
    tizen: { systeminfo: { getCapability: () => true } }
  };
  const capabilities = getTizenCapabilities(runtime);

  assert.equal(capabilities.isTizen, true);
  assert.equal(capabilities.tizenVersionKnown, false);
  assert.equal(capabilities.supportsP2p, false);
});
