import { describe, expect, it } from '@jest/globals';

import { getStaleFacebookPageIds } from '@/lib/facebook/pageSync';

describe('getStaleFacebookPageIds', () => {
  it('returns only active pages that were not resynced', () => {
    expect(getStaleFacebookPageIds(['page-1', 'page-2', 'page-3'], ['page-2', 'page-4'])).toEqual([
      'page-1',
      'page-3',
    ]);
  });

  it('returns all active pages as stale when Facebook returned no pages', () => {
    expect(getStaleFacebookPageIds(['page-1', 'page-2'], [])).toEqual(['page-1', 'page-2']);
  });

  it('returns an empty list when there are no active pages to deactivate', () => {
    expect(getStaleFacebookPageIds([], ['page-1', 'page-2'])).toEqual([]);
  });

  it('returns an empty list when all active pages were resynced', () => {
    expect(getStaleFacebookPageIds(['page-1', 'page-2'], ['page-2', 'page-1'])).toEqual([]);
  });
});
