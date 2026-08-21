import { test } from "node:test";
import assert from "node:assert/strict";

import {
  HOME_IMDB_RATINGS_VISIBILITY,
  normalizeHomeImdbRatingsVisibility,
  showHomeRatings,
  showStandardDetailRatings
} from "./imdbRatingVisibility.js";

test("overall visibility controls home and standard detail ratings", () => {
  assert.equal(showHomeRatings(HOME_IMDB_RATINGS_VISIBILITY.SHOW_ALL), true);
  assert.equal(showHomeRatings(HOME_IMDB_RATINGS_VISIBILITY.HIDE_ALL), false);

  assert.equal(showStandardDetailRatings(HOME_IMDB_RATINGS_VISIBILITY.SHOW_ALL, false), true);
  assert.equal(showStandardDetailRatings(HOME_IMDB_RATINGS_VISIBILITY.HIDE_ALL, false), false);
});

test("active mdblist takes priority over overall detail visibility", () => {
  assert.equal(showStandardDetailRatings(HOME_IMDB_RATINGS_VISIBILITY.SHOW_ALL, true), false);
  assert.equal(showStandardDetailRatings(HOME_IMDB_RATINGS_VISIBILITY.HIDE_ALL, true), false);
});

test("unknown or missing values fall back to showing ratings", () => {
  assert.equal(
    normalizeHomeImdbRatingsVisibility(undefined),
    HOME_IMDB_RATINGS_VISIBILITY.SHOW_ALL
  );
  assert.equal(
    normalizeHomeImdbRatingsVisibility("nonsense"),
    HOME_IMDB_RATINGS_VISIBILITY.SHOW_ALL
  );
  assert.equal(
    normalizeHomeImdbRatingsVisibility(HOME_IMDB_RATINGS_VISIBILITY.HIDE_ALL),
    HOME_IMDB_RATINGS_VISIBILITY.HIDE_ALL
  );
  assert.equal(showHomeRatings("nonsense"), true);
});
