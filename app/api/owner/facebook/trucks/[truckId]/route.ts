import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logError, logMessage } from '@/lib/logging';
import { WEBHOOK_ENABLED_COLUMN } from '@/lib/facebook/webhookColumn';

export async function GET(
  request: NextRequest,
  { params }: { params: { truckId: string } },
): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { truckId } = await params;

    if (!truckId) {
      return NextResponse.json({ error: 'Truck ID is required' }, { status: 400 });
    }

    const { data: truck, error: truckError } = await getSupabaseAdmin()
      .from('food_trucks')
      .select(
        `id, facebook_page_id, facebook_page_name, ${WEBHOOK_ENABLED_COLUMN}, facebook_last_sync`,
      )
      .eq('id', truckId)
      .eq('owner_id', user.id)
      .single();

    if (truckError) {
      logError('Failed to fetch truck Facebook connection:', truckError);
      return NextResponse.json({ error: 'Truck not found' }, { status: 404 });
    }

    logMessage('Facebook connection fetched successfully', { truckId, userId: user.id });

    return NextResponse.json({ truck });
  } catch (error) {
    logError('Error fetching Facebook connection:', error);
    const message = error instanceof Error ? error.message : 'unknown_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
