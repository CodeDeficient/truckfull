// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth/authHelpers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';

export async function GET(request: NextRequest) {
  const hasAdminAccess = await verifyAdminAccess(request);
  if (!hasAdminAccess) {
    return NextResponse.json({ success: false, error: 'Unauthorized access' }, { status: 401 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get total food trucks
    const { count: totalFoodTrucks, error: trucksError } = await supabaseAdmin
      .from('food_trucks')
      .select('*', { count: 'exact', head: true });

    // Get pending verifications
    const { count: pendingVerifications, error: pendingError } = await supabaseAdmin
      .from('food_trucks')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending');

    // Get failed processing queue items
    const { count: failedProcessingQueueItemsCount, error: failedQueueError } = await supabaseAdmin
      .from('data_processing_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    // Get data quality stats
    const { data: qualityData, error: qualityError } = await supabaseAdmin
      .from('food_trucks')
      .select('data_quality_score, verification_status')
      .limit(1000);

    if (trucksError || pendingError || failedQueueError || qualityError) {
      throw new Error('Failed to fetch dashboard data');
    }

    // Calculate data quality statistics
    const total_trucks = qualityData?.length ?? 0;
    const scores = qualityData?.map((truck) => truck.data_quality_score ?? 0) ?? [];
    const avg_quality_score =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const high_quality_count =
      qualityData?.filter((truck) => (truck.data_quality_score ?? 0) >= 80).length ?? 0;
    const medium_quality_count =
      qualityData?.filter(
        (truck) => (truck.data_quality_score ?? 0) >= 50 && (truck.data_quality_score ?? 0) < 80,
      ).length ?? 0;
    const low_quality_count =
      qualityData?.filter((truck) => (truck.data_quality_score ?? 0) < 50).length ?? 0;

    const verified_count =
      qualityData?.filter((truck) => truck.verification_status === 'verified').length ?? 0;
    const pending_count =
      qualityData?.filter((truck) => truck.verification_status === 'pending').length ?? 0;
    const flagged_count =
      qualityData?.filter((truck) => truck.verification_status === 'flagged').length ?? 0;

    const dataQualityStats = {
      total_trucks,
      avg_quality_score,
      high_quality_count,
      medium_quality_count,
      low_quality_count,
      verified_count,
      pending_count,
      flagged_count,
    };

    return NextResponse.json({
      totalFoodTrucks: totalFoodTrucks ?? 0,
      pendingVerifications: pendingVerifications ?? 0,
      failedProcessingQueueItemsCount: failedProcessingQueueItemsCount ?? 0,
      dataQualityStats,
    });
  } catch (error) {
    logError('Dashboard API error:', error);
    return NextResponse.json({
      totalFoodTrucks: 0,
      pendingVerifications: 0,
      failedProcessingQueueItemsCount: 0,
      dataQualityStats: {
        total_trucks: 0,
        avg_quality_score: 0,
        high_quality_count: 0,
        medium_quality_count: 0,
        low_quality_count: 0,
        verified_count: 0,
        pending_count: 0,
        flagged_count: 0,
      },
      error: 'Some data may be unavailable',
    });
  }
}
