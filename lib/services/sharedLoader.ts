export type SharedLoader<T> = () => Promise<T>;

interface SharedEntry<T> {
  readonly loadedAt: number;
  readonly value: Promise<T>;
}

export function createSharedLoader<T>(
  load: () => Promise<T>,
  maxAgeMs: number,
  now: () => number = Date.now,
): SharedLoader<T> {
  let entry: SharedEntry<T> | null = null;
  return (): Promise<T> => {
    const current = entry;
    if (current !== null && now() - current.loadedAt < maxAgeMs) return current.value;
    const value = load();
    const next: SharedEntry<T> = { loadedAt: now(), value };
    entry = next;
    value.catch(() => {
      if (entry === next) entry = null;
    });
    return value;
  };
}

export function freezeRows<T extends object>(rows: readonly T[]): readonly T[] {
  for (const row of rows) Object.freeze(row);
  return Object.freeze(rows);
}
