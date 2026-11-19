import { describe, it, expect } from '@jest/globals';
import { getSourceTypeLabel } from '@/components/map/sourceUtils';

describe('sourceFilter', () => {
  describe('source filter logic', () => {
    const filterBySource = (
      events: Array<Record<string, unknown>>,
      sourceFilter: 'all' | 'platform' | 'external',
    ) => {
      if (sourceFilter === 'all') return events;
      const isExternal = sourceFilter === 'external';
      return events.filter((e) => {
        const hasExternalSource = 'event_source' in e && e.event_source === 'external';
        return isExternal ? hasExternalSource : !hasExternalSource;
      });
    };

    it('filter "all" shows all events', () => {
      const events = [
        { id: '1', source: 'eproval' },
        { id: '2', source: 'platform' },
        { id: '3', source: 'eventbrite' },
      ];
      const result = filterBySource(events, 'all');
      expect(result).toHaveLength(3);
    });

    it('filter "external" shows only events with event_source === "external"', () => {
      const events = [
        { id: '1', source: 'eproval', event_source: 'external' },
        { id: '2', source: 'platform' },
        { id: '3', source: 'eventbrite', event_source: 'external' },
        { id: '4', source: 'simpleview_rss', event_source: 'external' },
      ];
      const result = filterBySource(events, 'external');
      expect(result).toHaveLength(3);
      expect(result.every((e) => e.event_source === 'external')).toBe(true);
    });

    it('filter "platform" shows only events WITHOUT event_source', () => {
      const events = [
        { id: '1', source: 'eproval', event_source: 'external' },
        { id: '2', source: 'platform' },
        { id: '3', source: 'eventbrite', event_source: 'external' },
        { id: '4', source: 'platform' },
      ];
      const result = filterBySource(events, 'platform');
      expect(result).toHaveLength(2);
      expect(result.every((e) => e.event_source !== 'external')).toBe(true);
    });
  });

  describe('getSourceTypeLabel', () => {
    it('returns correct labels for all known sources', () => {
      const testCases: [string, string][] = [
        ['savannah_eproval', 'City Permit'],
        ['augusta_civicplus', 'City Calendar'],
        ['columbia_county_civicplus', 'City Calendar'],
        ['spartanburg_civicplus', 'City Calendar'],
        ['charleston_civicplus', 'City Calendar'],
        ['augusta_cvb', 'CVB Calendar'],
        ['columbia_sc_cvb', 'CVB Calendar'],
        ['greenville_sc_cvb', 'CVB Calendar'],
        ['aiken_playwright', 'City Calendar'],
        ['waynesboro_ical', 'City Calendar'],
        ['eventbrite', 'Eventbrite'],
        ['simpleview_rss', 'CVB Calendar'],
        ['algolia_api', 'Tourism Board'],
        ['timely_api', 'Tourism Board'],
        ['tourism_html', 'Tourism Board'],
        ['ical', 'City Calendar'],
        ['civicplus_rss', 'City Calendar'],
        ['eproval', 'City Permit'],
      ];

      for (const [source, expectedLabel] of testCases) {
        expect(getSourceTypeLabel(source)).toBe(expectedLabel);
      }
    });

    it('returns raw sourceType for unknown sources', () => {
      expect(getSourceTypeLabel('unknown_source')).toBe('unknown_source');
      expect(getSourceTypeLabel('random_source')).toBe('random_source');
    });

    it('returns "Unknown" for undefined sourceType', () => {
      expect(getSourceTypeLabel(undefined)).toBe('Unknown');
    });
  });
});
