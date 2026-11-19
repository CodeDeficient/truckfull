import { describe, it, expect } from '@jest/globals';
import type { FoodTruckDomain } from '@/lib/types';

const minimalTruck = { id: 'truck-1' } as FoodTruckDomain;

describe('buildTruckSelectSideEffects', () => {
  it('returns state updates that open the bottom sheet detail view', async () => {
    const { buildTruckSelectSideEffects } = await import(
      '@/app/@mobile/_lib/handleTruckSelect'
    );

    const result = buildTruckSelectSideEffects(minimalTruck);

    expect(result.selectedTruckId).toBe('truck-1');
    expect(result.sheetDetailTruck).toBe(minimalTruck);
    expect(result.isSheetOpen).toBe(true);
    expect(result.listState).toBe('collapsed');
    expect(result.userManuallyClosed).toBe(true);
  });
});
