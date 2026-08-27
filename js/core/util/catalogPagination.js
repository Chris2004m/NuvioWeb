/**
 * Merges a freshly fetched catalog page into the items already shown and
 * computes the next skip offset for pagination.
 *
 * The next skip must advance by the number of items the addon actually
 * returned, the way the Android app does in CatalogRow.mergeCatalogPage. The
 * see all screen used to advance by a fixed 100, so a catalog whose addon
 * returns a smaller page (many TMDB backed addons return about 20 items per
 * page) had the see all view jump past everything between the real page size
 * and 100, and those items never appeared. Advancing by the returned count
 * keeps every item reachable. Duplicate ids are dropped so a repeated item is
 * never shown twice, while the skip still advances past the whole returned
 * page so the next request asks for fresh items.
 *
 * `displayItems` are the items to append (already filtered for display when
 * needed) and `returnedCount` is the raw number of items the addon returned,
 * which drives the skip so filtering never shrinks the step.
 */

export function mergeCatalogPage(existingItems, displayItems, currentSkip, returnedCount) {
  const items = Array.isArray(existingItems) ? [...existingItems] : [];
  const seen = new Set(items.map((item) => item?.id).filter(Boolean));
  const incoming = Array.isArray(displayItems) ? displayItems : [];
  let addedCount = 0;
  incoming.forEach((item) => {
    if (!item?.id || seen.has(item.id)) {
      return;
    }
    seen.add(item.id);
    items.push(item);
    addedCount += 1;
  });
  const raw = Number.isFinite(returnedCount) ? returnedCount : incoming.length;
  const nextSkip = Math.max(0, Number(currentSkip) || 0) + Math.max(0, raw);
  return { items, addedCount, nextSkip, hasMore: raw > 0 };
}
