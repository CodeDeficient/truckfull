export interface TimezoneSourceRow {
  id: string;
  timezone?: string | null;
}

export function needsTimezoneBackfill(row: Record<string, unknown>): boolean {
  return !('timezone' in row);
}

export function selectTrucksNeedingTimezoneBackfill<T extends Record<string, unknown>>(
  trucks: readonly T[],
): T[] {
  return trucks.filter((truck) => needsTimezoneBackfill(truck));
}
