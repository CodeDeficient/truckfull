import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createPortalSession } from '@/lib/stripe/checkout';
import { isPortalEligible } from '@/lib/subscription/trialState';
import { logError } from '@/lib/logging';

export const runtime = 'nodejs';

export async function POST() {
  try {
    // Get current user from cookies (server-side)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logError('Auth error in create-portal:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier, stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single();

    // Portal access requires an active Stripe subscription. A customer ID
    // alone does not grant access (trial-only users, #1305).
    if (profileError || !profile || !profile.stripe_customer_id) {
      logError('Profile error or no customer ID:', profileError);
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    if (
      !isPortalEligible({
        tier: profile.subscription_tier ?? 'free',
        stripeCustomerId: profile.stripe_customer_id,
        stripeSubscriptionId: profile.stripe_subscription_id,
      })
    ) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    // Create portal session
    const result = await createPortalSession(profile.stripe_customer_id);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    logError('Error in create-portal route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
