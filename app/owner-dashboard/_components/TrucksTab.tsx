import { Card, CardContent, CardTitle, Button } from '@/lib/admin/sharedAdminImports';
import { TruckSummaryWithMenuCard } from '@/components/dashboard/TruckSummaryWithMenuCard';
import { Truck } from 'lucide-react';
import type { FoodTruckDomain } from '@/lib/types';

interface TrucksTabProps {
  readonly trucks: ReadonlyArray<FoodTruckDomain>;
  readonly onCreate: () => void;
  readonly onEdit: (id: string | number) => void;
}

export function TrucksTab({ trucks, onCreate, onEdit }: TrucksTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">My Food Trucks</h2>
        <Button onClick={onCreate}>
          <Truck className="h-4 w-4 mr-2" />
          Add New Truck
        </Button>
      </div>

      {trucks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="text-lg font-medium mb-2">No trucks registered</CardTitle>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first food truck to the platform.
              </p>
              <Button onClick={onCreate}>Add Your First Truck</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {trucks.map((t) => (
            <TruckSummaryWithMenuCard
              key={t.id}
              id={t.id}
              name={t.name}
              cuisine={t.cuisine_type}
              address={t.current_location?.address ?? undefined}
              averageRating={t.average_rating ?? undefined}
              reviewCount={t.review_count ?? undefined}
              verificationStatus={t.verification_status ?? undefined}
              qualityScore={t.data_quality_score ?? undefined}
              showEdit
              showMenu
              menuItems={t.menu_items ?? []}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
