import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';
import {
  CLAIM_SEARCH_MIN_QUERY_LENGTH,
  buildClaimSearchPattern,
  getClaimSearchLimit,
  mapClaimSearchRow,
  type PublicTruckSearchResult,
  type PublicTruckSearchRow,
} from '@/lib/claim/publicClaimSearch';
import { checkRateLimited, claimSearchLimiter, getClientIp } from '@/lib/middleware/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawQuery = searchParams.get('q') ?? '';
    const limit = getClaimSearchLimit(searchParams.get('limit'));

    if (rawQuery.trim().length < CLAIM_SEARCH_MIN_QUERY_LENGTH) {
      return NextResponse.json({
        trucks: [],
        message: `Enter at least ${CLAIM_SEARCH_MIN_QUERY_LENGTH} characters to search.`,
      });
    }

    const rateLimitResult = await checkRateLimited(
      `claim-search:${getClientIp(request)}`,
      claimSearchLimiter,
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many search requests. Please try again soon.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimitResult.retryAfter) },
        },
      );
    }

    const adminClient = getSupabaseAdmin();

    const { data: rows, error } = await adminClient
      .from('food_trucks')
      .select('id, name, cuisine_type, city, state, description, slug, price_range, social_media')
      .or(`owner_id.is.null,is_claimed.eq.false`)
      .ilike('name', buildClaimSearchPattern(rawQuery))
      .order('name')
      .limit(limit);

    if (error) {
      logError('public claim truck search error:', error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    const trucks: PublicTruckSearchResult[] = (rows ?? []).map((row) =>
      mapClaimSearchRow(row as PublicTruckSearchRow),
    );

    return NextResponse.json({ trucks });
  } catch (error) {
    logError('public claim truck search exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
