export function getStaleFacebookPageIds(
  existingActivePageIds: readonly string[],
  syncedPageIds: readonly string[],
): string[] {
  const syncedPageIdSet = new Set(syncedPageIds);
  return existingActivePageIds.filter((pageId) => !syncedPageIdSet.has(pageId));
}
