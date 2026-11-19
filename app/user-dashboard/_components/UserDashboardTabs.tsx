import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/lib/admin/sharedAdminImports';
import { Truck } from 'lucide-react';
import { TruckSummaryCard } from '@/components/dashboard/TruckSummaryCard';
import * as React from 'react';

interface FoodTruck {
  id: string;
  slug?: string;
  name: string;
  cuisine_type: string[];
  current_location?: { address?: string };
  average_rating?: number;
  review_count?: number;
}

interface UserDashboardTabsProps {
  readonly favoriteTrucks: readonly FoodTruck[];
  readonly onViewTruck: (path: string) => void;
}

export function UserDashboardTabs({ favoriteTrucks, onViewTruck }: UserDashboardTabsProps) {
  return (
    <Tabs defaultValue="favorites" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="favorites">Favorite Trucks</TabsTrigger>
        <TabsTrigger value="profile">Profile</TabsTrigger>
      </TabsList>

      <TabsContent value="favorites" className="space-y-6">
        <h2 className="text-lg font-semibold">Your Favorite Food Trucks</h2>

        {favoriteTrucks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="text-lg font-medium mb-2">No favorite trucks yet</CardTitle>
                <p className="text-muted-foreground mb-4">
                  Start exploring trucks and save your favorites.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {favoriteTrucks.map((truck) => (
              <TruckSummaryCard
                key={truck.id}
                id={truck.id}
                name={truck.name}
                cuisine={truck.cuisine_type}
                address={truck.current_location?.address ?? undefined}
                averageRating={truck.average_rating ?? undefined}
                reviewCount={truck.review_count ?? undefined}
                viewLabel="View"
                onView={() => {
                  onViewTruck(`/${truck.slug ?? truck.id}`);
                }}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Profile Info</CardTitle>
            <CardDescription>Manage your profile details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <p>Profile management coming soon...</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
