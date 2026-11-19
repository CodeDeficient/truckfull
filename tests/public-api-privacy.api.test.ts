import { test, expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { API_ROUTE_ALLOWLIST, type ApiMethod } from '../lib/middleware/apiRouteAllowlist';

type SampleContext = {
  readonly truckId: string;
  readonly fromDate: string;
  readonly toDate: string;
};

type Sample = (request: APIRequestContext, context: SampleContext) => Promise<APIResponse>;

const CONTACT_KEY = /"[\w-]*(?:phone|e_?mail|telephone|fax)[\w-]*"\s*:/i;
const EMAIL_VALUE = /[\w.%+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/i;
const PHONE_VALUE = /(?:\+?1[\s.-])?(?:\(\d{3}\)\s?|\b\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/;

const json = (data: unknown): { data: unknown; headers: Record<string, string> } => ({
  data,
  headers: { 'content-type': 'application/json' },
});

const SAMPLES: Readonly<Record<string, Sample>> = {
  'GET /api/auth/validate-invite': (r) => r.get('/api/auth/validate-invite?token=not-a-token'),
  'GET /api/claim-your-truck/search': (r) => r.get('/api/claim-your-truck/search?q=taco'),
  'GET /api/events': (r) => r.get('/api/events'),
  'GET /api/featured-content': (r) => r.get('/api/featured-content?lat=34.0007&lng=-81.0348'),
  'GET /api/founding-members': (r) => r.get('/api/founding-members'),
  'GET /api/geo/ip-location': (r) => r.get('/api/geo/ip-location'),
  'GET /api/health': (r) => r.get('/api/health'),
  'GET /api/trucks': (r) => r.get('/api/trucks?lat=34.0007&lng=-81.0348'),
  'GET /api/trucks/[id]/menu': (r, c) => r.get(`/api/trucks/${c.truckId}/menu`),
  'GET /api/trucks/public': (r) => r.get('/api/trucks/public?limit=500'),
  'POST /api/trucks/current-schedules': (r, c) =>
    r.post(
      '/api/trucks/current-schedules',
      json({ truckIds: [c.truckId], fromDate: c.fromDate, toDate: c.toDate }),
    ),
  'POST /api/trucks/enrich-tiers': (r) =>
    r.post(
      '/api/trucks/enrich-tiers',
      json({ ownerIds: ['00000000-0000-4000-8000-000000000000'] }),
    ),
  'POST /api/trucks/nearby': (r) =>
    r.post('/api/trucks/nearby', json({ lat: 34.0007, lng: -81.0348, radius: 50 })),
};

const NOT_SAMPLED: Readonly<Record<string, string>> = {
  'GET /api/trucks/[id]': 'single truck, contact shown like its page',
  'GET /api/og/default': 'image response',
  'POST /api/analytics/track': 'write only',
  'POST /api/analytics/web-vitals': 'write only',
  'POST /api/auth/signup': 'creates an account',
  'POST /api/claim-your-truck/submit': 'creates a claim',
  'POST /api/events/waitlist': 'write only',
  'POST /api/trucks/[id]/view': 'write only',
};

const BULK_PAGES = ['/', '/city/columbia-sc', '/cuisine/mexican'] as const;

function publicMethodKeys(): string[] {
  return API_ROUTE_ALLOWLIST.flatMap((rule) =>
    (Object.entries(rule.methods) as [ApiMethod, string][])
      .filter(([, access]) => access === 'public')
      .map(([method]) => `${method} ${rule.path}`),
  ).sort();
}

function expectNoDirectContact(label: string, body: string): void {
  expect(body.match(CONTACT_KEY)?.[0], `${label} has a contact key`).toBeUndefined();
  expect(body.match(EMAIL_VALUE)?.[0], `${label} has an email`).toBeUndefined();
  expect(body.match(PHONE_VALUE)?.[0], `${label} has a phone number`).toBeUndefined();
}

function isoDate(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

let cachedContext: Promise<SampleContext> | undefined;

function sampleContext(request: APIRequestContext): Promise<SampleContext> {
  cachedContext ??= loadSampleContext(request);
  return cachedContext;
}

async function loadSampleContext(request: APIRequestContext): Promise<SampleContext> {
  const response = await request.get('/api/trucks/public?limit=1');
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { trucks?: { id: string }[] } | { id: string }[];
  const trucks = Array.isArray(body) ? body : (body.trucks ?? []);
  expect(trucks.length).toBeGreaterThan(0);
  return { truckId: trucks[0].id, fromDate: isoDate(0), toDate: isoDate(1) };
}

test('every public API method is either sampled or explicitly excused', () => {
  const classified = [...Object.keys(SAMPLES), ...Object.keys(NOT_SAMPLED)].sort();
  expect(classified).toEqual(publicMethodKeys());
});

test.describe('anonymous public API responses carry no phone or email', () => {
  for (const [key, sample] of Object.entries(SAMPLES)) {
    test(key, async ({ request }) => {
      const response = await sample(request, await sampleContext(request));
      expect(response.status()).toBeLessThan(500);
      expectNoDirectContact(key, await response.text());
    });
  }
});

test.describe('bulk pages carry no phone or email', () => {
  for (const path of BULK_PAGES) {
    test(path, async ({ request }) => {
      const response = await request.get(path, { timeout: 180_000 });
      expect(response.status()).toBe(200);
      const body = await response.text();
      expect(body.match(EMAIL_VALUE)?.[0], `${path} has an email`).toBeUndefined();
      expect(body.match(PHONE_VALUE)?.[0], `${path} has a phone number`).toBeUndefined();
    });
  }
});
