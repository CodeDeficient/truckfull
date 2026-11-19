export type EventSortMode = 'date' | 'az';

export interface SortableEventEntry {
  readonly key: string;
  readonly title: string;
  readonly date: string | null;
}

const NO_DATE = '9999-12-31';

function byTitle(a: SortableEventEntry, b: SortableEventEntry): number {
  return a.title.localeCompare(b.title, 'en-US', { sensitivity: 'base', numeric: true });
}

function byDate(a: SortableEventEntry, b: SortableEventEntry): number {
  return (a.date ?? NO_DATE).localeCompare(b.date ?? NO_DATE);
}

export function sortEventEntries<T extends SortableEventEntry>(
  entries: readonly T[],
  mode: EventSortMode,
): T[] {
  const primary = mode === 'az' ? byTitle : byDate;
  const secondary = mode === 'az' ? byDate : byTitle;
  return entries.toSorted((a, b) => primary(a, b) || secondary(a, b) || a.key.localeCompare(b.key));
}
