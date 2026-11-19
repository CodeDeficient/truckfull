import { describe, expect, it } from '@jest/globals';
import { resolveRequestLocation } from '@/lib/location/requestGeo';

function headers(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe('resolveRequestLocation', () => {
  it('resolves Cloudflare cf-ip headers', () => {
    expect(
      resolveRequestLocation(
        headers({
          'cf-ip-latitude': '30.27130',
          'cf-ip-longitude': '-97.74260',
          'cf-ip-city': 'Austin',
          'cf-ip-country': 'US',
        }),
      ),
    ).toEqual({ lat: 30.2713, lng: -97.7426, city: 'Austin', country: 'US', source: 'cf-geo' });
  });

  it('still resolves Vercel x-vercel-ip headers', () => {
    expect(
      resolveRequestLocation(
        headers({
          'x-vercel-ip-latitude': '33.47',
          'x-vercel-ip-longitude': '-82.01',
          'x-vercel-ip-city': 'Augusta',
          'x-vercel-ip-country': 'US',
        }),
      ),
    ).toEqual({ lat: 33.47, lng: -82.01, city: 'Augusta', country: 'US', source: 'vercel-geo' });
  });

  it('prefers cf-ip headers when both are present', () => {
    const result = resolveRequestLocation(
      headers({
        'cf-ip-latitude': '30.27',
        'cf-ip-longitude': '-97.74',
        'x-vercel-ip-latitude': '33.47',
        'x-vercel-ip-longitude': '-82.01',
      }),
    );
    expect(result?.source).toBe('cf-geo');
    expect(result?.lat).toBe(30.27);
  });

  it('defaults city and country to Unknown when only coordinates are present', () => {
    expect(
      resolveRequestLocation(headers({ 'cf-ip-latitude': '30.27', 'cf-ip-longitude': '-97.74' })),
    ).toMatchObject({ city: 'Unknown', country: 'Unknown' });
  });

  it("falls back to the largest metro in the visitor's state without coordinates", () => {
    expect(
      resolveRequestLocation(headers({ 'cf-ip-country': 'US', 'cf-region-code': 'GA' })),
    ).toEqual({ lat: 33.749, lng: -84.388, city: 'Atlanta', country: 'US', source: 'cf-region' });
  });

  it('prefers coordinates over the state fallback', () => {
    expect(
      resolveRequestLocation(
        headers({
          'cf-ip-latitude': '30.27',
          'cf-ip-longitude': '-97.74',
          'cf-ip-country': 'US',
          'cf-region-code': 'GA',
        }),
      )?.source,
    ).toBe('cf-geo');
  });

  it('falls back to the state when coordinates are invalid', () => {
    expect(
      resolveRequestLocation(
        headers({
          'cf-ip-latitude': 'north',
          'cf-ip-longitude': '-97.74',
          'cf-ip-country': 'US',
          'cf-region-code': 'sc',
        }),
      ),
    ).toMatchObject({ city: 'Columbia', source: 'cf-region' });
  });

  it('ignores region codes outside the US or not in the table', () => {
    expect(
      resolveRequestLocation(headers({ 'cf-ip-country': 'CA', 'cf-region-code': 'ON' })),
    ).toBeNull();
    expect(
      resolveRequestLocation(headers({ 'cf-ip-country': 'US', 'cf-region-code': 'toString' })),
    ).toBeNull();
  });

  it('returns null when no geo headers exist', () => {
    expect(resolveRequestLocation(headers({ 'user-agent': 'jest' }))).toBeNull();
  });

  it('returns null for non-numeric coordinates', () => {
    expect(
      resolveRequestLocation(headers({ 'cf-ip-latitude': 'north', 'cf-ip-longitude': '-97.74' })),
    ).toBeNull();
  });

  it('rejects out-of-range coordinates', () => {
    expect(
      resolveRequestLocation(headers({ 'cf-ip-latitude': '95', 'cf-ip-longitude': '-97.74' })),
    ).toBeNull();
    expect(
      resolveRequestLocation(headers({ 'cf-ip-latitude': '30.27', 'cf-ip-longitude': '181' })),
    ).toBeNull();
  });

  it('requires both coordinates before accepting a source', () => {
    expect(resolveRequestLocation(headers({ 'cf-ip-latitude': '30.27' }))).toBeNull();
  });

  it('falls back to vercel headers when cf coordinates are invalid', () => {
    const result = resolveRequestLocation(
      headers({
        'cf-ip-latitude': '999',
        'cf-ip-longitude': '-97.74',
        'x-vercel-ip-latitude': '33.47',
        'x-vercel-ip-longitude': '-82.01',
      }),
    );
    expect(result?.source).toBe('vercel-geo');
    expect(result?.lat).toBe(33.47);
  });
});
