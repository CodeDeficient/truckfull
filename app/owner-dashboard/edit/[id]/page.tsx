import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import EditTruckClient from './EditTruckClient';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyRoleFromCookies } from '@/lib/auth/authHelpers';
import { fromFoodTruckRow, fromDomainToFoodTruck } from '@/lib/mappers/domain';
import { logError } from '@/lib/logging';

// Ensure Node.js lambda on Vercel
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Props {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

export default async function EditTruckPage({ params }: Props) {
  // Await params (Next.js 15 requirement)
  const { id } = await params;

  // Owners or admins may access owner dashboard
  try {
    const { ok, userId, role } = await verifyRoleFromCookies(['food_truck_owner', 'admin']);

    if (!ok) {
      redirect('/unauthorized');
    }

    // Fetch the truck data using server client
    const { data: truck, error } = await getSupabaseAdmin()
      .from('food_trucks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !truck) {
      notFound(); // This will render the not-found page
    }

    // Check if the user owns this truck or is an admin
    if (role !== 'admin' && (typeof userId !== 'string' || truck.owner_id !== userId)) {
      redirect('/unauthorized');
    }

    const foodTruck = fromDomainToFoodTruck(fromFoodTruckRow(truck));

    return <EditTruckClient truck={foodTruck} />;
  } catch (error) {
    // Log the error for debugging
    logError('Error loading truck for editing:', error);
    // Defensive fallback: if verification fails unexpectedly, open the auth modal
    redirect('/?auth=open');
  }
}
