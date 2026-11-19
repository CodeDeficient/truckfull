import { describe, it, expect } from '@jest/globals';
import { getVisibleTabs, TAB_CONFIG } from '@/app/owner-dashboard/_components/EventsTab';
import type { TabConfig } from '@/app/owner-dashboard/_components/EventsTab';

describe('EventsTab - pure logic', () => {
  describe('TAB_CONFIG', () => {
    it('has 7 tabs defined', () => {
      expect(TAB_CONFIG).toHaveLength(7);
    });

    it('includes map, discover, applications, calendar, saved, quick-check, investigate', () => {
      const values = TAB_CONFIG.map((t) => t.value);
      expect(values).toEqual([
        'map',
        'discover',
        'applications',
        'calendar',
        'saved',
        'quick-check',
        'investigate',
      ]);
    });

    it('marks investigate as proOnly with spanTwo', () => {
      const investigate = TAB_CONFIG.find((t) => t.value === 'investigate') as TabConfig;
      expect(investigate.proOnly).toBe(true);
      expect(investigate.spanTwo).toBe(true);
    });

    it('labels discover tab as Discover on both desktop and mobile', () => {
      const discover = TAB_CONFIG.find((t) => t.value === 'discover') as TabConfig;
      expect(discover.label).toBe('Discover');
      expect(discover.mobileLabel).toBe('Discover');
    });

    it('has shortened mobile labels for long tabs', () => {
      const apps = TAB_CONFIG.find((t) => t.value === 'applications') as TabConfig;
      expect(apps.mobileLabel).toBe('Apps');
      expect(apps.label).toBe('My Applications');
    });
  });

  describe('getVisibleTabs', () => {
    it('returns 6 tabs for free tier (excludes investigate)', () => {
      const visible = getVisibleTabs('free');
      expect(visible).toHaveLength(6);
      expect(visible.map((t) => t.value)).not.toContain('investigate');
    });

    it('returns 7 tabs for pro tier (includes investigate)', () => {
      const visible = getVisibleTabs('pro');
      expect(visible).toHaveLength(7);
      expect(visible.map((t) => t.value)).toContain('investigate');
    });

    it('returns 6 tabs when no tier is provided (excludes investigate)', () => {
      const visible = getVisibleTabs();
      expect(visible).toHaveLength(6);
      expect(visible.map((t) => t.value)).not.toContain('investigate');
    });

    it('returns 6 tabs for undefined tier', () => {
      const visible = getVisibleTabs(undefined);
      expect(visible).toHaveLength(6);
    });

    it('preserves tab order', () => {
      const visible = getVisibleTabs('pro');
      const values = visible.map((t) => t.value);
      expect(values).toEqual([
        'map',
        'discover',
        'applications',
        'calendar',
        'saved',
        'quick-check',
        'investigate',
      ]);
    });

    it('investigate tab has spanTwo flag for pro tier', () => {
      const visible = getVisibleTabs('pro');
      const investigate = visible.find((t) => t.value === 'investigate') as TabConfig;
      expect(investigate.spanTwo).toBe(true);
    });
  });
});
