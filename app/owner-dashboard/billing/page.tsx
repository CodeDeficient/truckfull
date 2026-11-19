import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getFoundingMemberData } from '@/lib/content/metrics';
import EnhancedOwnerDashboardClient from '../_components/EnhancedOwnerDashboardClient';

// Ensure Node.js lambda on Vercel
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function OwnerDashboardBillingPage() {
  // Billing is open to every authenticated user regardless of tier or role —
  // it is the upgrade/renewal surface, so it must never gate on entitlement.
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error != undefined || user == undefined) {
      redirect('/?auth=open');
    }
  } catch {
    redirect('/?auth=open');
  }

  // Auth verified - render billing
  let foundingData: Awaited<ReturnType<typeof getFoundingMemberData>> | undefined;
  try {
    foundingData = await getFoundingMemberData();
  } catch {
    // Founding status unavailable - client falls back to standard pricing
  }
  return <EnhancedOwnerDashboardClient foundingData={foundingData} />;
}