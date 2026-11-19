import { describe, it, expect } from '@jest/globals';
import {
  getSourceDisplay,
  getSourceCategory,
  SOURCE_FILTER_OPTIONS,
} from '@/lib/events/sourceDisplay';

describe('sourceDisplay', () => {
  describe('getSourceDisplay', () => {
    it('returns official display for eproval source', () => {
      const result = getSourceDisplay('savannah_eproval', 'eproval');
      expect(result).toEqual({
        label: 'Savannah',
        icon: '🏛️',
        category: 'official',
        city: 'Savannah',
      });
    });

    it('returns platform display for eventbrite source', () => {
      const result = getSourceDisplay('charleston_eventbrite', 'eventbrite');
      expect(result).toEqual({
        label: 'Charleston',
        icon: '🎫',
        category: 'platform',
        city: 'Charleston',
      });
    });

    it('returns community display for algolia source', () => {
      const result = getSourceDisplay('macon_algolia', 'algolia_api');
      expect(result).toEqual({
        label: 'Web Listing',
        icon: '🔍',
        category: 'community',
        city: 'Macon',
      });
    });

    it('extracts city correctly from compound source with cvb suffix', () => {
      const result = getSourceDisplay('greenville_sc_cvb', 'simpleview_rss');
      expect(result.category).toBe('official');
      expect(result.city).toBe('Greenville Sc');
    });

    it('returns Platform fallback for null source', () => {
      const result = getSourceDisplay(null, null);
      expect(result).toEqual({ label: 'Platform', icon: '📍', category: 'official', city: '' });
    });

    it('returns Augusta GA with state abbreviation for eventbrite', () => {
      const result = getSourceDisplay('augusta_ga_eventbrite', 'eventbrite');
      expect(result.city).toBe('Augusta GA');
    });
  });

  describe('getSourceCategory', () => {
    it('returns official for eproval', () => {
      expect(getSourceCategory('eproval')).toBe('official');
    });

    it('returns platform for eventbrite', () => {
      expect(getSourceCategory('eventbrite')).toBe('platform');
    });

    it('returns community for algolia_api', () => {
      expect(getSourceCategory('algolia_api')).toBe('community');
    });
  });

  describe('SOURCE_FILTER_OPTIONS', () => {
    it('has 4 entries with correct values', () => {
      expect(SOURCE_FILTER_OPTIONS).toHaveLength(4);
      expect(SOURCE_FILTER_OPTIONS.map((o) => o.value)).toEqual([
        'all',
        'official',
        'platform',
        'community',
      ]);
    });
  });
});
