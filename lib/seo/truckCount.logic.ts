export function floorToNearestTen(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n / 10) * 10;
}

export function buildTruckCountTitle(rounded: number | null): string {
  const count = rounded === null ? '' : `${rounded}+ `;
  return `TruckFull | ${count}Food Trucks & Caterers in Georgia & South Carolina`;
}

export function buildTruckCountDescription(rounded: number | null): string {
  const summary =
    rounded === null
      ? 'Food trucks across GA & SC.'
      : `${rounded}+ food trucks across GA & SC.`;
  return `${summary} Live map, menus, and AI-powered event discovery for food truck owners. Find trucks in Augusta, Charleston, and beyond.`;
}

export function buildTruckCountOgDescription(rounded: number | null): string {
  const summary =
    rounded === null
      ? 'Food trucks across GA & SC.'
      : `${rounded}+ food trucks across GA & SC.`;
  return `${summary} Live map, menus, and AI-powered event discovery for food truck owners.`;
}

export function buildTruckCountTwitterDescription(rounded: number | null): string {
  const summary =
    rounded === null
      ? 'Food trucks across GA & SC.'
      : `${rounded}+ food trucks across GA & SC.`;
  return `${summary} Live map, menus, and AI-powered event discovery.`;
}
