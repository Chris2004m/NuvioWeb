import { test } from "node:test";
import assert from "node:assert/strict";

import {
  STEP_SHORT_MS,
  STEP_MEDIUM_MS,
  STEP_LONG_MS,
  STEP_VERY_LONG_MS,
  stepMsForKeyRepeat,
  deltaMsForKeyRepeat
} from "./playerScrubRates.js";

test("step ramps with hold", () => {
  assert.equal(stepMsForKeyRepeat(0), STEP_SHORT_MS);
  assert.equal(stepMsForKeyRepeat(2), STEP_SHORT_MS);
  assert.equal(stepMsForKeyRepeat(3), STEP_MEDIUM_MS);
  assert.equal(stepMsForKeyRepeat(7), STEP_MEDIUM_MS);
  assert.equal(stepMsForKeyRepeat(8), STEP_LONG_MS);
  assert.equal(stepMsForKeyRepeat(14), STEP_LONG_MS);
  assert.equal(stepMsForKeyRepeat(15), STEP_VERY_LONG_MS);
  assert.equal(stepMsForKeyRepeat(100), STEP_VERY_LONG_MS);
});

test("delta applies direction", () => {
  assert.equal(deltaMsForKeyRepeat(0, false), -STEP_SHORT_MS);
  assert.equal(deltaMsForKeyRepeat(8, true), STEP_LONG_MS);
});

test("step clamps a negative repeat count", () => {
  assert.equal(stepMsForKeyRepeat(-1), STEP_SHORT_MS);
});
