import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { decryptFacebookBusinessToken } from '@/lib/facebook/businessTokenCrypto';
import { getPagePosts } from '@/lib/facebook/graphApi';
import { processFacebookPost, type PostData } from '@/lib/services/postProcessor';
import { normalizeTimestamp } from '@/lib/webhooks/normalizeTimestamp';
import { logError, logMessage } from '@/lib/logging';

interface SyncPostsBody {
  truckId: string;
  limit?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as SyncPostsBody;
    const { truckId } = body;
    const limit = Math.min(Math.max(1, body.limit ?? 10), 50);

    if (!truckId) {
      return NextResponse.json({ error: 'truckId is required' }, { status: 400 });
    }

    const { data: truck, error: truckError } = await getSupabaseAdmin()
      .from('food_trucks')
      .select('id, owner_id, facebook_page_id')
      .eq('id', truckId)
      .single();

    if (truckError || !truck) {
      return NextResponse.json({ error: 'Truck not found' }, { status: 404 });
    }

    if (truck.owner_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!truck.facebook_page_id) {
      return NextResponse.json({ error: 'No Facebook page connected' }, { status: 409 });
    }

    const appSecret = process.env.FACEBOOK_BUSINESS_APP_SECRET;
    if (!appSecret) {
      return NextResponse.json({ error: 'Facebook Business not configured' }, { status: 500 });
    }

    const { data: page, error: pageError } = await supabase
      .from('facebook_pages')
      .select('page_access_token')
      .eq('user_id', user.id)
      .eq('facebook_page_id', truck.facebook_page_id)
      .maybeSingle();

    if (pageError || !page?.page_access_token) {
      logError('Failed to load page token for sync', pageError);
      return NextResponse.json(
        { error: 'Page token unavailable. Reconnect the page.' },
        { status: 500 },
      );
    }

    let pageAccessToken: string;
    try {
      pageAccessToken = decryptFacebookBusinessToken(page.page_access_token, appSecret);
    } catch (error) {
      logError('Failed to decrypt page token for sync', error);
      return NextResponse.json({ error: 'Failed to decrypt page token' }, { status: 500 });
    }

    const posts = await getPagePosts(truck.facebook_page_id, pageAccessToken, limit);

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        synced: 0,
        skipped: 0,
        posts: [],
        syncedAt: new Date().toISOString(),
      });
    }

    let synced = 0;
    let skipped = 0;
    const syncedPosts: Array<{ facebookPostId: string; message: string | null }> = [];
    const processingPromises: Array<Promise<void>> = [];

    for (const post of posts) {
      const createdTime = normalizeTimestamp(post.created_time);
      if (!createdTime) {
        skipped++;
        logError('Skipping synced post with invalid created_time', {
          postId: post.id,
          truckId,
        });
        continue;
      }

      const { error: insertError } = await supabase.from('facebook_posts').insert({
        truck_id: truckId,
        facebook_post_id: post.id,
        message: post.message ?? null,
        raw_text: post.message ?? null,
        created_time: createdTime,
        source: 'backfill',
        status: 'pending',
        raw_payload: JSON.stringify(post),
      });

      if (insertError) {
        if (insertError.code === '23505') {
          skipped++;
          continue;
        }
        logError('Failed to insert synced post', {
          postId: post.id,
          truckId,
          error: insertError.message,
        });
        continue;
      }

      synced++;
      syncedPosts.push({
        facebookPostId: post.id,
        message: post.message ?? null,
      });

      const postData: PostData = {
        post_id: post.id,
        message: post.message,
        full_picture: post.full_picture,
        created_time: createdTime,
      };

      processingPromises.push(
        processFacebookPost(truckId, post.id, postData)
          .then((result) => {
            logMessage('Synced post processing completed', {
              truckId,
              facebookPostId: post.id,
              status: result.status,
              updatedFields: result.updatedFields,
            });
          })
          .catch((error) => {
            logError('Synced post processing failed', {
              truckId,
              facebookPostId: post.id,
              error: error instanceof Error ? error.message : 'unknown',
            });
          }),
      );
    }

    await Promise.allSettled(processingPromises);

    logMessage('Facebook posts synced via Graph API', {
      truckId,
      synced,
      skipped,
      total: posts.length,
    });

    return NextResponse.json({
      synced,
      skipped,
      posts: syncedPosts,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    logError('Error syncing Facebook posts', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
