import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { extractVenueOrParkName } from '@/lib/utils/addressCleaner';

export async function findCachedVenue(
  address: string,
  city: string,
  state: string,
): Promise<{ lat: number; lng: number } | null> {
  const venueName = extractVenueOrParkName(address);
  if (!venueName) return null;

  const venueKey = `${venueName.toLowerCase().trim()}|${city.toLowerCase()}|${state.toLowerCase()}`;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('venue_location_cache')
      .select('lat, lng')
      .eq('venue_key', venueKey)
      .maybeSingle();

    if (error || !data) return null;

    await supabase
      .from('venue_location_cache')
      .update({ last_geocoded_at: new Date().toISOString() })
      .eq('venue_key', venueKey);

    return { lat: data.lat, lng: data.lng };
  } catch {
    return null;
  }
}

export async function cacheVenueLocation(
  address: string,
  lat: number,
  lng: number,
  city: string,
  state: string,
): Promise<void> {
  const venueName = extractVenueOrParkName(address);
  if (!venueName) return;

  const venueKey = `${venueName.toLowerCase().trim()}|${city.toLowerCase()}|${state.toLowerCase()}`;

  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from('venue_location_cache')
      .upsert(
        {
          venue_key: venueKey,
          venue_name: venueName,
          address,
          lat,
          lng,
          city,
          state,
        },
        { onConflict: 'venue_key' },
      );
  } catch {
    // Silently fail — cache misses are non-critical
  }
}
