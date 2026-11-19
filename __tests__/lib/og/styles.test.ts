import { describe, it, expect } from '@jest/globals';
import { buildOgStyles } from '@/lib/og/styles';
import { isAllowedTruckSlug } from '@/lib/utils/slugify';

const ALL_STYLE_KEYS = [
  'container',
  'glowCircle',
  'headerRow',
  'accentBar',
  'title',
  'location',
  'cuisineTag',
  'cuisineTagRow',
  'body',
  'footer',
  'footerSubtitle',
  'footerBrand',
  'brandText',
  'iconWrapper',
] as const;

describe('buildOgStyles', () => {
  it('returns an object with all required style keys', () => {
    const styles = buildOgStyles();
    for (const key of ALL_STYLE_KEYS) {
      expect(styles).toHaveProperty(key);
    }
  });

  it('never uses inline-block (Satori incompatible)', () => {
    const styles = buildOgStyles();
    const allValues = Object.values(styles).flatMap((s) => Object.values(s));
    const hasInlineBlock = allValues.some((v) => v === 'inline-block');
    expect(hasInlineBlock).toBe(false);
  });

  it('only uses Satori-supported display values', () => {
    const SATORI_DISPLAY = new Set(['flex', 'block', 'contents', 'none', '-webkit-box']);
    const styles = buildOgStyles();
    const allEntries = Object.values(styles).flatMap((s) => Object.entries(s));
    const displayValues = allEntries
      .filter(([key]) => key === 'display')
      .map(([, val]) => val);
    for (const val of displayValues) {
      expect(SATORI_DISPLAY).toContain(val);
    }
  });
});

describe('isAllowedTruckSlug (used by OG image route)', () => {
  it('rejects reserved slugs', () => {
    expect(isAllowedTruckSlug('admin')).toBe(false);
    expect(isAllowedTruckSlug('favicon.ico')).toBe(false);
    expect(isAllowedTruckSlug('robots.txt')).toBe(false);
  });

  it('rejects invalid slug format', () => {
    expect(isAllowedTruckSlug('')).toBe(false);
    expect(isAllowedTruckSlug('a')).toBe(false);
    expect(isAllowedTruckSlug('has spaces')).toBe(false);
  });

  it('accepts valid truck slugs', () => {
    expect(isAllowedTruckSlug('taco-bell')).toBe(true);
    expect(isAllowedTruckSlug('r7-industries-llc')).toBe(true);
  });
});
