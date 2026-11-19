import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { decryptFacebookBusinessToken } from '@/lib/facebook/businessTokenCrypto';
import { unsubscribeAppFromPage } from '@/lib/facebook/pageSubscriptions';
import { logError, logMessage } from '@/lib/logging';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { truckId } = body as { truckId: string };

    if (!truckId) {
      return NextResponse.json({ error: 'Invalid request: truckId is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      logError('Authentication failed', authError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    const user = authData.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: truck, error: truckError } = await getSupabaseAdmin()
      .from('food_trucks')
      .select('owner_id, facebook_page_id')
      .eq('id', truckId)
      .single();

    if (truckError || !truck) {
      logError('Failed to fetch truck for ownership check', truckError);
      return NextResponse.json(
        { error: truckError ? 'Internal server error' : 'Not found' },
        { status: truckError ? 500 : 404 },
      );
    }

    if (truck.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this truck' }, { status: 403 });
    }

    const disconnectedPageId = truck.facebook_page_id;

    const { error: updateError } = await getSupabaseAdmin()
      .from('food_trucks')
      .update({
        facebook_page_id: null,
        facebook_page_name: null,
        facebook_auto_updates_enabled: false,
      })
      .eq('id', truckId);

    if (updateError) {
      logError('Failed to disconnect Facebook page from truck', updateError, {
        user: { id: user.id },
        tags: { truckId },
      });
      return NextResponse.json({ error: 'Unable to disconnect Facebook page' }, { status: 500 });
    }

    if (disconnectedPageId) {
      const appSecret = process.env.FACEBOOK_BUSINESS_APP_SECRET;

      if (appSecret) {
        const { data: storedPage } = await supabase
          .from('facebook_pages')
          .select('page_access_token')
          .eq('user_id', user.id)
          .eq('facebook_page_id', disconnectedPageId)
          .maybeSingle();

        if (storedPage?.page_access_token) {
          try {
            const pageAccessToken = decryptFacebookBusinessToken(storedPage.page_access_token, appSecret);
            await unsubscribeAppFromPage({
              pageId: disconnectedPageId,
              pageAccessToken,
            });
            logMessage('Unsubscribed Facebook page webhook on disconnect', {
              pageId: disconnectedPageId,
            });
          } catch (error) {
            logError('Failed to unsubscribe Facebook page webhook on disconnect', error, {
              tags: { pageId: disconnectedPageId },
            });
          }
        }
      }

      const { error: deleteError } = await supabase
        .from('facebook_pages')
        .delete()
        .eq('user_id', user.id)
        .eq('facebook_page_id', disconnectedPageId);

      if (deleteError) {
        logError('Failed to delete Facebook page after disconnect', deleteError, {
          user: { id: user.id },
          tags: { truckId, pageId: disconnectedPageId },
        });
      }
    }

    const { error: deletePostsError } = await supabase
      .from('facebook_posts')
      .delete()
      .eq('truck_id', truckId);

    if (deletePostsError) {
      logError('Failed to delete Facebook posts after disconnect', deletePostsError, {
        user: { id: user.id },
        tags: { truckId },
      });
    }

    logMessage('Facebook page disconnected from truck', {
      userId: user.id,
      truckId,
      pageId: disconnectedPageId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Unexpected error disconnecting Facebook page from truck', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}
