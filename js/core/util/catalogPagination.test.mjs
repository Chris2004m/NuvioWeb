import test from "node:test";
import assert from "node:assert/strict";
import { mergeCatalogPage } from "./catalogPagination.js";

const items = (ids) => ids.map((id) => ({ id }));
const ids = (start, end) => Array.from({ length: end - start }, (_, i) => `x${start + i}`);

test("advances by the returned item count and keeps every item", () => {
  const existing = items(ids(0, 11));
  const incoming = items(ids(11, 28));
  const merged = mergeCatalogPage(existing, incoming, 11);
  assert.equal(merged.items.length, 28);
  assert.equal(merged.addedCount, 17);
  assert.equal(merged.nextSkip, 28);
  assert.equal(merged.hasMore, true);
});

test("a duplicate page adds nothing but still advances past it", () => {
  const existing = items(ids(0, 45));
  const duplicate = items(ids(27, 45));
  const merged = mergeCatalogPage(existing, duplicate, 45, 18);
  assert.equal(merged.items.length, 45);
  assert.equal(merged.addedCount, 0);
  assert.equal(merged.nextSkip, 63);
  assert.equal(merged.hasMore, true);
});

test("a small page advances by its real size, not a fixed 100", () => {
  const merged = mergeCatalogPage(items(ids(0, 20)), items(ids(20, 40)), 20);
  assert.equal(merged.nextSkip, 40);
  assert.equal(merged.items.length, 40);
});

test("returnedCount drives the skip even when display items were filtered out", () => {
  // Addon returned 20 items but only 5 survived the released filter.
  const merged = mergeCatalogPage(items(ids(0, 20)), items(ids(20, 25)), 20, 20);
  assert.equal(merged.nextSkip, 40);
  assert.equal(merged.items.length, 25);
});

test("an empty page stops pagination and leaves the skip in place", () => {
  const merged = mergeCatalogPage(items(ids(0, 20)), [], 20, 0);
  assert.equal(merged.items.length, 20);
  assert.equal(merged.nextSkip, 20);
  assert.equal(merged.hasMore, false);
});

test("items without an id are skipped but still counted in the skip", () => {
  const merged = mergeCatalogPage([{ id: "a" }], [{ id: null }, { id: "a" }, { id: "b" }], 1);
  assert.deepEqual(
    merged.items.map((item) => item.id),
    ["a", "b"]
  );
  assert.equal(merged.addedCount, 1);
  assert.equal(merged.nextSkip, 4);
});
