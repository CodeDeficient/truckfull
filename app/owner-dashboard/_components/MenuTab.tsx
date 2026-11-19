import MenuManagementSection from '@/components/owner/MenuManagementSection';
import type { FoodTruckDomain } from '@/lib/types';

interface MenuTabProps {
  readonly trucks: ReadonlyArray<FoodTruckDomain>;
}

export function MenuTab({ trucks }: MenuTabProps) {
  // Use the first truck for menu management
  // In a more advanced implementation, you might allow selecting which truck's menu to edit
  const truck = trucks?.[0];

  return (
    <div className="space-y-6">
      {truck ? (
        <MenuManagementSection truckId={truck.id} />
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          No food trucks found. Please add a truck before managing menu items.
        </div>
      )}
    </div>
  );
}
