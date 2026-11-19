import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { decryptFacebookBusinessToken } from '@/lib/facebook/businessTokenCrypto';
import { FACEBOOK_GRAPH_API_VERSION } from '@/lib/facebook/constants';
import { logError } from '@/lib/logging';
import { getBusinessAuthState } from '@/lib/facebook/businessAuthStatus';
import { EXTERNAL_API_TIMEOUT_MS } from '@/lib/supabase/fetchWithTimeout';

interface FacebookAccountsResponse {
  data: Array<{
    id: string;
    name: string;
    picture?: { data?: { url?: string } };
  }>;
  paging?: {
    next?: string;
  };
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const businessAppId = process.env.FACEBOOK_BUSINESS_APP_ID;
    const businessAppSecret = process.env.FACEBOOK_BUSINESS_APP_SECRET;
    const nowIso = new Date().toISOString();

    const hasBusinessAppId = typeof businessAppId === 'string' && businessAppId.length > 0;
    const hasBusinessAppSecret =
      typeof businessAppSecret === 'string' && businessAppSecret.length > 0;

    let authState = getBusinessAuthState({
      hasBusinessAppId,
      hasBusinessAppSecret,
      hasToken: false,
      tokenExpiresAt: null,
      nowIso,
    });

    if (authState.isMisconfigured) {
      logError('Facebook business OAuth env is incomplete', {
        hasBusinessAppId,
        hasBusinessAppSecret,
      });
    }

    if (!businessAppId || !businessAppSecret) {
      return NextResponse.json(
        { pages: [], needsBusinessAuth: true, authStatus: authState.authStatus },
        { status: 200 },
      );
    }

    const { data: businessToken, error: tokenError } = await supabase
      .from('facebook_business_tokens')
      .select('token_expires_at, encrypted_access_token')
      .eq('user_id', user.id)
      .eq('facebook_app_id', businessAppId)
      .maybeSingle();

    if (tokenError) {
      return NextResponse.json(
        { error: 'Failed to fetch Facebook business auth status' },
        { status: 500 },
      );
    }

    if (!businessToken) {
      return NextResponse.json(
        { pages: [], needsBusinessAuth: true, authStatus: 'missing' },
        { status: 200 },
      );
    }

    authState = getBusinessAuthState({
      hasBusinessAppId,
      hasBusinessAppSecret,
      hasToken: true,
      tokenExpiresAt: businessToken.token_expires_at,
      nowIso,
    });

    if (authState.needsBusinessAuth) {
      return NextResponse.json(
        { pages: [], needsBusinessAuth: true, authStatus: authState.authStatus },
        { status: 200 },
      );
    }

    const decryptedUserToken = decryptFacebookBusinessToken(
      businessToken.encrypted_access_token,
      businessAppSecret,
    );

    const accountsUrl = new URL(
      `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/me/accounts`,
    );
    accountsUrl.searchParams.set('access_token', decryptedUserToken);
    accountsUrl.searchParams.set('fields', 'id,name,picture{url}');
    accountsUrl.searchParams.set('limit', '100');

    const allPages: FacebookAccountsResponse['data'] = [];
    let nextUrl: string | undefined = accountsUrl.toString();

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        logError('Failed to fetch Facebook pages from Graph API', {
          status: response.status,
        });
        return NextResponse.json(
          { pages: [], needsBusinessAuth: true, authStatus: authState.authStatus },
          { status: 200 },
        );
      }

      const data = (await response.json()) as FacebookAccountsResponse;
      allPages.push(...(data.data ?? []));
      nextUrl = data.paging?.next;
    }

    const pages = allPages.map((page) => ({
      facebook_page_id: page.id,
      page_name: page.name,
      picture_url: page.picture?.data?.url ?? null,
    }));

    return NextResponse.json(
      {
        pages,
        needsBusinessAuth: false,
        authStatus: authState.authStatus,
      },
      { status: 200 },
    );
  } catch (error) {
    logError('Failed to fetch Facebook pages', error);
    return NextResponse.json({ error: 'Failed to load your Facebook pages' }, { status: 500 });
  }
}
