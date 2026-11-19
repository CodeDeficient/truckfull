/**
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

jest.unstable_mockModule('@/lib/services/publicTruckPage', () => ({
  invalidatePublicTruckBySlug: jest.fn(),
  invalidatePublicTruckSearchCaches: jest.fn(),
}));

jest.unstable_mockModule('@/lib/auth/authHelpers', () => ({
  verifyRoleFromCookies: jest.fn(),
}));

jest.unstable_mockModule('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.unstable_mockModule('@/lib/supabase/admin', () => {
  const getSupabaseAdmin = jest.fn();
  return { getSupabaseAdmin, getSupabasePublicReader: getSupabaseAdmin };
});

jest.unstable_mockModule('@/lib/supabase/utils/server', () => ({
  createClient: jest.fn(),
}));

const handlePostTruckMock = jest.fn();

jest.unstable_mockModule('@/lib/api/trucks/handlers', () => ({
  handleGetTruckById: jest.fn(),
  handleGetTrucksByLocation: jest.fn(),
  handlePostTruck: handlePostTruckMock,
  handlePutTruck: jest.fn(),
  handleGetTruckByIdWithEvents: jest.fn(),
}));

jest.unstable_mockModule('@/lib/middleware/withAuth', () => ({
  withAuthValidation: jest.fn(
    (
      _schema: unknown,
      handler: (
        request: Request,
        params: unknown,
        user: { readonly id: string; readonly role: string },
        validatedData: unknown,
      ) => unknown,
    ) => async (request: Request) => {
      const validatedData = await request.json();
      return handler(request, undefined, { id: 'owner-1', role: 'food_truck_owner' }, validatedData);
    },
  ),
}));

jest.unstable_mockModule('@/lib/logging', () => ({
  logMessage: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
  logDebug: jest.fn(),
}));

jest.unstable_mockModule('@/lib/utils/geocoding', () => ({
  geocodeAddress: jest.fn(),
}));

jest.unstable_mockModule('@/lib/services/menuCategorizer', () => ({
  categorizeMenuItem: jest.fn(() => 'Other'),
}));

jest.unstable_mockModule('@/lib/services/postClassifier', () => ({
  classifyPost: jest.fn(),
}));

jest.unstable_mockModule('@/lib/services/postValidator', () => ({
  shouldUpdateData: jest.fn(),
}));

type MockInvalidate = jest.Mock<(...args: string[]) => void>;

function buildSupabaseMock(overrides: Record<string, unknown> = {}) {
  const defaultData = { slug: 'test-truck' };
  const data = { ...defaultData, ...overrides };
  const query = {
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error: null }),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error: null }),
  };
  query.select.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.insert.mockReturnValue(query);
  return {
    from: jest.fn().mockReturnValue(query),
  };
}

describe('app/api/trucks/[id]/route.ts PUT — invalidation boundary', () => {
  let invalidatePublicTruckBySlug: MockInvalidate;
  let verifyRoleFromCookies: jest.Mock;
  let createServerSupabaseClient: jest.Mock;
  let getSupabaseAdmin: jest.Mock;

  beforeAll(async () => {
    const mod = await import('@/lib/services/publicTruckPage');
    invalidatePublicTruckBySlug = mod.invalidatePublicTruckBySlug as unknown as MockInvalidate;
    verifyRoleFromCookies = (await import('@/lib/auth/authHelpers')).verifyRoleFromCookies as jest.Mock;
    createServerSupabaseClient = (await import('@/lib/supabase/server')).createServerSupabaseClient as jest.Mock;
    getSupabaseAdmin = (await import('@/lib/supabase/admin')).getSupabaseAdmin as jest.Mock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    verifyRoleFromCookies.mockResolvedValue({ ok: true, userId: 'owner-1', role: 'food_truck_owner' });
    createServerSupabaseClient.mockReturnValue(buildSupabaseMock({ owner_id: 'owner-1' }));
    getSupabaseAdmin.mockReturnValue(buildSupabaseMock({ slug: 'taco-mama' }));
  });

  it('invokes invalidatePublicTruckBySlug on successful owner update', async () => {
    const { PUT } = await import('@/app/api/trucks/[id]/route');

    const req = new Request('http://localhost/api/trucks/truck-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Updated description' }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: 'truck-1' }) });
    expect(res.status).toBe(200);
    expect(invalidatePublicTruckBySlug).toHaveBeenCalledWith('taco-mama');
  });

  it('invokes invalidatePublicTruckBySlug for both old and new slugs on slug change', async () => {
    getSupabaseAdmin
      .mockReturnValueOnce(buildSupabaseMock({ slug: 'taco-mama' }))
      .mockReturnValueOnce(buildSupabaseMock({ slug: 'new-slug' }));

    const { PUT } = await import('@/app/api/trucks/[id]/route');

    const req = new Request('http://localhost/api/trucks/truck-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'new-slug' }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: 'truck-1' }) });
    expect(res.status).toBe(200);
    expect(invalidatePublicTruckBySlug).toHaveBeenCalledWith('new-slug');
    expect(invalidatePublicTruckBySlug).toHaveBeenCalledWith('taco-mama');
  });

  it('does not invoke invalidatePublicTruckBySlug on failed update', async () => {
    getSupabaseAdmin.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          })),
        })),
      })),
    });
    const { PUT } = await import('@/app/api/trucks/[id]/route');

    const req = new Request('http://localhost/api/trucks/truck-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'fail-truck' }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: 'truck-1' }) });
    expect(invalidatePublicTruckBySlug).not.toHaveBeenCalled();
  });
});

describe('lib/services/truckUpdater.ts — invalidation boundary', () => {
  let invalidatePublicTruckBySlug: MockInvalidate;
  let getSupabaseAdmin: jest.Mock;

  beforeAll(async () => {
    const mod = await import('@/lib/services/publicTruckPage');
    invalidatePublicTruckBySlug = mod.invalidatePublicTruckBySlug as unknown as MockInvalidate;
    getSupabaseAdmin = (await import('@/lib/supabase/admin')).getSupabaseAdmin as jest.Mock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getSupabaseAdmin.mockReturnValue(buildSupabaseMock({ slug: 'test-truck' }));
  });

  it('does not invalidate for a menu-only update (menu automation disabled Pre-Meta)', async () => {
    const { updateTruckData } = await import('@/lib/services/truckUpdater');

    const result = await updateTruckData(
      'truck-1',
      { type: 'menu', confidence: 0.9 },
      { food_items: ['Tacos', 'Burritos'], confidence: 0.9 },
      { shouldUpdate: true, requiresConfirmation: false },
    );

    // Pre-Meta: menu-only Facebook evidence fails closed at the writer —
    // no mutation, therefore no cache invalidation.
    expect(result.success).toBe(false);
    expect(invalidatePublicTruckBySlug).not.toHaveBeenCalled();
  });

  it('fails closed for a mixed update whose fuzzy location cannot reach the schedule write', async () => {
    const { updateTruckData } = await import('@/lib/services/truckUpdater');

    const result = await updateTruckData(
      'truck-1',
      { type: 'mixed', confidence: 0.9 },
      {
        food_items: ['Tacos'],
        location: { address: 'Approximate downtown', fuzzy: true },
        confidence: 0.9,
      },
      { shouldUpdate: true, requiresConfirmation: true },
    );

    // Pre-Meta: the fuzzy location can never reach the permanent-location
    // writer; with no applicable schedule the update fails closed instead
    // of queueing a confirmation that could never apply.
    expect(result.success).toBe(false);
    expect(invalidatePublicTruckBySlug).not.toHaveBeenCalled();
  });

  it('invalidates after a successful recurring schedule write with an exact location', async () => {
    const { updateTruckData } = await import('@/lib/services/truckUpdater');

    const result = await updateTruckData(
      'truck-1',
      { type: 'mixed', confidence: 0.9 },
      {
        food_items: ['Tacos'],
        location: { address: '1201 Knox Ave, North Augusta, SC 29841', fuzzy: false },
        times: { start: '11:00', end: '14:00', days: ['monday'], scope: 'recurring_weekly' },
        confidence: 0.9,
      },
      { shouldUpdate: true, requiresConfirmation: false },
      undefined,
      { fbActionAt: '2026-08-01T10:00:00.000Z' },
    );

    expect(result.success).toBe(true);
    expect(invalidatePublicTruckBySlug).toHaveBeenCalledWith('test-truck');
  });

  it('does not invoke invalidatePublicTruckBySlug when no fields were updated', async () => {
    const { updateTruckData } = await import('@/lib/services/truckUpdater');

    const result = await updateTruckData(
      'truck-1',
      { type: 'menu', confidence: 0.9 },
      { food_items: [], confidence: 0 },
      { shouldUpdate: true, requiresConfirmation: false },
    );

    expect(result.success).toBe(false);
    expect(invalidatePublicTruckBySlug).not.toHaveBeenCalled();
  });
});

describe('app/api/trucks/route.ts POST — invalidation boundary', () => {
  let invalidatePublicTruckBySlug: MockInvalidate;

  beforeAll(async () => {
    const mod = await import('@/lib/services/publicTruckPage');
    invalidatePublicTruckBySlug = mod.invalidatePublicTruckBySlug as unknown as MockInvalidate;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    handlePostTruckMock.mockResolvedValue(
      Response.json({ truck: { slug: 'created-truck' } }, { status: 201 }),
    );
  });

  it('invalidates the created slug on successful generic truck creation', async () => {
    const { POST } = await import('@/app/api/trucks/route');

    const req = new Request('http://localhost/api/trucks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Created Truck', cuisine_type: ['Mexican'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(invalidatePublicTruckBySlug).toHaveBeenCalledWith('created-truck');
  });
});

describe('lib/webhooks/postProcessingPipeline.ts — invalidation boundary', () => {
  let invalidatePublicTruckBySlug: MockInvalidate;
  let getSupabaseAdmin: jest.Mock;

  beforeAll(async () => {
    const mod = await import('@/lib/services/publicTruckPage');
    invalidatePublicTruckBySlug = mod.invalidatePublicTruckBySlug as unknown as MockInvalidate;
    getSupabaseAdmin = (await import('@/lib/supabase/admin')).getSupabaseAdmin as jest.Mock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getSupabaseAdmin.mockReturnValue(buildSupabaseMock({ slug: 'test-truck' }));
  });

  it('invokes invalidatePublicTruckBySlug on successful webhook update', async () => {
    const { applyPostUpdate } = await import('@/lib/webhooks/postProcessingPipeline');
    const supabase = getSupabaseAdmin();

    const post = {
      id: 'post-1',
      truck_id: 'truck-1',
      facebook_post_id: 'fb-1',
      message: 'Open today!',
      raw_text: null,
      attachments: null,
      created_time: '2026-01-01T00:00:00Z',
      status: 'pending',
      confidence: null,
      source: 'facebook',
    };

    await applyPostUpdate(supabase, post, {
      food_items: [],
      confidence: 0.9,
      location: { address: '123 Main St' },
    });

    expect(invalidatePublicTruckBySlug).toHaveBeenCalledWith('test-truck');
  });

  it('does not invoke invalidatePublicTruckBySlug when no fields to update', async () => {
    const { applyPostUpdate } = await import('@/lib/webhooks/postProcessingPipeline');
    const supabase = getSupabaseAdmin();

    const post = {
      id: 'post-2',
      truck_id: 'truck-1',
      facebook_post_id: 'fb-2',
      message: 'Just a hello',
      raw_text: null,
      attachments: null,
      created_time: '2026-01-01T00:00:00Z',
      status: 'pending',
      confidence: null,
      source: 'facebook',
    };

    await applyPostUpdate(supabase, post, {
      food_items: [],
      confidence: 0.5,
    });

    expect(invalidatePublicTruckBySlug).not.toHaveBeenCalled();
  });
});
