import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('connectPageAndSubscribe', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('subscribes and returns subscribed=true when app has feed in subscribed_fields', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 'app-123', name: 'TruckFull', subscribed_fields: ['feed', 'messages'] },
        ],
      }),
    });

    const { connectPageAndSubscribe } = await import('@/lib/facebook/pageConnectionService');

    const result = await connectPageAndSubscribe({
      pageId: 'page-123',
      pageAccessToken: 'token-abc',
      appId: 'app-123',
    });

    expect(result).toEqual({ subscribed: true, subscribedFields: ['feed', 'messages'] });
  });

  it('returns subscribed=false when our app is not in the list', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 'other-app', name: 'Other', subscribed_fields: ['feed'] },
        ],
      }),
    });

    const { connectPageAndSubscribe } = await import('@/lib/facebook/pageConnectionService');

    const result = await connectPageAndSubscribe({
      pageId: 'page-123',
      pageAccessToken: 'token-abc',
      appId: 'app-123',
    });

    expect(result).toEqual({ subscribed: false, subscribedFields: [] });
  });

  it('returns subscribed=false when our app has no subscribed_fields', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 'app-123', name: 'TruckFull', subscribed_fields: [] },
        ],
      }),
    });

    const { connectPageAndSubscribe } = await import('@/lib/facebook/pageConnectionService');

    const result = await connectPageAndSubscribe({
      pageId: 'page-123',
      pageAccessToken: 'token-abc',
      appId: 'app-123',
    });

    expect(result).toEqual({ subscribed: false, subscribedFields: [] });
  });

  it('returns error when subscribe fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: { message: 'permission denied' } }),
    });

    const { connectPageAndSubscribe } = await import('@/lib/facebook/pageConnectionService');

    const result = await connectPageAndSubscribe({
      pageId: 'page-123',
      pageAccessToken: 'token-abc',
      appId: 'app-123',
    });

    expect(result).toEqual({ subscribed: false, subscribedFields: [], error: 'permission denied' });
  });

  it('returns error when subscription status check fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'graph api error' } }),
    });

    const { connectPageAndSubscribe } = await import('@/lib/facebook/pageConnectionService');

    const result = await connectPageAndSubscribe({
      pageId: 'page-123',
      pageAccessToken: 'token-abc',
      appId: 'app-123',
    });

    expect(result).toEqual({ subscribed: false, subscribedFields: [], error: 'graph api error' });
  });
});

describe('updateWebhookState', () => {
  const mockRpc = jest.fn();
  const mockSupabase = { rpc: mockRpc } as unknown as import('@supabase/supabase-js').SupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns success when RPC returns a truck', async () => {
    mockRpc.mockResolvedValueOnce({ data: { id: 'truck-1' }, error: null });

    const { updateWebhookState } = await import('@/lib/facebook/pageConnectionService');

    const result = await updateWebhookState(mockSupabase, 'truck-1', 'user-1', true);

    expect(result).toEqual({ success: true, conflict: false, error: null });
    expect(mockRpc).toHaveBeenCalledWith('set_food_truck_facebook_auto_updates', {
      p_truck_id: 'truck-1',
      p_owner_id: 'user-1',
      p_enabled: true,
    });
  });

  it('returns conflict when RPC returns no truck', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const { updateWebhookState } = await import('@/lib/facebook/pageConnectionService');

    const result = await updateWebhookState(mockSupabase, 'truck-1', 'user-1', true);

    expect(result).toEqual({ success: false, conflict: true, error: null });
  });

  it('returns error when RPC fails', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC error' } });

    const { updateWebhookState } = await import('@/lib/facebook/pageConnectionService');

    const result = await updateWebhookState(mockSupabase, 'truck-1', 'user-1', true);

    expect(result).toEqual({ success: false, conflict: false, error: 'Failed to update webhook sync' });
  });

  it('passes enabled=false to RPC', async () => {
    mockRpc.mockResolvedValueOnce({ data: { id: 'truck-1' }, error: null });

    const { updateWebhookState } = await import('@/lib/facebook/pageConnectionService');

    const result = await updateWebhookState(mockSupabase, 'truck-1', 'user-1', false);

    expect(result).toEqual({ success: true, conflict: false, error: null });
    expect(mockRpc).toHaveBeenCalledWith('set_food_truck_facebook_auto_updates', {
      p_truck_id: 'truck-1',
      p_owner_id: 'user-1',
      p_enabled: false,
    });
  });
});

describe('checkBusinessTokenScopes', () => {
  it('returns valid=true when all required scopes present', async () => {
    const { checkBusinessTokenScopes } = await import('@/lib/facebook/pageConnectionService');

    const result = checkBusinessTokenScopes([
      'public_profile',
      'pages_show_list',
      'pages_manage_metadata',
      'pages_read_engagement',
      'business_management',
    ]);

    expect(result).toEqual({ valid: true, missing: [] });
  });

  it('returns valid=false with missing scopes', async () => {
    const { checkBusinessTokenScopes } = await import('@/lib/facebook/pageConnectionService');

    const result = checkBusinessTokenScopes([
      'public_profile',
      'pages_show_list',
    ]);

    expect(result.valid).toBe(false);
    expect(result.missing).toContain('pages_read_engagement');
    expect(result.missing).toContain('pages_manage_metadata');
    expect(result.missing).toContain('business_management');
  });

  it('returns valid=false with empty scopes', async () => {
    const { checkBusinessTokenScopes } = await import('@/lib/facebook/pageConnectionService');

    const result = checkBusinessTokenScopes([]);

    expect(result.valid).toBe(false);
    expect(result.missing.length).toBe(5);
  });
});
