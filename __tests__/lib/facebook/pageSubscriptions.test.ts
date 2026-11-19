import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('pageSubscriptions', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('subscribes a page to feed webhooks with a page access token', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { subscribePageToFeed } = await import('@/lib/facebook/pageSubscriptions');

    const result = await subscribePageToFeed({
      pageId: 'page-123',
      pageAccessToken: 'page-token-abc',
    });

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/page-123/subscribed_apps?subscribed_fields=feed&access_token=page-token-abc',
      expect.objectContaining({
        method: 'POST',
        headers: { Accept: 'application/json' },
      }),
    );
  });

  it('unsubscribes the app from a page with a page access token', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { unsubscribeAppFromPage } = await import('@/lib/facebook/pageSubscriptions');

    const result = await unsubscribeAppFromPage({
      pageId: 'page-123',
      pageAccessToken: 'page-token-abc',
    });

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/page-123/subscribed_apps?access_token=page-token-abc',
      expect.objectContaining({
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      }),
    );
  });

  describe('getPageSubscriptionStatus', () => {
    it('returns subscribed apps list from GET endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: 'app-1', name: 'My App', subscribed_fields: ['feed', 'messages'] },
          ],
        }),
      });

      const { getPageSubscriptionStatus } = await import('@/lib/facebook/pageSubscriptions');

      const result = await getPageSubscriptionStatus({
        pageId: 'page-123',
        pageAccessToken: 'page-token-abc',
      });

      expect(result).toEqual([
        { id: 'app-1', name: 'My App', subscribedFields: ['feed', 'messages'] },
      ]);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v25.0/page-123/subscribed_apps?fields=id%2Cname%2Csubscribed_fields&access_token=page-token-abc',
        expect.objectContaining({
          method: 'GET',
          headers: { Accept: 'application/json' },
        }),
      );
    });

    it('returns empty array when no apps subscribed', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const { getPageSubscriptionStatus } = await import('@/lib/facebook/pageSubscriptions');

      const result = await getPageSubscriptionStatus({
        pageId: 'page-123',
        pageAccessToken: 'page-token-abc',
      });

      expect(result).toEqual([]);
    });

    it('returns empty array when data field is missing', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const { getPageSubscriptionStatus } = await import('@/lib/facebook/pageSubscriptions');

      const result = await getPageSubscriptionStatus({
        pageId: 'page-123',
        pageAccessToken: 'page-token-abc',
      });

      expect(result).toEqual([]);
    });

    it('throws on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: 'permission denied' } }),
      });

      const { getPageSubscriptionStatus } = await import('@/lib/facebook/pageSubscriptions');

      await expect(
        getPageSubscriptionStatus({
          pageId: 'page-123',
          pageAccessToken: 'page-token-abc',
        }),
      ).rejects.toThrow('permission denied');
    });
  });
});
