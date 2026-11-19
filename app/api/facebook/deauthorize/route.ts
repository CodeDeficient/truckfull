/**
 * POST /api/facebook/deauthorize
 *
 * Facebook Deauthorization Callback
 *
 * Called by Facebook when a user removes the TruckFull app from their Facebook
 * settings. This unlinks the Facebook identity from the user's Supabase account
 * WITHOUT deleting the account.
 *
 * Facebook sends a signed_request containing the user's Facebook ID. We:
 * 1. Parse and verify the signed_request using our App Secret
 * 2. Look up the user via their Facebook identity
 * 3. Unlink the Facebook identity via the unlink_identity RPC
 * 4. If Facebook is the only auth method, block the unlink to prevent lockout
 *
 * @see app/api/facebook/deletion/route.ts — similar flow but deletes the account
 * @see https://developers.facebook.com/docs/app-events/best-practices#deauth
 */
import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimited, webhookLimiter, getClientIp } from '@/lib/middleware/rateLimit';
import { logError, logMessage } from '@/lib/logging';
import { parseSignedRequest } from '@/lib/facebook/parseSignedRequest';
import { findFacebookUser } from '@/lib/facebook/findFacebookUser';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'facebook-deauthorize' });
}

export async function POST(
  request: NextRequest,
  { params: _params }: { params: Promise<Record<string, string>> },
) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkRateLimited(`facebook-deauth:${ip}`, webhookLimiter);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rateLimitResult.retryAfter },
      { status: 429 },
    );
  }

   
  const appSecret = process.env.FACEBOOK_AUTH_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) {
    logError('Facebook deauthorize: FACEBOOK_AUTH_APP_SECRET or FACEBOOK_APP_SECRET not configured');
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

  const result = await findFacebookUser(facebookUserId);
  if (!result) {
    logMessage(`Facebook deauthorize: user ${facebookUserId} not found (already unlinked?)`);
    return NextResponse.json({ success: true });
  }

  const { user } = result;
  const userId = user.id;
  const facebookIdentity = user.identities?.find(
    (id) => id.provider === 'facebook' && id.identity_data?.sub === facebookUserId,
  );

  if (!facebookIdentity) {
    logMessage(`Facebook deauthorize: identity ${facebookUserId} not found on user ${userId}`);
    return NextResponse.json({ success: true });
  }

  const hasOtherProvider = Array.isArray(user.identities) && user.identities.length > 1;

  if (!hasOtherProvider) {
    logError('Facebook deauthorize blocked: user has no other auth method', {
      userId,
      facebookUserId,
    });
    return NextResponse.json(
      {
        error:
          'Facebook is your only login method. To disconnect Facebook, please add another login method (email/password or Google) first, or delete your account from Settings.',
      },
      { status: 400 },
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error: rpcError } = await supabaseAdmin.rpc('unlink_identity', {
    p_user_id: userId,
    p_provider: 'facebook',
    p_identity_id: facebookIdentity.identity_id,
  });

  if (rpcError) {
    logError('Failed to unlink Facebook identity via RPC', {
      userId,
      identityId: facebookIdentity.id,
      error: rpcError,
    });
    return NextResponse.json({ error: 'Failed to unlink Facebook' }, { status: 500 });
  }

  logMessage(`Facebook unlinked for user ${userId} via deauthorize callback`);
  return NextResponse.json({ success: true });
}
