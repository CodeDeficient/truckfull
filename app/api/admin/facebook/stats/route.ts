import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyAdminAccess } from '@/lib/auth/authHelpers';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const hasAdminAccess = await verifyAdminAccess(request);
  if (!hasAdminAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const [postsResult, statusResult, pagesResult] = await Promise.all([
    supabase.from('facebook_posts').select('id', { count: 'exact', head: true }),
    supabase.rpc('get_facebook_posts_count_by_status'),
    supabase
      .from('food_trucks')
      .select('id', { count: 'exact', head: true })
      .not('facebook_page_id', 'is', null),
  ]);

  if (postsResult.error) {
    return NextResponse.json({ error: postsResult.error.message }, { status: 500 });
  }

  if (statusResult.error) {
    return NextResponse.json({ error: statusResult.error.message }, { status: 500 });
  }

  if (pagesResult.error) {
    return NextResponse.json({ error: pagesResult.error.message }, { status: 500 });
  }

  const postsByStatus: Record<string, number> = {
    pending: 0,
    processed: 0,
    pending_review: 0,
    rejected: 0,
    failed: 0,
  };

  const statusData = statusResult.data as { status: string; count: number }[] | null;
  if (statusData) {
    for (const row of statusData) {
      if (row.status in postsByStatus) {
        postsByStatus[row.status] = Number(row.count);
      }
    }
  }

  return NextResponse.json({
    totalPosts: postsResult.count ?? 0,
    postsByStatus,
    connectedPages: pagesResult.count ?? 0,
  });
}
