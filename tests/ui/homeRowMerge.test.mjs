import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeRefreshedHomeRows } from "../../js/ui/screens/home/homeRowMerge.js";

const row = (key, marker = "old") => ({ homeCatalogKey: key, marker });
const keys = (rows) => rows.map((entry) => entry.homeCatalogKey);

test("a cold load uses the fetched rows verbatim", () => {
  const existing = [row("a"), row("b")];
  const fetched = [row("a", "new")];
  assert.deepEqual(mergeRefreshedHomeRows(existing, fetched, null, { background: false }), fetched);
});

test("a background refresh keeps rows outside the initial batch", () => {
  const existing = [row("a"), row("b"), row("c")];
  const fetched = [row("a", "new")];
  const configured = new Set(["a", "b", "c"]);
  const merged = mergeRefreshedHomeRows(existing, fetched, configured, { background: true });
  assert.deepEqual(keys(merged).sort(), ["a", "b", "c"]);
  assert.equal(merged.find((entry) => entry.homeCatalogKey === "a").marker, "new");
});

test("freshly fetched rows replace the retained copy", () => {
  const merged = mergeRefreshedHomeRows([row("a", "old")], [row("a", "new")], new Set(["a"]), {
    background: true
  });
  assert.equal(merged.length, 1);
  assert.equal(merged[0].marker, "new");
});

test("a row whose catalog is no longer configured is dropped", () => {
  const existing = [row("a"), row("removed")];
  const merged = mergeRefreshedHomeRows(existing, [], new Set(["a"]), { background: true });
  assert.deepEqual(keys(merged), ["a"]);
});

test("collection and unkeyed rows are not treated as catalog rows", () => {
  const collectionRow = {
    rowKind: "collection",
    homeCatalogKey: "collection:one",
    marker: "collection"
  };
  const unkeyedRows = [{ marker: "first" }, { marker: "second" }];
  const merged = mergeRefreshedHomeRows(
    [collectionRow, ...unkeyedRows, row("a")],
    [],
    new Set(["a"]),
    { background: true }
  );
  assert.deepEqual(merged, [collectionRow, ...unkeyedRows, row("a")]);
});

test("tolerates missing inputs", () => {
  assert.deepEqual(mergeRefreshedHomeRows(null, null, null, { background: true }), []);
  assert.deepEqual(
    keys(mergeRefreshedHomeRows(undefined, [row("a")], null, { background: true })),
    ["a"]
  );
});
