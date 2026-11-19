'use client';

import type { FoodTruckDomain } from '@/lib/types';
import { Drawer } from 'vaul';
import BottomSheetContent from './BottomSheetContent';

export default function MobileBottomSheet({
  currentRoute,
  isSheetOpen,
  setIsSheetOpen,
  loading,
  error,
  filteredTrucks,
  fetchTrucks,
  isClient,
  userLocation,
  onTruckSelect,
  onAuthRequired,
  selectedCluster,
  onCloseCluster,
  onTruckMapSelect,
  detailTruck,
  onCloseDetail,
  onCloseAll,
  radiusMiles,
}: {
  currentRoute: string;
  isSheetOpen: boolean;
  setIsSheetOpen: (open: boolean) => void;
  loading: boolean;
  error: string | null;
  filteredTrucks: FoodTruckDomain[];
  fetchTrucks: () => void;
  isClient: boolean;
  userLocation?: { lat: number; lng: number } | null;
  onTruckSelect?: (truck: FoodTruckDomain) => void;
  onAuthRequired?: () => void;
  selectedCluster?: { id: number; trucks: FoodTruckDomain[] } | null;
  onCloseCluster?: () => void;
  onTruckMapSelect?: (truck: FoodTruckDomain) => void;
  detailTruck?: FoodTruckDomain | null;
  onCloseDetail?: () => void;
  onCloseAll?: () => void;
  radiusMiles?: number;
}) {
  if (currentRoute !== 'near-me') {
    return null;
  }

  return (
    <Drawer.Root open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-transparent pointer-events-none" />
        <Drawer.Content className="bg-zinc-900 rounded-t-3xl fixed bottom-0 left-0 right-0 z-20 flex-shrink-0 mobile-bottom-sheet overflow-hidden">
          <div className="w-12 h-1.5 bg-white/20 mx-auto rounded-full cursor-grab mobile-drawer-handle" />
          <div
            className="mobile-bottom-sheet-content max-h-[50vh] min-h-0 flex flex-col"
            data-vaul-no-drag
          >
            <BottomSheetContent
              loading={loading}
              error={error}
              trucks={filteredTrucks}
              fetchTrucks={fetchTrucks}
              isClient={isClient}
              userLocation={userLocation}
              onTruckSelect={onTruckSelect}
              onTruckMapSelect={onTruckMapSelect}
              onAuthRequired={onAuthRequired}
              selectedCluster={selectedCluster}
              onCloseCluster={onCloseCluster}
              detailTruck={detailTruck}
              onCloseDetail={onCloseDetail}
              onCloseAll={onCloseAll}
              radiusMiles={radiusMiles}
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
