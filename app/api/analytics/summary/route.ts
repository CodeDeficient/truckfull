/**
 * API Route: Get Analytics Summary
 *
 * Returns aggregated analytics data across all trucks owned by the authenticated user.
 * Protected: Owner only.
 *
 * @module app/api/analytics/summary/route
 *
 * @see docs/ARCHIVE/DATA_QUALITY_ENHANCEMENT_PLAN.md Phase 5, Day 1 - Metrics aggregation approach
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerAccessFromCookies } from '@/lib/auth/ownerAccessServer';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';
import { rateLimitEndpoint } from '@/lib/middleware/rateLimit';

export async function GET(req: NextRequest) {
  try {
    // Verify the caller can enter owner tools (owner/admin role or active
    // entitlement). Truckless entitled users get valid zeroed data below.
    const access = await verifyOwnerAccessFromCookies();

    if (access.outcome === 'unauthenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (access.outcome === 'authenticated_without_access') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId, role } = access;

    // Apply rate limiting
    const { success } = await rateLimitEndpoint('analytics-summary', req);
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Use service role client for all queries (bypasses RLS safely after auth check)
    const supabase = getSupabaseAdmin();

    // Get all trucks owned by this user (unless admin)
    let truckIds: string[] = [];

    if (role === 'admin') {
      // Admins see all trucks
      const { data: trucks, error: trucksError } = await supabase.from('food_trucks').select('id');

      if (trucksError) {
        logError('Error fetching trucks for admin:', trucksError);
        return NextResponse.json({ error: 'Failed to fetch trucks' }, { status: 500 });
      }

      truckIds = (trucks || []).map((t) => t.id);
    } else {
      // Owners see only their trucks
      const { data: trucks, error: trucksError } = await supabase
        .from('food_trucks')
        .select('id')
        .eq('owner_id', userId);

      if (trucksError) {
        logError('Error fetching owner trucks:', trucksError);
        return NextResponse.json({ error: 'Failed to fetch trucks' }, { status: 500 });
      }

      truckIds = (trucks || []).map((t) => t.id);
    }

    if (truckIds.length === 0) {
      // No trucks, return empty data
      return NextResponse.json({
        truckCount: 0,
        period: { days: 30, startDate: new Date().toISOString() },
        totals: {
          views: 0,
          menuClicks: 0,
          directionsClicks: 0,
          favorites: 0,
          websiteClicks: 0,
          shares: 0,
        },
        daily: [],
      });
    }

    // Get query parameters
    const url = req.nextUrl;
    const daysParam = url.searchParams.get('days') || '30';
    const truckIdParam = url.searchParams.get('truckId');
    const days = Number.parseInt(daysParam, 10);

    if (Number.isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Invalid days parameter (must be 1-365)' },
        { status: 400 },
      );
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Filter by specific truck if truckId is provided, but verify ownership for non-admin users
    const filteredTruckIds =
      truckIdParam && (role === 'admin' || truckIds.includes(truckIdParam))
        ? [truckIdParam]
        : truckIds;

    // Fetch aggregated analytics from the view for selected trucks
    const { data: summary, error: summaryError } = await supabase
      .from('truck_analytics_summary')
      .select('*')
      .in('truck_id', filteredTruckIds)
      .gte('event_date', startDate.toISOString().split('T')[0])
      .order('event_date', { ascending: false });

    if (summaryError) {
      logError('Error fetching analytics summary:', summaryError);
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }

    // Fetch current favorites count from user_favorites table (not from analytics events)
    // Use service role client to bypass RLS and see all favorites for selected trucks
    const { data: favoritesData, error: favoritesError } = await supabase
      .from('user_favorites')
      .select('food_truck_id')
      .in('food_truck_id', filteredTruckIds);

    const currentFavoritesCount = favoritesError ? 0 : (favoritesData || []).length;

    // Calculate totals across all trucks
    const totals = (summary || []).reduce(
      (acc, day) => ({
        views: acc.views + (day.total_views || 0),
        menuClicks: acc.menuClicks + (day.menu_clicks || 0),
        directionsClicks: acc.directionsClicks + (day.directions_clicks || 0),
        favorites: acc.favorites + (day.favorites || 0),
        websiteClicks: acc.websiteClicks + (day.website_clicks || 0),
        shares: acc.shares + (day.shares || 0),
        uniqueViews: acc.uniqueViews + (day.unique_views || 0),
        uniqueMenuClicks: acc.uniqueMenuClicks + (day.unique_menu_clicks || 0),
        uniqueDirectionsClicks: acc.uniqueDirectionsClicks + (day.unique_directions_clicks || 0),
        uniqueWebsiteClicks: acc.uniqueWebsiteClicks + (day.unique_website_clicks || 0),
        uniqueShares: acc.uniqueShares + (day.unique_shares || 0),
      }),
      {
        views: 0,
        menuClicks: 0,
        directionsClicks: 0,
        favorites: 0,
        websiteClicks: 0,
        shares: 0,
        uniqueViews: 0,
        uniqueMenuClicks: 0,
        uniqueDirectionsClicks: 0,
        uniqueWebsiteClicks: 0,
        uniqueShares: 0,
      },
    );

    // Override favorites count with actual current favorites
    totals.favorites = currentFavoritesCount;

    return NextResponse.json({
      truckCount: truckIds.length,
      period: { days, startDate: startDate.toISOString() },
      totals,
      daily: summary || [],
    });
  } catch (error) {
    logError('Unexpected error in analytics summary API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
