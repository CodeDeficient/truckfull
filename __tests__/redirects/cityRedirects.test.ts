import { describe, expect, it } from '@jest/globals';
import {
  LEGACY_CITY_SLUGS,
  STATE_NAME_SUFFIXES,
  cityRedirects,
} from '@/redirects/city-redirects.mjs';

describe('city redirects', () => {
  it('maps full state names in city slugs to their abbreviations', () => {
    expect(cityRedirects).toContainEqual({
      source: '/city/:city([a-z0-9-]+)-south-carolina',
      destination: '/city/:city-sc',
      permanent: true,
    });
    expect(cityRedirects).toContainEqual({
      source: '/city/:city([a-z0-9-]+)-georgia',
      destination: '/city/:city-ga',
      permanent: true,
    });
  });

  it('redirects retired city slugs to their live city page', () => {
    expect(cityRedirects).toContainEqual({
      source: '/city/charleston-market-sc',
      destination: '/city/charleston-sc',
      permanent: true,
    });
  });

  it('emits one permanent redirect per state name and legacy slug', () => {
    expect(cityRedirects).toHaveLength(
      Object.keys(STATE_NAME_SUFFIXES).length + Object.keys(LEGACY_CITY_SLUGS).length,
    );
    expect(cityRedirects.every((redirect) => redirect.permanent)).toBe(true);
  });
});
