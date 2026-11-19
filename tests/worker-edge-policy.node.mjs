import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isAnonymousStaticAsset,
  staticAssetCacheControl,
  withTrustedClientIp,
} from '../worker/edgePolicy.mjs';

test('forwarding preserves request bodies and application authentication', async () => {
  const request = new Request('https://staging.test/api/example', {
    method: 'POST',
    body: JSON.stringify({ value: 'test-only-value' }),
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-only-token',
      cookie: 'session=test-only-value',
      'cf-connecting-ip': '192.0.2.10',
      'x-forwarded-for': '198.51.100.123',
      'x-truckfull-staging-token': 'test-only-access-token',
    },
  });
  const forwarded = withTrustedClientIp(request);
  assert.equal(forwarded.headers.get('authorization'), 'Bearer test-only-token');
  assert.equal(forwarded.headers.get('cookie'), 'session=test-only-value');
  assert.equal(forwarded.headers.get('content-type'), 'application/json');
  assert.equal(forwarded.headers.get('x-forwarded-for'), '192.0.2.10');
  assert.equal(forwarded.headers.has('x-truckfull-staging-token'), false);
  assert.deepEqual(await forwarded.json(), { value: 'test-only-value' });
});

test('range and Next negotiation headers cannot enter the cached entrypoint', () => {
  for (const header of [
    'range',
    'rsc',
    'next-router-state-tree',
    'next-router-prefetch',
    'next-router-segment-prefetch',
    'upgrade',
  ]) {
    const request = new Request('https://staging.test/_next/static/chunks/a.js', {
      headers: { [header]: header === 'range' ? 'bytes=0-9' : 'test' },
    });
    assert.equal(isAnonymousStaticAsset(request), false);
    assert.equal(staticAssetCacheControl(request, new Response('asset')), 'no-store');
  }
});

test('a missing trusted address cannot leave client-supplied IP headers intact', () => {
  const forwarded = withTrustedClientIp(
    new Request('https://staging.test/api/example', {
      headers: {
        'x-forwarded-for': '198.51.100.123',
        'x-real-ip': '198.51.100.124',
        'x-vercel-forwarded-for': '198.51.100.125',
      },
    }),
  );
  assert.equal(forwarded.headers.has('x-forwarded-for'), false);
  assert.equal(forwarded.headers.has('x-real-ip'), false);
  assert.equal(forwarded.headers.has('x-vercel-forwarded-for'), false);
});
