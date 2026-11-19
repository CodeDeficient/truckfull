import { NextRequest, NextResponse } from 'next/server';

import { hasAllRequiredBusinessScopes } from '@/lib/facebook/businessOAuth';
import { verifySignedFacebookBusinessState } from '@/lib/facebook/businessOAuthState';
import { encryptFacebookBusinessToken } from '@/lib/facebook/businessTokenCrypto';
import { FACEBOOK_GRAPH_API_VERSION } from '@/lib/facebook/constants';
import { resolvePublicOrigin } from '@/lib/http/publicOrigin';
import { logError } from '@/lib/logging';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { EXTERNAL_API_TIMEOUT_MS } from '@/lib/supabase/fetchWithTimeout';

const NONCE_COOKIE_NAME = 'fb_business_oauth_nonce';
const STATE_MAX_AGE_SECONDS = 600;
const DEFAULT_RETURN_PATH = '/owner-dashboard/facebook';

interface FacebookTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

interface DebugTokenResponse {
  data?: {
    app_id?: string;
    is_valid?: boolean;
    user_id?: string;
    expires_at?: number;
    data_access_expires_at?: number;
    scopes?: string[];
  };
}

function buildErrorRedirect(origin: string, path: string, errorCode: string): string {
  const url = new URL(path, origin);
  url.searchParams.set('facebookBusinessStatus', 'error');
  url.searchParams.set('facebookBusinessError', errorCode);
  return url.toString();
}

function buildSuccessRedirect(origin: string, path: string, truckId?: string): string {
  const url = new URL(path, origin);
  url.searchParams.set('facebookBusinessStatus', 'success');
  if (truckId) {
    url.searchParams.set('facebookTruckId', truckId);
  }
  return url.toString();
}

