import test from "node:test";
import assert from "node:assert/strict";
import {
  getSyncBackoffRemainingMs,
  isMissingResourceError,
  isTransientSyncError,
  recordSyncFailure,
  resetSyncBackoff,
  SYNC_BACKOFF_CONSTANTS
} from "../js/core/sync/syncBackoffPolicy.js";
import { shouldTryProfileTableFallback } from "../js/core/profile/profileSyncService.js";

test.beforeEach(() => {
  resetSyncBackoff();
});

test.afterEach(() => {
  resetSyncBackoff();
});

test("classifies only missing resources as safe compatibility fallbacks", () => {
  assert.equal(isMissingResourceError({ status: 404 }), true);
  assert.equal(isMissingResourceError({ code: "PGRST202" }), true);
  assert.equal(isMissingResourceError({ status: 502 }), false);
  assert.equal(shouldTryProfileTableFallback({ status: 404 }), true);
  assert.equal(shouldTryProfileTableFallback({ code: "PGRST202" }), true);
  assert.equal(shouldTryProfileTableFallback({ status: 502 }), false);
  assert.equal(shouldTryProfileTableFallback({ status: 429 }), false);
});

test("backs off transient sync failures without multiplying concurrent failures", () => {
  const now = 1_000_000;
  assert.equal(isTransientSyncError({ status: 502 }), true);
  assert.equal(isTransientSyncError({ status: 504 }), true);
  assert.equal(isTransientSyncError({ status: 404 }), false);

  recordSyncFailure({ status: 502 }, now);
  assert.equal(getSyncBackoffRemainingMs(now), SYNC_BACKOFF_CONSTANTS.BASE_BACKOFF_MS);

  recordSyncFailure({ status: 429 }, now + 1_000);
  assert.equal(
    getSyncBackoffRemainingMs(now + 1_000),
    SYNC_BACKOFF_CONSTANTS.BASE_BACKOFF_MS - 1_000
  );

  recordSyncFailure({ status: 504 }, now + SYNC_BACKOFF_CONSTANTS.BASE_BACKOFF_MS);
  assert.equal(
    getSyncBackoffRemainingMs(now + SYNC_BACKOFF_CONSTANTS.BASE_BACKOFF_MS),
    SYNC_BACKOFF_CONSTANTS.BASE_BACKOFF_MS * 2
  );
});
