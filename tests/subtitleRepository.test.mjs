import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSubtitleIdCandidates,
  selectCanonicalCinemetaId
} from "../js/data/repository/subtitleRepository.js";

test("selects a unique exact Cinemeta title, year, and type match", () => {
  const id = selectCanonicalCinemetaId(
    [
      { id: "tt39229633", name: "Liar Game", type: "series", releaseInfo: "2026-" },
      { id: "tt0978076", name: "Liar Game", type: "series", releaseInfo: "2007-2010" }
    ],
    { type: "series", title: "LIAR GAME", year: "2026" }
  );

  assert.equal(id, "tt39229633");
});

test("rejects ambiguous or yearless Cinemeta matches", () => {
  const duplicated = [
    { id: "tt11111111", name: "Example", type: "series", releaseInfo: "2026-" },
    { id: "tt22222222", name: "Example", type: "series", releaseInfo: "2026-" }
  ];

  assert.equal(
    selectCanonicalCinemetaId(duplicated, {
      type: "series",
      title: "Example",
      year: "2026"
    }),
    ""
  );
  assert.equal(
    selectCanonicalCinemetaId(duplicated, {
      type: "series",
      title: "Example",
      year: ""
    }),
    ""
  );
});

test("builds addon-compatible episode ids without replacing the source id globally", () => {
  const base = {
    type: "series",
    ids: ["tt39229633", "kitsu"],
    videoId: "kitsu:50108:15",
    season: 1,
    episode: 15
  };

  assert.deepEqual(
    buildSubtitleIdCandidates({ ...base, idPrefixes: ["tt"] }),
    ["tt39229633:1:15"]
  );
  assert.deepEqual(
    buildSubtitleIdCandidates({ ...base, idPrefixes: ["kitsu"] }),
    ["kitsu:50108:15"]
  );
});

test("preserves the series id fallback when no episode identity is available", () => {
  assert.deepEqual(
    buildSubtitleIdCandidates({
      type: "series",
      ids: ["tt39229633"],
      idPrefixes: ["tt"]
    }),
    ["tt39229633"]
  );
});
