import assert from "node:assert/strict";
import test from "node:test";

import { PlayerController } from "./playerController.js";
import { Platform } from "../../platform/index.js";

function resetController() {
  PlayerController.video = null;
  PlayerController.playbackEngine = "none";
  PlayerController.avplayActive = false;
  PlayerController.nativeMediaId = "";
  PlayerController.desiredPlaybackRate = 1;
  PlayerController.appliedAvPlayPlaybackRate = 1;
  PlayerController.appliedWebOsPlaybackRate = 1;
  PlayerController.webOsPlaybackRateRequestToken = 0;
  PlayerController.webOsPlaybackRateReapplyPromise = null;
}

test("webOS playback rate uses Luna without writing HTMLMediaElement.playbackRate", async () => {
  const originalPlatform = Platform.current;
  const originalWebOs = globalThis.webOS;
  let playbackRateWrites = 0;
  const commands = [];

  try {
    Platform.current = { name: "webos" };
    globalThis.webOS = {
      service: {
        request(service, options) {
          commands.push({ service, method: options.method, parameters: options.parameters });
          options.onSuccess({ returnValue: true });
        }
      }
    };
    resetController();
    PlayerController.video = {
      mediaId: "media-1",
      get playbackRate() {
        return 1;
      },
      set playbackRate(_value) {
        playbackRateWrites += 1;
      }
    };
    PlayerController.playbackEngine = "native-file";

    assert.equal(await PlayerController.setPlaybackRate(1.5), true);
    assert.equal(PlayerController.getPlaybackRate(), 1.5);
    assert.equal(playbackRateWrites, 0);
    assert.deepEqual(commands.at(-1), {
      service: "luna://com.webos.media",
      method: "setPlayRate",
      parameters: { mediaId: "media-1", playRate: 1.5, audioOutput: true }
    });

    assert.equal(await PlayerController.reapplyWebOsPlaybackRate(), true);
    assert.equal(commands.at(-1).parameters.playRate, 1.5);
  } finally {
    resetController();
    Platform.current = originalPlatform;
    globalThis.webOS = originalWebOs;
  }
});

test("webOS waits for a delayed Luna playback-rate response", async (t) => {
  const originalPlatform = Platform.current;
  const originalWebOs = globalThis.webOS;

  try {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    Platform.current = { name: "webos" };
    globalThis.webOS = {
      service: {
        request(_service, options) {
          setTimeout(() => options.onSuccess({ returnValue: true }), 4000);
        }
      }
    };
    resetController();
    PlayerController.video = { mediaId: "media-delayed", playbackRate: 1 };
    PlayerController.playbackEngine = "native-file";

    let settledResult;
    const ratePromise = PlayerController.setPlaybackRate(1.5).then((result) => {
      settledResult = result;
      return result;
    });

    t.mock.timers.tick(3001);
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(settledResult, undefined);
    assert.equal(PlayerController.getPlaybackRate(), 1);

    t.mock.timers.tick(999);
    assert.equal(await ratePromise, true);
    assert.equal(PlayerController.getPlaybackRate(), 1.5);
  } finally {
    resetController();
    Platform.current = originalPlatform;
    globalThis.webOS = originalWebOs;
  }
});

test("webOS ignores a pending playback-rate result after a source reset", async () => {
  const originalPlatform = Platform.current;
  const originalWebOs = globalThis.webOS;
  let resolveRequest;

  try {
    Platform.current = { name: "webos" };
    globalThis.webOS = {
      service: {
        request(_service, options) {
          resolveRequest = () => options.onSuccess({ returnValue: true });
        }
      }
    };
    resetController();
    PlayerController.video = { mediaId: "media-old", playbackRate: 1 };
    PlayerController.playbackEngine = "native-file";

    const ratePromise = PlayerController.setPlaybackRate(1.5);
    await Promise.resolve();
    PlayerController.resetNativeMediaState();
    PlayerController.video.mediaId = "media-new";
    resolveRequest();

    assert.equal(await ratePromise, false);
    assert.equal(PlayerController.getPlaybackRate(), 1);
    assert.equal(PlayerController.appliedWebOsPlaybackRate, 1);
  } finally {
    resetController();
    Platform.current = originalPlatform;
    globalThis.webOS = originalWebOs;
  }
});

test("webOS MSE playback does not expose unsupported speed choices", async () => {
  const originalPlatform = Platform.current;

  try {
    Platform.current = { name: "webos" };
    resetController();
    PlayerController.video = { playbackRate: 1 };
    PlayerController.playbackEngine = "dash.js";

    assert.deepEqual(PlayerController.getSupportedPlaybackRates(), [1]);
    assert.equal(await PlayerController.setPlaybackRate(1.25), false);
    assert.equal(PlayerController.getPlaybackRate(), 1);
  } finally {
    resetController();
    Platform.current = originalPlatform;
  }
});

test("Tizen AVPlay behavior remains isolated from the webOS workaround", async () => {
  const originalPlatform = Platform.current;
  const originalWebApis = globalThis.webapis;
  let playbackRateWrites = 0;
  let avplaySpeedCalls = 0;

  try {
    Platform.current = { name: "tizen" };
    globalThis.webapis = {
      avplay: {
        open() {},
        getState() {
          return "PLAYING";
        },
        setSpeed() {
          avplaySpeedCalls += 1;
        }
      }
    };
    resetController();
    PlayerController.video = {
      get playbackRate() {
        return 1;
      },
      set playbackRate(_value) {
        playbackRateWrites += 1;
      }
    };
    PlayerController.playbackEngine = "tizen-avplay";
    PlayerController.avplayActive = true;

    assert.deepEqual(PlayerController.getSupportedPlaybackRates(), [1]);
    assert.equal(await PlayerController.setPlaybackRate(1.25), false);
    assert.equal(await PlayerController.setPlaybackRate(1), true);
    assert.equal(playbackRateWrites, 0);
    assert.equal(avplaySpeedCalls, 0);
  } finally {
    resetController();
    Platform.current = originalPlatform;
    globalThis.webapis = originalWebApis;
  }
});
