const CANONICAL_WEEKDAYS = new Map<string, string>([
  ['sunday', 'sunday'],
  ['sun', 'sunday'],
  ['monday', 'monday'],
  ['mon', 'monday'],
  ['tuesday', 'tuesday'],
  ['tue', 'tuesday'],
  ['tues', 'tuesday'],
  ['wednesday', 'wednesday'],
  ['wed', 'wednesday'],
  ['weds', 'wednesday'],
  ['thursday', 'thursday'],
  ['thu', 'thursday'],
  ['thurs', 'thursday'],
  ['friday', 'friday'],
  ['fri', 'friday'],
  ['saturday', 'saturday'],
  ['sat', 'saturday'],
]);

export function canonicalizeWeekday(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return CANONICAL_WEEKDAYS.get(value.toLowerCase().trim()) ?? null;
}

export function hasCanonicalWeekdaySet(days: unknown): days is string[] {
  return (
    Array.isArray(days) &&
    days.length > 0 &&
    days.every((day) => canonicalizeWeekday(day) !== null)
  );
}

export function normalizeWeekdaySet(days: unknown): string[] | null {
  if (!hasCanonicalWeekdaySet(days)) return null;
  return [...new Set(days.map((day) => canonicalizeWeekday(day)!))];
}
