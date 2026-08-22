import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Platform } from "../../js/platform/index.js";
import { TizenEngineFsService } from "../../js/platform/tizen/tizenEngineFsService.js";
import { resetTizenCapabilitiesCache } from "../../js/platform/tizen/tizenCapabilities.js";

const originalPlatformOverride = globalThis.__NUVIO_PLATFORM__;
const originalServiceId = globalThis.__NUVIO_TIZEN_ENGINEFS_SERVICE_ID__;
const originalTizen = globalThis.tizen;
const originalWrt = globalThis.wrt;
const originalWebapis = globalThis.webapis;
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const originalFetch = globalThis.fetch;

function installTizenRuntime() {
  globalThis.__NUVIO_PLATFORM__ = "tizen";
  globalThis.__NUVIO_TIZEN_ENGINEFS_SERVICE_ID__ = "NuvioTV001.EngineFsService";
  globalThis.tizen = {
    ApplicationControl: class ApplicationControl {
      constructor(operation) {
        this.operation = operation;
      }
    },
    application: {
      getCurrentApplication() {
        return { appInfo: { packageId: "NuvioTV001" } };
      },
      systeminfo: undefined,
      launchAppControl() {},
      launch() {}
    },
    systeminfo: {
      getCapability(name) {
        if (name === "http://tizen.org/feature/platform.version") {
          return "4.0";
        }
        if (name === "http://tizen.org/feature/web.service") {
          return true;
        }
        return false;
      }
    }
  };
  delete globalThis.wrt;
  delete globalThis.webapis;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { userAgent: "Mozilla/5.0 Tizen/4.0 Chrome/56.0" }
  });
  Platform.current = null;
  resetTizenCapabilitiesCache();
}

function installProbeFetch() {
  let probeCount = 0;
  globalThis.fetch = async () => {
    probeCount += 1;
    if (probeCount <= 4) {
      throw new Error("EngineFS is not running yet");
    }
    return {
      ok: true,
      clone() {
        return { json: async () => ({}) };
      }
    };
  };
}

function restoreGlobalValue(name, value) {
  if (typeof value === "undefined") {
    delete globalThis[name];
    return;
  }
  globalThis[name] = value;
}

afterEach(() => {
  if (typeof originalPlatformOverride === "undefined") {
    delete globalThis.__NUVIO_PLATFORM__;
  } else {
    globalThis.__NUVIO_PLATFORM__ = originalPlatformOverride;
  }
  if (typeof originalServiceId === "undefined") {
    delete globalThis.__NUVIO_TIZEN_ENGINEFS_SERVICE_ID__;
  } else {
    globalThis.__NUVIO_TIZEN_ENGINEFS_SERVICE_ID__ = originalServiceId;
  }
  restoreGlobalValue("tizen", originalTizen);
  restoreGlobalValue("wrt", originalWrt);
  restoreGlobalValue("webapis", originalWebapis);
  restoreGlobalValue("fetch", originalFetch);
  if (originalNavigatorDescriptor) {
    Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
  } else {
    delete globalThis.navigator;
  }
  Platform.current = null;
  resetTizenCapabilitiesCache();
});

test("Tizen EngineFS uses explicit launchAppControl with the default operation first", async () => {
  installTizenRuntime();
  installProbeFetch();

  const operations = [];
  let directLaunchCount = 0;
  globalThis.tizen.application.launchAppControl = (appControl, serviceId, onSuccess) => {
    operations.push({ operation: appControl.operation, serviceId });
    onSuccess();
  };
  globalThis.tizen.application.launch = () => {
    directLaunchCount += 1;
  };

  const result = await TizenEngineFsService.ensureStarted();

  assert.equal(result.status, "success");
  assert.equal(result.startMethod, "tizen-application-control-default");
  assert.deepEqual(operations, [
    {
      operation: "http://tizen.org/appcontrol/operation/default",
      serviceId: "NuvioTV001.EngineFsService"
    }
  ]);
  assert.equal(directLaunchCount, 0);
});

test("Tizen EngineFS falls back to direct official launch after app control fails", async () => {
  installTizenRuntime();
  installProbeFetch();

  const operations = [];
  globalThis.tizen.application.launchAppControl = (appControl, serviceId, onSuccess, onFailure) => {
    operations.push({ operation: appControl.operation, serviceId });
    onFailure(new Error("explicit app control rejected"));
  };
  globalThis.tizen.application.launch = (serviceId, onSuccess) => {
    assert.equal(serviceId, "NuvioTV001.EngineFsService");
    onSuccess();
  };

  const result = await TizenEngineFsService.ensureStarted();

  assert.equal(result.status, "success");
  assert.equal(result.startMethod, "tizen-application-launch");
  assert.deepEqual(operations, [
    {
      operation: "http://tizen.org/appcontrol/operation/default",
      serviceId: "NuvioTV001.EngineFsService"
    }
  ]);
});
