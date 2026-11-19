export interface CollapsibleEvent {
  readonly id: string;
  readonly title: string;
  readonly city: string;
  readonly state: string;
  readonly locationAddress: string | null;
  readonly eventStartDate: string | null;
  readonly eventEndDate: string | null;
  readonly vettingScore?: number | null;
  readonly sourceUrl?: string | null;
  readonly isCanonical?: boolean;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function datesAreConsecutive(a: string, b: string): boolean {
  const da = new Date(`${a}T00:00:00Z`).getTime();
  const db = new Date(`${b}T00:00:00Z`).getTime();
  return Math.abs(db - da) === MS_PER_DAY;
}

function sameEventIdentity<T extends CollapsibleEvent>(a: T, b: T): boolean {
  return (
    a.title.toLowerCase().trim() === b.title.toLowerCase().trim() &&
    a.city.toLowerCase().trim() === b.city.toLowerCase().trim() &&
    (a.locationAddress ?? '') === (b.locationAddress ?? '')
  );
}

function sameDateIdentity<T extends CollapsibleEvent>(a: T, b: T): boolean {
  return (
    a.title.toLowerCase().trim() === b.title.toLowerCase().trim() &&
    a.city.toLowerCase().trim() === b.city.toLowerCase().trim() &&
    (a.eventStartDate ?? '') === (b.eventStartDate ?? '')
  );
}

export function pickBestDuplicate<T extends CollapsibleEvent>(a: T, b: T): T {
  const aCanonical = a.isCanonical ?? true;
  const bCanonical = b.isCanonical ?? true;
  if (aCanonical !== bCanonical) {
    return aCanonical ? a : b;
  }
  const aScore = a.vettingScore ?? 0;
  const bScore = b.vettingScore ?? 0;
  const best = aScore >= bScore ? a : b;
  const other = best === a ? b : a;
  const bestAddr = (best.locationAddress ?? '').trim();
  const otherAddr = (other.locationAddress ?? '').trim();
  let mergedAddress = bestAddr;
  if (otherAddr && !bestAddr.toLowerCase().includes(otherAddr.toLowerCase())) {
    mergedAddress = `${bestAddr} · ${otherAddr}`;
  }
  return {
    ...best,
    locationAddress: mergedAddress || null,
    sourceUrl: best.sourceUrl ?? other.sourceUrl,
  } as T;
}

export function collapseSameDateDuplicates<T extends CollapsibleEvent>(events: T[]): T[] {
  const result: T[] = [];
  for (const event of events) {
    const last = result.at(-1);
    if (last && sameDateIdentity(last, event)) {
      result[result.length - 1] = pickBestDuplicate(last, event);
    } else {
      result.push(event);
    }
  }
  return result;
}

export function collapseConsecutiveDays<T extends CollapsibleEvent>(events: T[]): T[] {
  const deduped = collapseSameDateDuplicates(events);
  const sorted = [...deduped].sort((a, b) => {
    const idCmp = identitySortKey(a).localeCompare(identitySortKey(b));
    if (idCmp !== 0) return idCmp;
    return (a.eventStartDate ?? '').localeCompare(b.eventStartDate ?? '');
  });
  const groups: T[][] = [];
  for (const event of sorted) {
    const lastGroup = groups.at(-1);
    if (lastGroup) {
      const lastInGroup = lastGroup.at(-1)!;
      if (
        sameEventIdentity(lastInGroup, event) &&
        lastInGroup.eventStartDate &&
        event.eventStartDate &&
        datesAreConsecutive(lastInGroup.eventStartDate, event.eventStartDate)
      ) {
        lastGroup.push(event);
        continue;
      }
    }
    groups.push([event]);
  }

  const collapsed = groups.map((group) => {
    if (group.length === 1) return group[0];
    const first = group[0];
    const last = group.at(-1)!;
    return {
      ...first,
      eventEndDate: last.eventStartDate,
    } as T;
  });
  return collapsed.sort((a, b) => {
    const dateCmp = (a.eventStartDate ?? '').localeCompare(b.eventStartDate ?? '');
    if (dateCmp !== 0) return dateCmp;
    return identitySortKey(a).localeCompare(identitySortKey(b));
  });
}

function identitySortKey<T extends CollapsibleEvent>(event: T): string {
  return [
    event.title.toLowerCase().trim(),
    event.city.toLowerCase().trim(),
    (event.locationAddress ?? '').trim(),
  ].join('|');
}
