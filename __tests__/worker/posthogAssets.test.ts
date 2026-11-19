/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { fetchPosthogAsset, posthogAssetUrl } from '../../worker/posthogAssets.mjs';

const SITE = 'https://www.truckfull.food';

describe('posthogAssetUrl', () => {
  it('maps relay script paths onto the PostHog asset host, keeping the version query', () => {
    const request = new Request(`${SITE}/ingest/static/exception-autocapture.js?v=1.387.0`);
    expect(posthogAssetUrl(request)).toBe(
      'https://us-assets.i.posthog.com/static/exception-autocapture.js?v=1.387.0',
    );
  });

  it('leaves event ingestion and other paths to the container', () => {
    expect(posthogAssetUrl(new Request(`${SITE}/ingest/i/v0/e/`))).toBeNull();
    expect(posthogAssetUrl(new Request(`${SITE}/ingest/flags/?v=2`))).toBeNull();
    expect(posthogAssetUrl(new Request(`${SITE}/static/array.js`))).toBeNull();
  });

  it('only relays reads', () => {
    const request = new Request(`${SITE}/ingest/static/array.js`, { method: 'POST', body: 'x' });
    expect(posthogAssetUrl(request)).toBeNull();
  });
});

describe('fetchPosthogAsset', () => {
  it('forwards only the method and accept header, never cookies', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch = (url: string, init: RequestInit): Promise<Response> => {
      calls.push({ url, init });
      return Promise.resolve(new Response('ok'));
    };
    const request = new Request(`${SITE}/ingest/static/array.js`, {
      headers: { accept: 'application/javascript', cookie: 'sb-access-token=secret' },
    });

    await fetchPosthogAsset(request, 'https://us-assets.i.posthog.com/static/array.js', fakeFetch);

    expect(calls).toEqual([
      {
        url: 'https://us-assets.i.posthog.com/static/array.js',
        init: { method: 'GET', headers: { accept: 'application/javascript' } },
      },
    ]);
  });
});
