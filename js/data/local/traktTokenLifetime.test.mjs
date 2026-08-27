import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeTraktTokenLifetimeSeconds } from "./traktTokenLifetime.js";

test("legacy forced daily lifetime migrates to the documented lifetime", () => {
  assert.equal(normalizeTraktTokenLifetimeSeconds(86400), 604800);
});

test("returned token lifetime is preserved", () => {
  assert.equal(normalizeTraktTokenLifetimeSeconds(604800), 604800);
  assert.equal(normalizeTraktTokenLifetimeSeconds(3600), 3600);
  assert.equal(normalizeTraktTokenLifetimeSeconds(7776000), 7776000);
});

test("invalid token lifetime is preserved for immediate refresh", () => {
  assert.equal(normalizeTraktTokenLifetimeSeconds(0), 0);
  assert.equal(normalizeTraktTokenLifetimeSeconds(-1), -1);
});

test("numeric strings are accepted and non numbers fall back to zero", () => {
  assert.equal(normalizeTraktTokenLifetimeSeconds("86400"), 604800);
  assert.equal(normalizeTraktTokenLifetimeSeconds("604800"), 604800);
  assert.equal(normalizeTraktTokenLifetimeSeconds(undefined), 0);
  assert.equal(normalizeTraktTokenLifetimeSeconds("nope"), 0);
});
