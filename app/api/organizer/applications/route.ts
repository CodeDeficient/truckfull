/**
 * Organizer Applications API
 *
 * GET: List all applications for events owned by the current organizer
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';
import type { FoodTruckSocialMedia, MenuItem, FoodTruckContactInfo } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface TruckDataFromSupabase {
  id: string;
  name: string;
  cuisine_type: string[];
  social_media: string | FoodTruckSocialMedia;
  menu: MenuItem[];
  contact_info: FoodTruckContactInfo;
  average_rating: number;
  review_count: number;
}

interface MappedTruckData {
  id: string;
  name: string;
  cuisine_type: string[];
  image_url: string | null;
  menu: MenuItem[];
  menu_items: MenuItem[];
  contact_info: FoodTruckContactInfo;
  average_rating: number;
  review_count: number;
  social_media: string | FoodTruckSocialMedia;
}

export async function GET() {
  try {
    const supabase = createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2. Get Organizer Profile
    const adminClient = getSupabaseAdmin();
    const { data: organizer, error: orgError } = await adminClient
      .from('event_organizers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (orgError || !organizer) {
      return NextResponse.json({ error: 'Organizer profile not found' }, { status: 403 });
    }

    // 3. Get all events for this organizer
    const { data: events, error: eventsError } = await adminClient
      .from('eventfull_events')
      .select('id, name')
      .eq('organizer_id', organizer.id);

    if (eventsError) {
      logError('Error fetching organizer events:', eventsError);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ applications: [] });
    }

    const eventIds = events.map((e) => e.id);

    // 4. Get applications for these events
    const { data: applications, error: appError } = await adminClient
      .from('event_applications')
      .select(
        `
        id, status, created_at, cover_letter,
        truck:food_trucks (
          id, name, cuisine_type, social_media, menu, contact_info, average_rating, review_count
        ),
          event:eventfull_events (
          id, name
        )
      `,
      )
      .in('event_id', eventIds)
      .order('created_at', { ascending: false });

    if (appError) {
      logError('Error fetching applications:', appError);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    // Transform data to match frontend interface
    const transformed = applications.map((app) => ({
      id: app.id,
      status: app.status,
      created_at: app.created_at,
      cover_letter: app.cover_letter,
      truck: mapTruckData(Array.isArray(app.truck) ? app.truck[0] : app.truck),
      event: Array.isArray(app.event) ? app.event[0] : app.event,
    }));

    return NextResponse.json({ applications: transformed });
  } catch (error) {
    logError('Error in organizer applications GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function mapTruckData(truck: TruckDataFromSupabase | null): MappedTruckData | null {
  if (!truck) return null;

  let imageUrl = null;
  if (truck.social_media) {
    try {
      // Handle both string JSON and object
      const socials =
        typeof truck.social_media === 'string'
          ? JSON.parse(truck.social_media)
          : truck.social_media;

      if (socials && socials.photo_url) {
        imageUrl = socials.photo_url;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return {
    id: truck.id,
    name: truck.name,
    cuisine_type: truck.cuisine_type,
    image_url: imageUrl,
    menu: truck.menu,
    menu_items: truck.menu,
    contact_info: truck.contact_info,
    average_rating: truck.average_rating,
    review_count: truck.review_count,
    social_media: truck.social_media,
  };
}
