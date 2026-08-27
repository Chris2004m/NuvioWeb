import { test } from "node:test";
import assert from "node:assert/strict";

import { shouldMarkCompletedSeriesWatched } from "./simklCompletedSeries.js";

test("a completed series with no episode history gets a show level marker", () => {
  assert.equal(shouldMarkCompletedSeriesWatched("completed", false), true);
});

test("a completed series that already has episode history is not marked again", () => {
  assert.equal(shouldMarkCompletedSeriesWatched("completed", true), false);
});

test("a series that is not completed never gets a show level marker", () => {
  assert.equal(shouldMarkCompletedSeriesWatched("watching", false), false);
  assert.equal(shouldMarkCompletedSeriesWatched("watching", true), false);
  assert.equal(shouldMarkCompletedSeriesWatched("hold", false), false);
  assert.equal(shouldMarkCompletedSeriesWatched("dropped", false), false);
});
