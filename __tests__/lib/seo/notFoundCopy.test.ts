import { describe, it, expect } from '@jest/globals';
import { getNotFoundCopy } from '@/lib/seo/notFoundCopy';

describe('getNotFoundCopy', () => {
  it('treats a single slug as a possibly removed truck and links to the map', () => {
    const copy = getNotFoundCopy('/the-snbar-truck');
    expect(copy.heading).toBe('We could not find this page');
    expect(copy.body).toContain('If you were looking for a food truck');
    expect(copy.primary.href).toBe('/');
    expect(copy.secondary?.href).toBe('/trucks');
  });

  it('treats an event detail path as an ended event', () => {
    const copy = getNotFoundCopy('/events/easley-sc/biscuit-beatdown-2026-10-17');
    expect(copy.heading).toBe('This event has ended or was removed');
    expect(copy.primary.href).toBe('/events');
    expect(copy.secondary?.href).toBe('/');
  });

  it('falls back to generic copy for other paths', () => {
    expect(getNotFoundCopy('/city/nowhere-zz').heading).toBe('Page not found');
    expect(getNotFoundCopy('/events/nowhere-zz').heading).toBe('Page not found');
    expect(getNotFoundCopy('/').heading).toBe('Page not found');
  });

  it('falls back to generic copy for odd single segments and a missing path', () => {
    expect(getNotFoundCopy('/wp-login.php').heading).toBe('Page not found');
    expect(getNotFoundCopy(null).heading).toBe('Page not found');
  });

  it('ignores a trailing slash', () => {
    expect(getNotFoundCopy('/the-snbar-truck/').primary.label).toBe('See trucks on the map');
  });
});
