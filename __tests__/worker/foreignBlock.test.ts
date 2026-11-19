/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import {
  FOREIGN_DENIAL_MESSAGE,
  foreignDenial,
  isForeignRequest,
} from '../../worker/foreignBlock.mjs';

const at = (path: string): URL => new URL(`https://www.truckfull.food${path}`);

describe('isForeignRequest', () => {
  it('flags pages, page data, files, analytics, and internal routes from outside the US', () => {
    for (const path of [
      '/nards-food-truck',
      '/',
      '/trucks?_rsc=abc',
      '/data-api',
      '/_next/static/chunks/a.js',
      '/pwa-icon-512.png',
      '/ingest/i/v0/e/',
      '/api/geo/ip-location',
      '/api/trucks',
    ]) {
      expect(isForeignRequest({ country: 'BR' }, at(path))).toBe(true);
    }
    expect(isForeignRequest({ country: 'T1' }, at('/trucks'))).toBe(true);
  });

  it('leaves visitors from the US states alone', () => {
    expect(isForeignRequest({ country: 'US' }, at('/trucks'))).toBe(false);
  });

  it('refuses US territories, which have no listings', () => {
    for (const country of ['PR', 'GU', 'VI', 'AS', 'MP', 'UM']) {
      expect(isForeignRequest({ country }, at('/trucks'))).toBe(true);
    }
  });

  it('leaves verified crawlers and link previews alone wherever they come from', () => {
    expect(isForeignRequest({ country: 'IE', verifiedBotCategory: 'Search Engine Crawler' }, at('/trucks'))).toBe(false);
    expect(isForeignRequest({ country: 'DE', verifiedBotCategory: 'Page Preview' }, at('/'))).toBe(false);
  });

  it('keeps the same service endpoints open as the WAF rule', () => {
    for (const path of [
      '/api/webhooks/meta',
      '/api/stripe/webhook',
      '/api/cron/recover-stuck-posts',
      '/api/revalidate/event',
    ]) {
      expect(isForeignRequest({ country: 'IE' }, at(path))).toBe(false);
    }
    expect(isForeignRequest({ country: 'IE' }, at('/api/stripe/webhook-other'))).toBe(true);
  });

  it('allows the request when the country is unknown', () => {
    expect(isForeignRequest(undefined, at('/trucks'))).toBe(false);
    expect(isForeignRequest({}, at('/trucks'))).toBe(false);
  });
});

describe('foreignDenial', () => {
  it('answers a foreign request with an uncached plain 403', async () => {
    const denial = foreignDenial({ country: 'TR' }, at('/trucks'));
    expect(denial?.status).toBe(403);
    expect(denial?.headers.get('cache-control')).toBe('no-store');
    expect(denial?.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await denial?.text()).toBe(FOREIGN_DENIAL_MESSAGE);
  });

  it('returns nothing for requests that may continue', () => {
    expect(foreignDenial({ country: 'US' }, at('/trucks'))).toBeNull();
    expect(foreignDenial({ country: 'TR' }, at('/api/webhooks/meta'))).toBeNull();
  });
});
