/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import {
  GEO_HEADER_NAMES,
  buildClientLocationHeaders,
  withClientLocationHeaders,
} from '../../worker/geoHeaders.mjs';

describe('buildClientLocationHeaders', () => {
  it('maps the Cloudflare cf object onto cf-ip headers', () => {
    expect(
      buildClientLocationHeaders({
        latitude: '30.27130',
        longitude: '-97.74260',
        city: 'Austin',
        country: 'US',
      }),
    ).toEqual({
      'cf-ip-latitude': '30.27130',
      'cf-ip-longitude': '-97.74260',
      'cf-ip-city': 'Austin',
      'cf-ip-country': 'US',
    });
  });

  it('omits fields Cloudflare could not resolve', () => {
    expect(
      buildClientLocationHeaders({
        latitude: '30.27',
        longitude: '-97.74',
        city: null,
        country: undefined,
      }),
    ).toEqual({ 'cf-ip-latitude': '30.27', 'cf-ip-longitude': '-97.74' });
  });

  it('omits empty-string values', () => {
    expect(
      buildClientLocationHeaders({
        latitude: '30.27',
        longitude: '-97.74',
        city: '',
        country: 'US',
      }),
    ).toEqual({ 'cf-ip-latitude': '30.27', 'cf-ip-longitude': '-97.74', 'cf-ip-country': 'US' });
  });

  it("forwards the region code so the server can fall back to the visitor's state", () => {
    expect(buildClientLocationHeaders({ country: 'US', regionCode: 'GA' })).toEqual({
      'cf-ip-country': 'US',
      'cf-region-code': 'GA',
    });
  });

  it('returns nothing when the cf object is absent', () => {
    expect(buildClientLocationHeaders(undefined)).toEqual({});
    expect(buildClientLocationHeaders(null)).toEqual({});
  });
});

describe('withClientLocationHeaders', () => {
  it('stamps cf-ip headers and keeps the rest of the request intact', () => {
    const request = new Request('https://www.truckfull.food/api/geo/ip-location', {
      headers: { 'user-agent': 'jest' },
    });

    const forwarded = withClientLocationHeaders(request, {
      latitude: '30.27',
      longitude: '-97.74',
      city: 'Austin',
      country: 'US',
    });

    expect(forwarded.headers.get('cf-ip-latitude')).toBe('30.27');
    expect(forwarded.headers.get('cf-ip-longitude')).toBe('-97.74');
    expect(forwarded.headers.get('cf-ip-city')).toBe('Austin');
    expect(forwarded.headers.get('cf-ip-country')).toBe('US');
    expect(forwarded.headers.get('user-agent')).toBe('jest');
    expect(forwarded.url).toBe('https://www.truckfull.food/api/geo/ip-location');
  });

  it('overwrites cf-ip headers a client tried to spoof', () => {
    const request = new Request('https://www.truckfull.food/api/geo/ip-location', {
      headers: { 'cf-ip-latitude': '0', 'cf-ip-city': 'Spoofville' },
    });

    const forwarded = withClientLocationHeaders(request, {
      latitude: '30.27',
      longitude: '-97.74',
    });

    expect(forwarded.headers.get('cf-ip-latitude')).toBe('30.27');
    expect(forwarded.headers.get('cf-ip-city')).toBeNull();
  });

  it('strips spoofed geolocation even when Cloudflare supplies none', () => {
    const request = new Request('https://www.truckfull.food/api/geo/ip-location', {
      headers: {
        'cf-ip-latitude': '12.0',
        'cf-ip-longitude': '34.0',
        'cf-ip-city': 'Fake',
        'cf-region-code': 'ZZ',
      },
    });

    const forwarded = withClientLocationHeaders(request, undefined);

    for (const name of GEO_HEADER_NAMES) {
      expect(forwarded.headers.get(name)).toBeNull();
    }
  });

  it('preserves the method on a reconstructed request', () => {
    const request = new Request('https://www.truckfull.food/api/widgets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
    });

    const forwarded = withClientLocationHeaders(request, {
      latitude: '30.27',
      longitude: '-97.74',
    });

    expect(forwarded.method).toBe('POST');
    expect(forwarded.headers.get('content-type')).toBe('application/json');
  });

  // Jest's Web Fetch polyfill drops the body on `new Request(request, ...)`;
  // workerd preserves it (verified against `wrangler dev --local`).
  it.skip('preserves the request body (workerd-only)', async () => {
    const request = new Request('https://www.truckfull.food/api/widgets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
    });

    const forwarded = withClientLocationHeaders(request, {
      latitude: '30.27',
      longitude: '-97.74',
    });

    await expect(forwarded.json()).resolves.toEqual({ a: 1 });
  });
});
