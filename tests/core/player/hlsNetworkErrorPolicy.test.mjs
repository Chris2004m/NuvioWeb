import assert from "node:assert/strict";
import { test } from "node:test";
import { isRecoverableHlsFragmentTimeout } from "../../../js/core/player/hlsNetworkErrorPolicy.js";

test("recognizes a non-fatal HLS fragment timeout without an HTTP or media error", () => {
  assert.equal(
    isRecoverableHlsFragmentTimeout({
      fatal: false,
      type: "networkError",
      details: "fragLoadTimeOut",
      responseCode: null,
      mediaErrorCode: null
    }),
    true
  );
});

test("does not classify fatal or HTTP-backed HLS failures as transient", () => {
  assert.equal(
    isRecoverableHlsFragmentTimeout({
      fatal: true,
      type: "networkError",
      details: "fragLoadTimeOut"
    }),
    false
  );
  assert.equal(
    isRecoverableHlsFragmentTimeout({
      fatal: false,
      type: "networkError",
      details: "fragLoadTimeOut",
      responseCode: 503
    }),
    false
  );
});

test("does not classify other HLS errors or media failures as transient", () => {
  assert.equal(
    isRecoverableHlsFragmentTimeout({
      fatal: false,
      type: "networkError",
      details: "levelLoadError"
    }),
    false
  );
  assert.equal(
    isRecoverableHlsFragmentTimeout({
      fatal: false,
      type: "networkError",
      details: "fragLoadTimeOut",
      mediaErrorCode: 3
    }),
    false
  );
});
