/**
 * Client-side analytics tracking utility
 * Sends events to /api/analytics/track
 *
 * @module lib/utils/analytics
 */

import { logWarning } from '@/lib/logging';

export type AnalyticsEventType =
  | 'view'
  | 'click_menu'
  | 'click_directions'
  | 'favorite'
  | 'share'
  | 'call'
  | 'website';

// Track which events have been sent recently to debounce duplicates
export const recentEvents = new Map<string, number>();
export const DEBOUNCE_MS = 5000; // 5 seconds between duplicate events

/**
 * Track an analytics event for a truck
 * Debounced to prevent duplicate events within 5 seconds
 */
export async function trackEvent(
  eventType: AnalyticsEventType,
  truckId: string,
  metadata?: Record<string, string>,
): Promise<void> {
  // Create a unique key for this event
  const eventKey = `${eventType}:${truckId}`;
  const now = Date.now();

  // Check if we've sent this event recently
  const lastSent = recentEvents.get(eventKey);
  if (lastSent && now - lastSent < DEBOUNCE_MS) {
    // Skip duplicate event
    return;
  }

  // Mark as sent
  recentEvents.set(eventKey, now);

  // Clean up old entries periodically (prevent memory leak)
  if (recentEvents.size > 100) {
    const cutoff = now - DEBOUNCE_MS;
    for (const [key, time] of recentEvents.entries()) {
      if (time < cutoff) {
        recentEvents.delete(key);
      }
    }
  }

  try {
    const response = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        truckId,
        eventType,
        metadata,
      }),
    });

    if (!response.ok) {
      // Silent fail - analytics should not disrupt user experience
      logWarning(`Analytics tracking failed: ${response.status}`);
    }
  } catch {
    // Silent fail - don't block on analytics errors
    logWarning('Analytics tracking error');
  }
}

/**
 * Track a truck view event
 */
export function trackTruckView(truckId: string): void {
  void trackEvent('view', truckId);
}

/**
 * Track a menu click event
 */
export function trackMenuClick(truckId: string): void {
  void trackEvent('click_menu', truckId);
}

/**
 * Track a directions click event
 */
export function trackDirectionsClick(truckId: string): void {
  void trackEvent('click_directions', truckId);
}

/**
 * Track a favorite event
 */
export function trackFavorite(truckId: string): void {
  void trackEvent('favorite', truckId);
}

/**
 * Track a share event
 */
export function trackShare(truckId: string): void {
  void trackEvent('share', truckId);
}

/**
 * Track a call click event
 */
export function trackCall(truckId: string): void {
  void trackEvent('call', truckId);
}

/**
 * Track a website click event
 */
export function trackWebsiteClick(truckId: string): void {
  void trackEvent('website', truckId);
}
