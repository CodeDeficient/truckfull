import { redirect } from 'next/navigation';
import { verifyOwnerAccessFromCookies } from '@/lib/auth/ownerAccessServer';
import EnhancedOwnerDashboardClient from '../../owner-dashboard/_components/EnhancedOwnerDashboardClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function Page() {
  // Same capability guard as the desktop page: owners/admins or entitled
  // (trial/paid/comped) users may enter; authenticated users without access
  // land on Billing.
  const access = await verifyOwnerAccessFromCookies();

  if (access.outcome === 'unauthenticated') {
    redirect('/?auth=open');
  }
  if (access.outcome === 'authenticated_without_access') {
    redirect('/owner-dashboard/billing');
  }

  return <EnhancedOwnerDashboardClient />;
}