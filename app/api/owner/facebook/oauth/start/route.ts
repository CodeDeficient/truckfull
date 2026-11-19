import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

import { buildFacebookBusinessOAuthUrl } from '@/lib/facebook/businessOAuth';
import { createSignedFacebookBusinessState } from '@/lib/facebook/businessOAuthState';
import { resolvePublicOrigin } from '@/lib/http/publicOrigin';
import { logError } from '@/lib/logging';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const NONCE_COOKIE_NAME = 'fb_business_oauth_nonce';
const STATE_MAX_AGE_SECONDS = 600;
const DEFAULT_RETURN_PATH = '/owner-dashboard/facebook';

function buildErrorRedirect(origin: string, path: string, errorCode: string): string {
  const url = new URL(path, origin);
  url.searchParams.set('facebookBusinessStatus', 'error');
  url.searchParams.set('facebookBusinessError', errorCode);
  return url.toString();
}

function isValidReturnPath(path: string): boolean {
  if (path.includes('%') || path.includes('..')) {
    return false;
  }

  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
    return false;
  }

  const normalizedPath = new URL(path, 'http://localhost').pathname;
  return normalizedPath.startsWith('/owner-dashboard');
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const rawReturnPath = request.nextUrl.searchParams.get('returnPath') ?? DEFAULT_RETURN_PATH;
    const returnPath = isValidReturnPath(rawReturnPath) ? rawReturnPath : DEFAULT_RETURN_PATH;

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appId = process.env.FACEBOOK_BUSINESS_APP_ID;
    const stateSecret = process.env.FACEBOOK_BUSINESS_APP_SECRET;

    if (!appId || !stateSecret) {
      logError('Facebook business OAuth start missing required env vars', {
        hasAppId: Boolean(appId),
        hasStateSecret: Boolean(stateSecret),
      });
      return NextResponse.redirect(
        buildErrorRedirect(resolvePublicOrigin(request.nextUrl.origin), returnPath, 'oauth_not_configured'),
      );
    }

    const truckId = request.nextUrl.searchParams.get('truckId') ?? undefined;
    const nonce = randomUUID();
    const issuedAt = Math.floor(Date.now() / 1000);

    const signedState = createSignedFacebookBusinessState(
      {
        userId: user.id,
        returnPath,
        truckId,
        nonce,
        issuedAt,
      },
      stateSecret,
    );

    const redirectUri = `${resolvePublicOrigin(request.nextUrl.origin)}/api/owner/facebook/oauth/callback`;
    const oauthUrl = buildFacebookBusinessOAuthUrl({
      appId,
      redirectUri,
      state: signedState,
    });

    const response = NextResponse.redirect(oauthUrl);
    response.cookies.set(NONCE_COOKIE_NAME, nonce, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/owner/facebook/oauth',
      maxAge: STATE_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    logError('Failed to start Facebook business OAuth', error);
    return NextResponse.json({ error: 'Failed to start Facebook business OAuth' }, { status: 500 });
  }
}
