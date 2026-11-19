import { FoodTruckService } from '@/lib/supabase';
import { TruckListClient } from './_components/TruckListClient';
import { AddTruckButton } from './_components/AddTruckButton';

export const dynamic = 'force-dynamic';

export default async function FoodTrucksPage() {
  // Fetch initial data server-side
  const result = await FoodTruckService.getAllTrucks(20, 0);

  const initialTrucks = 'error' in result ? [] : result.trucks;
  const initialError = 'error' in result ? result.error : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Food Truck Management</h1>
        <div className="flex gap-2">
          <AddTruckButton />
        </div>
      </div>

      <TruckListClient initialTrucks={initialTrucks} initialError={initialError} />
    </div>
  );
}
