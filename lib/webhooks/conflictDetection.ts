import type { ParsedPost, ConflictResult, Conflict } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logError } from '@/lib/logging';

const HOUR_MINUTE_TIME = /^(\d{1,2}):(\d{2})$/;

interface ExistingPostForConflict {
  id: string;
  platform: string;
  post_url: string;
  content: string;
  timestamp: string;
  extracted_data?: {
    truck_name?: string;
    food_items?: string[];
    location?: {
      address?: string;
      latitude?: number;
      longitude?: number;
    };
    time?: {
      start?: string;
      end?: string;
      date?: string;
    };
  };
}

const DUPLICATE_TIME_WINDOW_HOURS = 2;
const LOCATION_CONFLICT_RADIUS_METERS = 100;

export async function detectConflicts(
  post: ParsedPost,
  supabase: SupabaseClient,
): Promise<ConflictResult> {
  const conflicts: Conflict[] = [];

  if (!post || !post.timestamp || !post.extracted_data) {
    return { hasConflict: false, conflicts };
  }

  try {
    const postTimestamp = new Date(post.timestamp);
    const timeStart = new Date(
      postTimestamp.getTime() - DUPLICATE_TIME_WINDOW_HOURS * 60 * 60 * 1000,
    );
    const timeEnd = new Date(
      postTimestamp.getTime() + DUPLICATE_TIME_WINDOW_HOURS * 60 * 60 * 1000,
    );

    const { data: existingPosts, error } = await supabase
      .from('facebook_posts')
      .select(
        `
        id,
        facebook_post_id,
        message,
        created_time,
        truck_id,
        food_trucks (
          name
        ),
        parsed_facebook_posts (
          food_items,
          location_data,
          time_data
        )
      `,
      )
      .gte('created_time', timeStart.toISOString())
      .lte('created_time', timeEnd.toISOString());

    if (error || !existingPosts) {
      return { hasConflict: false, conflicts };
    }

    for (const existingPost of existingPosts) {
      if (existingPost.id === post.id) {
        continue;
      }

      const parsedDataArray = existingPost.parsed_facebook_posts;
      const parsedData = Array.isArray(parsedDataArray) ? parsedDataArray[0] : null;
      if (parsedData && post.extracted_data) {
        const truckData = existingPost.food_trucks as { name: string } | { name: string }[] | null;
        const truckName = Array.isArray(truckData) ? truckData[0]?.name : truckData?.name;
        const existingPostWithExtractedData = {
          ...existingPost,
          id: existingPost.id,
          platform: 'facebook',
          post_url: `https://facebook.com/${existingPost.facebook_post_id}`,
          content: existingPost.message ?? '',
          timestamp: existingPost.created_time,
          extracted_data: {
            truck_name: truckName,
            food_items: parsedData.food_items ?? [],
            location: parsedData.location_data ?? {},
            time: parsedData.time_data ?? {},
          },
        };

        const duplicateConflict = checkForDuplicate(post, existingPostWithExtractedData);
        if (duplicateConflict) {
          conflicts.push(duplicateConflict);
        }

        const locationConflict = checkForLocationConflict(post, existingPostWithExtractedData);
        if (locationConflict) {
          conflicts.push(locationConflict);
        }

        const scheduleConflict = checkForScheduleConflict(post, existingPostWithExtractedData);
        if (scheduleConflict) {
          conflicts.push(scheduleConflict);
        }
      }
    }
  } catch (error) {
    logError('Conflict detection failed', { postId: post.id, error });
    return { hasConflict: false, conflicts };
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

function checkForDuplicate(
  post: ParsedPost,
  existingPost: ExistingPostForConflict,
): Conflict | null {
  if (!existingPost.extracted_data || !post.extracted_data) {
    return null;
  }

  const postTruck = post.extracted_data.truck_name?.toLowerCase().trim();
  const existingTruck = existingPost.extracted_data.truck_name?.toLowerCase().trim();

  if (postTruck && existingTruck && postTruck === existingTruck) {
    const postContent = post.content.toLowerCase().trim();
    const existingContent = existingPost.content.toLowerCase().trim();

    if (postContent === existingContent) {
      return {
        id: `duplicate-${existingPost.id}`,
        type: 'duplicate',
        description: `Duplicate post found: ${existingPost.post_url}`,
        conflicting_post: existingPost,
        severity: 'high',
      };
    }

    const postLocation = post.extracted_data.location?.address?.toLowerCase().trim();
    const existingLocation = existingPost.extracted_data.location?.address?.toLowerCase().trim();

    if (postLocation && existingLocation && postLocation === existingLocation) {
      return {
        id: `duplicate-${existingPost.id}`,
        type: 'duplicate',
        description: `Duplicate location post found: ${existingPost.post_url}`,
        conflicting_post: existingPost,
        severity: 'medium',
      };
    }
  }

  return null;
}

function checkForLocationConflict(
  post: ParsedPost,
  existingPost: ExistingPostForConflict,
): Conflict | null {
  if (!existingPost.extracted_data || !post.extracted_data) {
    return null;
  }

  const postLat = post.extracted_data.location?.latitude;
  const postLng = post.extracted_data.location?.longitude;
  const existingLat = existingPost.extracted_data.location?.latitude;
  const existingLng = existingPost.extracted_data.location?.longitude;

  if (postLat && postLng && existingLat && existingLng) {
    const distance = calculateDistance(postLat, postLng, existingLat, existingLng);
    if (distance < LOCATION_CONFLICT_RADIUS_METERS) {
      const postTruck = post.extracted_data.truck_name?.toLowerCase().trim();
      const existingTruck = existingPost.extracted_data.truck_name?.toLowerCase().trim();

      if (postTruck && existingTruck && postTruck !== existingTruck) {
        return {
          id: `location-conflict-${existingPost.id}`,
          type: 'location_conflict',
          description: `Another truck (${existingPost.extracted_data.truck_name}) at nearby location (${Math.round(distance)}m): ${existingPost.post_url}`,
          conflicting_post: existingPost,
          severity: 'medium',
        };
      }
    }
  }

  return null;
}

function checkForScheduleConflict(
  post: ParsedPost,
  existingPost: ExistingPostForConflict,
): Conflict | null {
  if (!existingPost.extracted_data || !post.extracted_data) {
    return null;
  }

  const postTruck = post.extracted_data.truck_name?.toLowerCase().trim();
  const existingTruck = existingPost.extracted_data.truck_name?.toLowerCase().trim();

  if (!postTruck || !existingTruck || postTruck !== existingTruck) {
    return null;
  }

  const postTime = post.extracted_data.time;
  const existingTime = existingPost.extracted_data.time;

  if (postTime && existingTime) {
    const postDate = postTime.date;
    const existingDate = existingTime.date;

    if (postDate && existingDate && postDate === existingDate) {
      const postStart = parseTime(postTime.start);
      const postEnd = parseTime(postTime.end);
      const existingStart = parseTime(existingTime.start);
      const existingEnd = parseTime(existingTime.end);

      if (
        postStart !== null &&
        postEnd !== null &&
        existingStart !== null &&
        existingEnd !== null
      ) {
        const hasOverlap = !(postEnd < existingStart || postStart > existingEnd);
        if (hasOverlap) {
          const postLocation = post.extracted_data.location?.address?.toLowerCase().trim();
          const existingLocation = existingPost.extracted_data.location?.address
            ?.toLowerCase()
            .trim();

          if (postLocation && existingLocation && postLocation !== existingLocation) {
            return {
              id: `schedule-conflict-${existingPost.id}`,
              type: 'schedule_conflict',
              description: `Same truck at different location during overlapping time: ${existingPost.post_url}`,
              conflicting_post: existingPost,
              severity: 'high',
            };
          }
        }
      }
    }
  }

  return null;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseTime(timeStr: string | undefined): number | null {
  if (!timeStr) return null;

  const match = timeStr.match(HOUR_MINUTE_TIME);
  if (!match) return null;

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}
