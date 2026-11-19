import type { FoodTruckDomain } from '@/lib/types';

export type ListState = 'collapsed' | 'peek' | 'expanded';

export interface TruckSelectSideEffects {
  readonly selectedTruckId: string;
  readonly sheetDetailTruck: FoodTruckDomain;
  readonly isSheetOpen: boolean;
  readonly listState: ListState;
  readonly userManuallyClosed: boolean;
}

export function buildTruckSelectSideEffects(
  truck: FoodTruckDomain,
): TruckSelectSideEffects {
  return {
    selectedTruckId: truck.id,
    sheetDetailTruck: truck,
    isSheetOpen: true,
    listState: 'collapsed',
    userManuallyClosed: true,
  };
}
