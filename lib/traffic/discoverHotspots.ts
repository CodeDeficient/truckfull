/**
 * Hotspot Discovery Module
 * WBS: 4.2.2
 *
 * Analyzes traffic data to identify high-density areas suitable for food trucks.
 * Designed to run as a cron job every 30 minutes.
 */

import { fetchGeorgia511Traffic, TrafficEvent } from './georgia511';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logMessage, logError, logWarning } from '@/lib/logging';

// Configurable threshold (can be overridden via env)
const HOTSPOT_THRESHOLD = Number(process.env.HOTSPOT_SCORE_THRESHOLD) || 70;

// How close events must be to cluster (in meters)
const CLUSTER_RADIUS_METERS = 500;

// Hotspot expiry time (hours)
const HOTSPOT_EXPIRY_HOURS = 4;

interface HotspotCandidate {
  lat: number;
  lng: number;
  trafficScore: number;
  eventCount: number;
  events: TrafficEvent[];
}

/**
 * Calculate distance between two points using Haversine formula.
 * Returns distance in meters.
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Clusters traffic events and calculates traffic scores for each cluster.
 */
function clusterTrafficEvents(events: TrafficEvent[]): HotspotCandidate[] {
  const clusters: HotspotCandidate[] = [];
  const assigned = new Set<string>();

  for (const event of events) {
    if (assigned.has(event.id)) continue;

    // Find all events within cluster radius
    const nearbyEvents = events.filter((e) => {
      if (assigned.has(e.id)) return false;
      const distance = haversineDistance(
        event.location.lat,
        event.location.lng,
        e.location.lat,
        e.location.lng,
      );
      return distance <= CLUSTER_RADIUS_METERS;
    });

    if (nearbyEvents.length === 0) continue;

    // Mark all as assigned
    for (const e of nearbyEvents) assigned.add(e.id);

    // Calculate centroid
    const sumLat = nearbyEvents.reduce((sum, e) => sum + e.location.lat, 0);
    const sumLng = nearbyEvents.reduce((sum, e) => sum + e.location.lng, 0);
    const centroidLat = sumLat / nearbyEvents.length;
    const centroidLng = sumLng / nearbyEvents.length;

    // Calculate traffic score based on event count and severity
    let score = Math.min(100, nearbyEvents.length * 20);

    // Boost score for high-severity events
    for (const e of nearbyEvents) {
      if (e.severity === 'high' || e.severity === 'severe') {
        score = Math.min(100, score + 10);
      }
    }

    clusters.push({
      lat: centroidLat,
      lng: centroidLng,
      trafficScore: score,
      eventCount: nearbyEvents.length,
      events: nearbyEvents,
    });
  }

  return clusters;
}

/**
 * Main discovery function. Fetches traffic data, clusters it, and saves hotspots.
 */
export async function discoverHotspots(): Promise<{
  created: number;
  updated: number;
  expired: number;
}> {
  const stats = { created: 0, updated: 0, expired: 0 };

  try {
    // Fetch traffic events
    const events = await fetchGeorgia511Traffic();

    if (events.length === 0) {
      logWarning('No traffic events returned - skipping hotspot discovery');
      return stats;
    }

    logMessage(`Analyzing ${events.length} traffic events for hotspots`);

    // Cluster events
    const clusters = clusterTrafficEvents(events);

    // Filter to only high-score clusters
    const hotspotCandidates = clusters.filter((c) => c.trafficScore >= HOTSPOT_THRESHOLD);

    logMessage(
      `Found ${hotspotCandidates.length} hotspot candidates (threshold: ${HOTSPOT_THRESHOLD})`,
    );

    const adminClient = getSupabaseAdmin();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + HOTSPOT_EXPIRY_HOURS * 60 * 60 * 1000);

    for (const candidate of hotspotCandidates) {
      // Check if a hotspot already exists nearby
      const { data: existing } = await adminClient.rpc('find_nearby_hotspot', {
        lat: candidate.lat,
        lng: candidate.lng,
        radius_meters: CLUSTER_RADIUS_METERS,
      });

      if (existing && existing.length > 0) {
        // Update existing hotspot
        const { error } = await adminClient
          .from('hotspots')
          .update({
            traffic_score: candidate.trafficScore,
            last_updated: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            is_active: true,
          })
          .eq('id', existing[0].id);

        if (!error) stats.updated++;
      } else {
        // Create new hotspot
        const { error } = await adminClient.from('hotspots').insert({
          lat: candidate.lat,
          lng: candidate.lng,
          location_geog: `POINT(${candidate.lng} ${candidate.lat})`,
          traffic_score: candidate.trafficScore,
          discovery_time: now.toISOString(),
          last_updated: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          source: 'georgia_511',
          is_active: true,
        });

        if (!error) stats.created++;
      }
    }

    // Expire old hotspots
    const { data: expiredHotspots } = await adminClient
      .from('hotspots')
      .update({ is_active: false })
      .lt('expires_at', now.toISOString())
      .eq('is_active', true)
      .select('id');

    stats.expired = expiredHotspots?.length ?? 0;

    logMessage(
      `Hotspot discovery complete: ${stats.created} created, ${stats.updated} updated, ${stats.expired} expired`,
    );

    return stats;
  } catch (error) {
    logError('Hotspot discovery failed:', error);
    throw error;
  }
}

/**
 * Cleans up expired reservations.
 * Designed to run hourly.
 */
export async function cleanupExpiredReservations(): Promise<number> {
  try {
    const adminClient = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data, error } = await adminClient
      .from('hotspot_reservations')
      .update({ status: 'expired' })
      .lt('reserved_until', now)
      .eq('status', 'active')
      .select('id');

    if (error) {
      logError('Failed to cleanup expired reservations:', error);
      return 0;
    }

    const count = data?.length ?? 0;
    if (count > 0) {
      logMessage(`Cleaned up ${count} expired hotspot reservations`);
    }

    return count;
  } catch (error) {
    logError('Reservation cleanup failed:', error);
    return 0;
  }
}
