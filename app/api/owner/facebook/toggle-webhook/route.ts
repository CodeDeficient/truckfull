import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { decryptFacebookBusinessToken } from '@/lib/facebook/businessTokenCrypto';
import { subscribePageToFeed, unsubscribeAppFromPage } from '@/lib/facebook/pageSubscriptions';
import { updateWebhookState } from '@/lib/facebook/pageConnectionService';
import { logError, logMessage } from '@/lib/logging';

interface ToggleWebhookBody {
  truckId: string;
  enabled: boolean;
}

async function parseToggleWebhookBody(request: NextRequest): Promise<ToggleWebhookBody> {
  const body = (await request.json()) as { truckId: unknown; enabled: unknown };
  const { truckId, enabled } = body;

  if (!truckId || typeof truckId !== 'string' || typeof enabled !== 'boolean') {
    throw new Error('Invalid request body');
  }

  return { truckId, enabled };
}

async function verifyTruckOwnership(
  userId: string,
  truckId: string,
): Promise<{ valid: boolean; facebookPageId: string | null }> {
  const { data: truck, error: truckError } = await getSupabaseAdmin()
    .from('food_trucks')
    .select('id, facebook_page_id')
    .eq('id', truckId)
    .eq('owner_id', userId)
    .single();

  if (truckError || !truck) {
    if (truckError) {
      logError('Failed to verify truck ownership:', truckError);
    }
    return { valid: false, facebookPageId: null };
  }

  return { valid: true, facebookPageId: truck.facebook_page_id ?? null };
}

async function getPageAccessToken(
  supabase: SupabaseClient,
  userId: string,
  facebookPageId: string,
  secret: string,
): Promise<string | null> {
  const { data: page, error } = await supabase
    .from('facebook_pages')
    .select('page_access_token')
    .eq('user_id', userId)
    .eq('facebook_page_id', facebookPageId)
    .maybeSingle();

  if (error || !page?.page_access_token) {
    if (error) {
      logError('Failed to load stored Facebook page token:', error);
    }
    return null;
  }

  try {
    return decryptFacebookBusinessToken(page.page_access_token, secret);
  } catch (error) {
    logError('Failed to decrypt stored Facebook page token:', error);
    return null;
  }
}

async function syncWebhookSubscription(args: {
  supabase: SupabaseClient;
  userId: string;
  facebookPageId: string;
  enabled: boolean;
}): Promise<{ success: boolean; error: string | null }> {
  const appSecret = process.env.FACEBOOK_BUSINESS_APP_SECRET;

  if (!appSecret) {
    return { success: false, error: 'Facebook business app is not configured' };
  }

  const pageAccessToken = await getPageAccessToken(
    args.supabase,
    args.userId,
    args.facebookPageId,
    appSecret,
  );

  if (!pageAccessToken) {
    return {
      success: false,
      error: 'Connected Facebook Page token is unavailable. Reconnect the page and try again.',
    };
  }

  if (args.enabled) {
    try {
      await subscribePageToFeed({
        pageId: args.facebookPageId,
        pageAccessToken,
      });
      return { success: true, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      logError('Failed to subscribe app to Facebook page feed:', { message, pageId: args.facebookPageId });
      return { success: false, error: 'Failed to enable Facebook webhook subscription' };
    }
  }

  try {
    await unsubscribeAppFromPage({
      pageId: args.facebookPageId,
      pageAccessToken,
    });
    return { success: true, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    logError('Failed to unsubscribe app from Facebook page feed:', { message, pageId: args.facebookPageId });
    return { success: false, error: 'Failed to disable Facebook webhook subscription' };
  }
}

async function rollbackSubscription(args: {
  supabase: SupabaseClient;
  userId: string;
  facebookPageId: string;
}): Promise<void> {
  const appSecret = process.env.FACEBOOK_BUSINESS_APP_SECRET;

  if (!appSecret) {
    logError('Cannot roll back Facebook subscription: app credentials missing');
    return;
  }

  const pageAccessToken = await getPageAccessToken(
    args.supabase,
    args.userId,
    args.facebookPageId,
    appSecret,
  );

  if (!pageAccessToken) {
    logError('Cannot roll back Facebook subscription: page token unavailable');
    return;
  }

  try {
    await unsubscribeAppFromPage({
      pageId: args.facebookPageId,
      pageAccessToken,
    });
    logMessage('Rolled back Facebook page subscription after DB update failure', {
      pageId: args.facebookPageId,
    });
  } catch (error) {
    logError('Failed to roll back Facebook page subscription', {
      pageId: args.facebookPageId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
  }
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

    let body: ToggleWebhookBody;
    try {
      body = await parseToggleWebhookBody(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Invalid request body') {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { truckId, enabled } = body;

    const ownership = await verifyTruckOwnership(user.id, truckId);
    if (!ownership.valid) {
      return NextResponse.json({ error: 'Truck not found or unauthorized' }, { status: 403 });
    }

    if (!ownership.facebookPageId) {
      return NextResponse.json(
        { error: 'Connect a Facebook Page before enabling automatic updates' },
        { status: 409 },
      );
    }

    const subscriptionResult = await syncWebhookSubscription({
      supabase,
      userId: user.id,
      facebookPageId: ownership.facebookPageId,
      enabled,
    });

    if (subscriptionResult.error) {
      return NextResponse.json({ error: subscriptionResult.error }, { status: 500 });
    }

    const result = await updateWebhookState(supabase, truckId, user.id, enabled);

    if (result.error) {
      await rollbackSubscription({
        supabase,
        userId: user.id,
        facebookPageId: ownership.facebookPageId,
      });

      return NextResponse.json({ error: result.error ?? 'Failed to update webhook sync' }, { status: 500 });
    }

    if (result.conflict) {
      return NextResponse.json(
        { error: 'Webhook state already changed, please refresh and try again' },
        { status: 409 },
      );
    }

    logMessage('Webhook sync updated successfully', { truckId, userId: user.id, enabled });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Error toggling webhook sync:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
