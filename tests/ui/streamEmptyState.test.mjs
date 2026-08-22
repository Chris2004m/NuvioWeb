import assert from "node:assert/strict";
import { test } from "node:test";
import { isStreamEmptyStateVisible } from "../../js/ui/screens/stream/streamEmptyState.js";

test("does not show an empty state when All has streams", () => {
  assert.equal(
    isStreamEmptyStateVisible({
      filteredStreams: [{ id: "stream-1" }]
    }),
    false
  );
});

test("shows an empty state only for a completed empty filter", () => {
  assert.equal(
    isStreamEmptyStateVisible({
      filteredStreams: []
    }),
    true
  );
});

test("keeps the empty state hidden while sources are still loading", () => {
  assert.equal(
    isStreamEmptyStateVisible({
      filteredStreams: [],
      isLoading: true
    }),
    false
  );
  assert.equal(
    isStreamEmptyStateVisible({
      filteredStreams: [],
      hasPendingSourceLoads: true
    }),
    false
  );
});
