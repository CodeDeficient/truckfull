import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

let trackEvent: typeof import('@/lib/utils/analytics').trackEvent;
let trackTruckView: typeof import('@/lib/utils/analytics').trackTruckView;
let trackMenuClick: typeof import('@/lib/utils/analytics').trackMenuClick;
let trackDirectionsClick: typeof import('@/lib/utils/analytics').trackDirectionsClick;
let trackFavorite: typeof import('@/lib/utils/analytics').trackFavorite;
let trackShare: typeof import('@/lib/utils/analytics').trackShare;
let trackCall: typeof import('@/lib/utils/analytics').trackCall;
let trackWebsiteClick: typeof import('@/lib/utils/analytics').trackWebsiteClick;
let recentEvents: typeof import('@/lib/utils/analytics').recentEvents;
let DEBOUNCE_MS: typeof import('@/lib/utils/analytics').DEBOUNCE_MS;

describe('analytics', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    const mod = await import('@/lib/utils/analytics');
    trackEvent = mod.trackEvent;
    trackTruckView = mod.trackTruckView;
    trackMenuClick = mod.trackMenuClick;
    trackDirectionsClick = mod.trackDirectionsClick;
    trackFavorite = mod.trackFavorite;
    trackShare = mod.trackShare;
    trackCall = mod.trackCall;
    trackWebsiteClick = mod.trackWebsiteClick;
    recentEvents = mod.recentEvents;
    DEBOUNCE_MS = mod.DEBOUNCE_MS;

    recentEvents.clear();
  });

  describe('trackEvent', () => {
    it('sends event to analytics endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      await trackEvent('view', 'truck-123');
      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/track', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ truckId: 'truck-123', eventType: 'view', metadata: undefined }),
      }));
    });

    it('includes metadata if provided', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const metadata = { source: 'homepage' };
      await trackEvent('click_menu', 'truck-123', metadata);
      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/track', expect.objectContaining({
        body: JSON.stringify({ truckId: 'truck-123', eventType: 'click_menu', metadata }),
      }));
    });

    it('silently fails on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await expect(trackEvent('view', 'truck-123')).resolves.toBeUndefined();
    });

    it('silently fails on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      await expect(trackEvent('view', 'truck-123')).resolves.toBeUndefined();
    });

    it('debounces same event type + truckId within 5 seconds', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      await trackEvent('view', 'truck-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await trackEvent('view', 'truck-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await trackEvent('click_menu', 'truck-123');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      await trackEvent('view', 'different-truck');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('allows same event after 5 seconds have passed', async () => {
      const originalDateNow = Date.now;
      const now = originalDateNow();

      mockFetch.mockResolvedValueOnce({ ok: true });
      await trackEvent('view', 'truck-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      Date.now = jest.fn(() => now + DEBOUNCE_MS + 1);

      mockFetch.mockResolvedValueOnce({ ok: true });
      await trackEvent('view', 'truck-123');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      Date.now = originalDateNow;
    });

    it('cleans up old entries when more than 100 events stored', async () => {
      const originalDateNow = Date.now;
      const now = originalDateNow();

      mockFetch.mockResolvedValue({ ok: true });

      for (let i = 0; i < 150; i++) {
        recentEvents.set(`old:truck-${i}`, now - DEBOUNCE_MS - 1000);
      }

      expect(recentEvents.size).toBe(150);

      await trackEvent('view', 'new-truck');

      expect(recentEvents.size).toBeLessThanOrEqual(100);

      for (let i = 0; i < 150; i++) {
        expect(recentEvents.has(`old:truck-${i}`)).toBe(false);
      }
      expect(recentEvents.has('view:new-truck')).toBe(true);

      Date.now = originalDateNow;
    });

    it('preserves recent entries during cleanup', async () => {
      const originalDateNow = Date.now;
      const now = originalDateNow();

      mockFetch.mockResolvedValue({ ok: true });

      recentEvents.set('recent:truck-1', now - 1000);
      recentEvents.set('recent:truck-2', now - 2000);
      recentEvents.set('recent:truck-3', now - 3000);

      for (let i = 0; i < 150; i++) {
        recentEvents.set(`old:truck-${i}`, now - DEBOUNCE_MS - 1000);
      }

      await trackEvent('view', 'new-truck');

      expect(recentEvents.has('recent:truck-1')).toBe(true);
      expect(recentEvents.has('recent:truck-2')).toBe(true);
      expect(recentEvents.has('recent:truck-3')).toBe(true);

      Date.now = originalDateNow;
    });
  });

  describe('AnalyticsEventType union', () => {
    it('accepts all valid event types', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const eventTypes: Array<'view' | 'click_menu' | 'click_directions' | 'favorite' | 'share' | 'call' | 'website'> = [
        'view',
        'click_menu',
        'click_directions',
        'favorite',
        'share',
        'call',
        'website',
      ];

      for (const eventType of eventTypes) {
        await trackEvent(eventType, `truck-${eventType}`);
      }

      expect(mockFetch).toHaveBeenCalledTimes(7);
    });
  });

  describe('trackTruckView', () => {
    it('calls trackEvent with view type', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      trackTruckView('truck-456');
      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/track', expect.objectContaining({
        body: JSON.stringify({ truckId: 'truck-456', eventType: 'view' }),
      }));
    });
  });

  describe('trackMenuClick', () => {
    it('calls trackEvent with click_menu type', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      trackMenuClick('truck-789');
      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/track', expect.objectContaining({
        body: JSON.stringify({ truckId: 'truck-789', eventType: 'click_menu' }),
      }));
    });
  });

  describe('trackDirectionsClick', () => {
    it('calls trackEvent with click_directions type', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      trackDirectionsClick('truck-abc');
      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/track', expect.objectContaining({
        body: JSON.stringify({ truckId: 'truck-abc', eventType: 'click_directions' }),
      }));
    });
  });

  describe('trackFavorite', () => {
    it('calls trackEvent with favorite type', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      trackFavorite('truck-def');
      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/track', expect.objectContaining({
        body: JSON.stringify({ truckId: 'truck-def', eventType: 'favorite' }),
      }));
    });
  });

  describe('trackShare', () => {
    it('calls trackEvent with share type', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      trackShare('truck-ghi');
      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/track', expect.objectContaining({
        body: JSON.stringify({ truckId: 'truck-ghi', eventType: 'share' }),
      }));
    });
  });

  describe('trackCall', () => {
    it('calls trackEvent with call type', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      trackCall('truck-jkl');
      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/track', expect.objectContaining({
        body: JSON.stringify({ truckId: 'truck-jkl', eventType: 'call' }),
      }));
    });
  });

  describe('trackWebsiteClick', () => {
    it('calls trackEvent with website type', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      trackWebsiteClick('truck-mno');
      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/track', expect.objectContaining({
        body: JSON.stringify({ truckId: 'truck-mno', eventType: 'website' }),
      }));
    });
  });
});
