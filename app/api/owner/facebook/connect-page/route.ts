import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  decryptFacebookBusinessToken,
  encryptFacebookBusinessToken,
} from '@/lib/facebook/businessTokenCrypto';
import {
  connectPageAndSubscribe,
  checkBusinessTokenScopes,
  updateWebhookState,
} from '@/lib/facebook/pageConnectionService';
import { FACEBOOK_GRAPH_API_VERSION } from '@/lib/facebook/constants';
import { logError, logMessage } from '@/lib/logging';
import { NextRequest, NextResponse } from 'next/server';
import { EXTERNAL_API_TIMEOUT_MS } from '@/lib/supabase/fetchWithTimeout';

interface ConnectPageRequestBody {
  truckId: string;
  pageId: string;
  pageName: string;
}

interface FacebookAccountsResponse {
  data: Array<{
    id: string;
    name: string;
    access_token: string;
    category?: string;
    tasks?: string[];
    picture?: { data?: { url?: string } };
    cover?: { source?: string };
    about?: string;
  }>;
  paging?: {
    next?: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    const { truckId, pageId, pageName } = body as ConnectPageRequestBody;

    if (!truckId) {
      return NextResponse.json({ error: 'Invalid request: truckId is required' }, { status: 400 });
    }

    if (!pageId) {
      return NextResponse.json({ error: 'Invalid request: pageId is required' }, { status: 400 });
    }

    if (!pageName) {
      return NextResponse.json({ error: 'Invalid request: pageName is required' }, { status: 400 });
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
      .select('owner_id')
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

    const businessAppId = process.env.FACEBOOK_BUSINESS_APP_ID;
    const businessAppSecret = process.env.FACEBOOK_BUSINESS_APP_SECRET;
    if (!businessAppId || !businessAppSecret) {
      return NextResponse.json({ error: 'Facebook Business not configured' }, { status: 500 });
    }

    const { data: businessToken, error: tokenError } = await supabase
      .from('facebook_business_tokens')
      .select('encrypted_access_token, token_expires_at, granted_scopes')
      .eq('user_id', user.id)
      .eq('facebook_app_id', businessAppId)
      .maybeSingle();

    if (tokenError || !businessToken) {
      logError('Failed to fetch business token for page connection', tokenError, {
        user: { id: user.id },
        tags: { truckId, pageId },
      });
      return NextResponse.json({ error: 'Facebook Business not authorized' }, { status: 403 });
    }

    const scopeCheck = checkBusinessTokenScopes(businessToken.granted_scopes ?? []);
    if (!scopeCheck.valid) {
      logError('Business token missing required scopes', {
        user: { id: user.id },
        tags: { truckId, pageId, missing: scopeCheck.missing },
      });
      return NextResponse.json(
        { error: 'Re-authorize Facebook to update permissions', needsReauth: true },
        { status: 403 },
      );
    }

    const decryptedUserToken = decryptFacebookBusinessToken(
      businessToken.encrypted_access_token,
      businessAppSecret,
    );

    const pageAccessToken = await fetchPageAccessToken(decryptedUserToken, pageId);

    if (!pageAccessToken) {
      logError('Facebook page not found in accounts list', undefined, {
        user: { id: user.id },
        tags: { truckId, pageId },
      });
      return NextResponse.json(
        { error: 'Page not found. Re-authorize Facebook Business to refresh your pages.' },
        { status: 403 },
      );
    }

    const encryptedPageToken = encryptFacebookBusinessToken(pageAccessToken, businessAppSecret);

    const { error: upsertError } = await supabase.from('facebook_pages').upsert(
      {
        user_id: user.id,
        facebook_page_id: pageId,
        page_name: pageName,
        page_access_token: encryptedPageToken,
        is_active: true,
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,facebook_page_id', ignoreDuplicates: false },
    );

    if (upsertError) {
      logError('Failed to persist Facebook page connection', upsertError, {
        user: { id: user.id },
        tags: { truckId, pageId },
      });
      return NextResponse.json({ error: 'Unable to connect Facebook page' }, { status: 500 });
    }

    const { data: updatedTruck, error: updateError } = await getSupabaseAdmin()
      .from('food_trucks')
      .update({
        facebook_page_id: pageId,
        facebook_page_name: pageName,
      })
      .eq('id', truckId)
      .select('id, facebook_page_id, facebook_page_name')
      .single();

    if (updateError) {
      logError('Failed to update truck with Facebook page connection', updateError, {
        user: { id: user.id },
        tags: { truckId, pageId },
      });
      return NextResponse.json({ error: 'Unable to connect Facebook page' }, { status: 500 });
    }

    logMessage('Facebook page connected to truck', {
      userId: user.id,
      truckId,
      pageId,
      pageName,
    });

    const subscriptionResult = await connectPageAndSubscribe({
      pageId,
      pageAccessToken,
      appId: businessAppId,
    });

    let autoUpdatesEnabled = false;

    if (subscriptionResult.error) {
      logError('Auto-subscribe failed after page connect', {
        pageId,
        truckId,
        error: subscriptionResult.error,
      });
    } else {
      logMessage('Auto-subscribe succeeded after page connect', {
        pageId,
        truckId,
        subscribed: subscriptionResult.subscribed,
        subscribedFields: subscriptionResult.subscribedFields,
      });
    }

    if (subscriptionResult.subscribed) {
      const stateResult = await updateWebhookState(supabase, truckId, user.id, true);
      if (stateResult.success) {
        autoUpdatesEnabled = true;
      } else if (stateResult.error) {
        logError('Failed to enable auto-updates after page connect', {
          pageId,
          truckId,
          error: stateResult.error,
        });
      }
    }

    return NextResponse.json({
      success: true,
      truck: updatedTruck,
      webhookSubscribed: subscriptionResult.subscribed,
      subscribedFields: subscriptionResult.subscribedFields,
      autoUpdatesEnabled,
    });
  } catch (error) {
    logError('Unexpected error connecting Facebook page to truck', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}

async function fetchPageAccessToken(
  userAccessToken: string,
  targetPageId: string,
): Promise<string | null> {
  const baseUrl = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/me/accounts`);
  baseUrl.searchParams.set('access_token', userAccessToken);
  baseUrl.searchParams.set('fields', 'id,name,access_token');
  baseUrl.searchParams.set('limit', '100');
  let nextUrl: string | undefined = baseUrl.toString();

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as FacebookAccountsResponse;

    const found = data.data?.find((page) => page.id === targetPageId);
    if (found) {
      return found.access_token;
    }

    nextUrl = data.paging?.next;
  }

  return null;
}
