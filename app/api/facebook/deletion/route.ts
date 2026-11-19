/**
 * POST /api/facebook/deletion
 *
 * Facebook Data Deletion Callback
 *
 * Called by Facebook when a user requests to delete their data through Facebook's
 * app settings. This is required for Facebook App Review compliance.
 *
 * Facebook sends a signed_request with user credentials. We:
 * 1. Parse and verify the signed_request
 * 2. Look up the user via their Facebook identity in auth.identities
 * 3. Delete the user from Supabase Auth
 * 4. Return a confirmation URL with a tracking code
 *
 * @see app/api/facebook/deauthorize/route.ts — similar flow but only unlinks identity
 * @see https://developers.facebook.com/docs/apps/delete-data
 */
import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimited, webhookLimiter, getClientIp } from '@/lib/middleware/rateLimit';
import { logError, logMessage } from '@/lib/logging';
import { parseSignedRequest } from '@/lib/facebook/parseSignedRequest';
import { findFacebookUser } from '@/lib/facebook/findFacebookUser';
import { resolveSiteUrl } from '@/lib/utils/siteUrl';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params: _params }: { params: Promise<Record<string, string>> },
) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkRateLimited(`facebook-deletion:${ip}`, webhookLimiter);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rateLimitResult.retryAfter },
      { status: 429 },
    );
  }

  const appSecret = process.env.FACEBOOK_AUTH_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) {
    logError(
      'Facebook auth app secret not configured (FACEBOOK_AUTH_APP_SECRET or FACEBOOK_APP_SECRET)',
      {},
    );
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  let signedRequest: string;
  try {
    const bodyText = await request.text();
    const params = new URLSearchParams(bodyText);
    const value = params.get('signed_request');
    if (!value) {
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 });
    }
    signedRequest = value;
  } catch {
    return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 });
  }

  const payload = parseSignedRequest(signedRequest, appSecret);
  if (!payload || !payload.user_id) {
    return NextResponse.json({ error: 'Invalid signed_request' }, { status: 400 });
  }

  const facebookUserId = payload.user_id;
  const supabaseAdmin = getSupabaseAdmin();

  let userId: string | null = null;
  try {
    const result = await findFacebookUser(facebookUserId);
    if (result) {
      userId = result.user.id;
    }
  } catch (error) {
    logError('Failed to look up Facebook user', { facebookUserId, error });
  }

  if (!userId) {
    logMessage('Facebook deletion callback: user not found, may already be deleted', {
      facebookUserId,
    });
  }

  const confirmationCode = crypto.randomUUID();

  if (userId) {
    try {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        logError('Failed to delete user via Facebook callback', {
          userId,
          facebookUserId,
          error: deleteError,
        });
        return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
      }

      logMessage('User deleted via Facebook Data Deletion Callback', {
        userId,
        facebookUserId,
        confirmationCode,
      });
    } catch (error) {
      logError('Unexpected error during Facebook callback deletion', {
        userId,
        facebookUserId,
        error,
      });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  const siteUrl = resolveSiteUrl(process.env);
  const confirmationUrl = `${siteUrl}/account-deleted?code=${confirmationCode}&status=confirmed`;

  return NextResponse.json({ url: confirmationUrl });
}