function buildSuccessResponse(origin: string, path: string, truckId?: string): NextResponse {
  const response = NextResponse.redirect(buildSuccessRedirect(origin, path, truckId));
  response.cookies.set(NONCE_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/owner/facebook/oauth',
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = resolvePublicOrigin(request.nextUrl.origin);
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const providerError = request.nextUrl.searchParams.get('error');
  const providerErrorReason = request.nextUrl.searchParams.get('error_reason');
  const stateSecret = process.env.FACEBOOK_BUSINESS_APP_SECRET;
  const appId = process.env.FACEBOOK_BUSINESS_APP_ID;

  const verifiedStateForReturnPath =
    state && stateSecret
      ? verifySignedFacebookBusinessState(state, stateSecret, {
          maxAgeSeconds: STATE_MAX_AGE_SECONDS,
        })
      : null;
  const errorReturnPath =
    verifiedStateForReturnPath?.valid && verifiedStateForReturnPath.payload
      ? verifiedStateForReturnPath.payload.returnPath
      : DEFAULT_RETURN_PATH;

  if (providerError) {
    const mappedError =
      providerError === 'access_denied' || providerErrorReason === 'user_denied'
        ? 'oauth_exchange_failed'
        : 'callback_internal_error';
    return NextResponse.redirect(buildErrorRedirect(origin, errorReturnPath, mappedError));
  }

  if (!code || !state) {
    return NextResponse.redirect(
      buildErrorRedirect(origin, errorReturnPath, 'missing_code_or_state'),
    );
  }

  if (!stateSecret || !appId) {
    logError('Facebook business callback missing required env', {
      hasStateSecret: Boolean(stateSecret),
      hasAppId: Boolean(appId),
    });
    return NextResponse.redirect(
      buildErrorRedirect(origin, errorReturnPath, 'oauth_not_configured'),
    );
  }

  const verifiedState =
    verifiedStateForReturnPath ??
    verifySignedFacebookBusinessState(state, stateSecret, {
      maxAgeSeconds: STATE_MAX_AGE_SECONDS,
    });

  if (!verifiedState.valid || !verifiedState.payload) {
    return NextResponse.redirect(
      buildErrorRedirect(origin, errorReturnPath, verifiedState.error ?? 'invalid_state'),
    );
  }

  const statePayload = verifiedState.payload;
  const nonceFromCookie = request.cookies.get(NONCE_COOKIE_NAME)?.value;
  if (!nonceFromCookie || nonceFromCookie !== statePayload.nonce) {
    return NextResponse.redirect(
      buildErrorRedirect(origin, statePayload.returnPath, 'invalid_nonce'),
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(
        buildErrorRedirect(origin, statePayload.returnPath, 'unauthorized'),
      );
    }

    if (user.id !== statePayload.userId) {
      return NextResponse.redirect(
        buildErrorRedirect(origin, statePayload.returnPath, 'state_user_mismatch'),
      );
    }

    const redirectUri = `${origin}/api/owner/facebook/oauth/callback`;
    const tokenUrl = new URL(
      `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/oauth/access_token`,
    );
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', stateSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString(), {
      signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(
        buildErrorRedirect(origin, statePayload.returnPath, 'oauth_exchange_failed'),
      );
    }

    const tokenData = (await tokenResponse.json()) as FacebookTokenResponse;
    if (!tokenData.access_token) {
      return NextResponse.redirect(
        buildErrorRedirect(origin, statePayload.returnPath, 'missing_access_token'),
      );
    }

    const longLivedTokenUrl = new URL(
      `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/oauth/access_token`,
    );
    longLivedTokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedTokenUrl.searchParams.set('client_id', appId);
    longLivedTokenUrl.searchParams.set('client_secret', stateSecret);
    longLivedTokenUrl.searchParams.set('fb_exchange_token', tokenData.access_token);

    const longLivedTokenResponse = await fetch(longLivedTokenUrl.toString(), {
      signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!longLivedTokenResponse.ok) {
      return NextResponse.redirect(
        buildErrorRedirect(origin, statePayload.returnPath, 'long_lived_exchange_failed'),
      );
    }

    const longLivedTokenData = (await longLivedTokenResponse.json()) as FacebookTokenResponse;
    if (!longLivedTokenData.access_token) {
      return NextResponse.redirect(
        buildErrorRedirect(origin, statePayload.returnPath, 'missing_access_token'),
      );
    }

    const appAccessToken = `${appId}|${stateSecret}`;
    const debugUrl = new URL(
      `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/debug_token`,
    );
    debugUrl.searchParams.set('input_token', longLivedTokenData.access_token);
    debugUrl.searchParams.set('access_token', appAccessToken);

    const debugResponse = await fetch(debugUrl.toString(), {
      signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!debugResponse.ok) {
      return NextResponse.redirect(
        buildErrorRedirect(origin, statePayload.returnPath, 'token_validation_failed'),
      );
    }

    const debugData = (await debugResponse.json()) as DebugTokenResponse;
    const tokenMeta = debugData.data;

    if (!tokenMeta?.is_valid) {
      return NextResponse.redirect(
        buildErrorRedirect(origin, statePayload.returnPath, 'invalid_access_token'),
      );
    }

    if (tokenMeta.app_id !== appId) {
      return NextResponse.redirect(
        buildErrorRedirect(origin, statePayload.returnPath, 'app_mismatch'),
      );
    }

    if (!tokenMeta.user_id) {
      return NextResponse.redirect(
        buildErrorRedirect(origin, statePayload.returnPath, 'missing_facebook_user_id'),
      );
    }

    const grantedScopes = tokenMeta.scopes ?? [];
    const requiredScopeResult = hasAllRequiredBusinessScopes(grantedScopes);
    if (!requiredScopeResult.valid) {
      return NextResponse.redirect(
        buildErrorRedirect(origin, statePayload.returnPath, 'missing_scopes'),
      );
    }

    const encryptedAccessToken = encryptFacebookBusinessToken(
      longLivedTokenData.access_token,
      stateSecret,
    );

    const tokenExpiresAt = (() => {
      if (typeof tokenMeta.expires_at === 'number' && tokenMeta.expires_at > 0) {
        return new Date(tokenMeta.expires_at * 1000).toISOString();
      }

      if (longLivedTokenData.expires_in == null) {
        return null;
      }

      return new Date(Date.now() + longLivedTokenData.expires_in * 1000).toISOString();
    })();

    const dataAccessExpiresAt =
      typeof tokenMeta.data_access_expires_at === 'number' && tokenMeta.data_access_expires_at > 0
        ? new Date(tokenMeta.data_access_expires_at * 1000).toISOString()
        : null;

    const { error: tokenUpsertError } = await supabase.from('facebook_business_tokens').upsert(
      {
        user_id: user.id,
        facebook_user_id: tokenMeta.user_id,
        facebook_app_id: appId,
        granted_scopes: grantedScopes,
        token_type: longLivedTokenData.token_type ?? tokenData.token_type ?? 'bearer',
        token_expires_at: tokenExpiresAt,
        data_access_expires_at: dataAccessExpiresAt,
        encrypted_access_token: encryptedAccessToken,
        last_refreshed_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,facebook_app_id',
        ignoreDuplicates: false,
      },
    );

    if (tokenUpsertError) {
      logError('Failed to upsert facebook_business_tokens', {
        message: tokenUpsertError.message,
      });
      return NextResponse.redirect(
        buildErrorRedirect(origin, statePayload.returnPath, 'token_persist_failed'),
      );
    }

    return buildSuccessResponse(origin, statePayload.returnPath, statePayload.truckId);
  } catch (error) {
    logError('Unhandled Facebook business oauth callback error', error);
    return NextResponse.redirect(
      buildErrorRedirect(origin, statePayload.returnPath, 'callback_internal_error'),
    );
  }
}
