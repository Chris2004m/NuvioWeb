import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildStreamVirtualModel,
  findStreamVirtualIndex,
  getStreamScrollTopForIndex,
  getStreamVirtualWindow
} from "../../js/ui/screens/stream/streamVirtualizer.js";

test("builds variable-height offsets with a final row gap of zero", () => {
  const model = buildStreamVirtualModel(
    ["a", "b", "c"],
    new Map([
      ["a", 200],
      ["b", 260]
    ]),
    232,
    { rowGap: 18, lastRowGap: 0 }
  );

  assert.deepEqual(model.extents, [218, 278, 214]);
  assert.deepEqual(model.offsets, [0, 218, 496, 710]);
  assert.equal(model.totalExtent, 710);
});

test("finds the logical row at variable-height boundaries", () => {
  const model = buildStreamVirtualModel(
    ["a", "b", "c"],
    new Map([
      ["a", 200],
      ["b", 260],
      ["c", 214]
    ]),
    232,
    { rowGap: 18, lastRowGap: 0 }
  );

  assert.equal(findStreamVirtualIndex(model.offsets, 0), 0);
  assert.equal(findStreamVirtualIndex(model.offsets, 217), 0);
  assert.equal(findStreamVirtualIndex(model.offsets, 218), 1);
  assert.equal(findStreamVirtualIndex(model.offsets, 495), 1);
  assert.equal(findStreamVirtualIndex(model.offsets, 496), 2);
  assert.equal(findStreamVirtualIndex(model.offsets, 9999), 2);
});

test("keeps the mounted window bounded and preserves spacer geometry", () => {
  const model = buildStreamVirtualModel(
    Array.from({ length: 100 }, (_, index) => `stream-${index}`),
    null,
    232,
    { rowGap: 18, lastRowGap: 0 }
  );
  const window = getStreamVirtualWindow(model, {
    scrollTop: 5000,
    viewportHeight: 500,
    overscanPx: 300,
    minWindow: 20
  });

  assert.ok(window.start > 0);
  assert.ok(window.end < model.keys.length - 1);
  assert.ok(window.end - window.start + 1 >= 20);
  assert.equal(
    window.topSpacer +
      window.bottomSpacer +
      (model.offsets[window.end + 1] - model.offsets[window.start]),
    model.totalExtent
  );

  const preferredWindow = getStreamVirtualWindow(model, {
    scrollTop: 5000,
    viewportHeight: 500,
    overscanPx: 300,
    minWindow: 20,
    preferredIndex: 2
  });
  assert.ok(preferredWindow.start <= 2);
  assert.ok(preferredWindow.end >= 2);
});

test("scrolls only as much as needed to expose a logical row", () => {
  const model = buildStreamVirtualModel(
    ["a", "b", "c"],
    new Map([
      ["a", 200],
      ["b", 260],
      ["c", 214]
    ]),
    232,
    { rowGap: 18, lastRowGap: 0 }
  );

  assert.equal(
    getStreamScrollTopForIndex(model, 0, {
      currentScrollTop: 300,
      viewportHeight: 300,
      padding: 16
    }),
    0
  );
  assert.equal(
    getStreamScrollTopForIndex(model, 2, {
      currentScrollTop: 0,
      viewportHeight: 300,
      padding: 16
    }),
    426
  );
  assert.equal(
    getStreamScrollTopForIndex(model, 1, {
      currentScrollTop: 218,
      viewportHeight: 300,
      padding: 16
    }),
    202
  );
});
