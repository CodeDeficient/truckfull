export const DEFAULT_SEARCH_RADIUS_MILES = 25;
export const ANONYMOUS_MAX_RADIUS_MILES = 50;
export const SIGNED_IN_MAX_RADIUS_MILES = 150;

export function maxRadiusMilesFor(signedIn: boolean): number {
  return signedIn ? SIGNED_IN_MAX_RADIUS_MILES : ANONYMOUS_MAX_RADIUS_MILES;
}

export function capRadiusMiles(requestedMiles: number, signedIn: boolean): number {
  return Math.min(requestedMiles, maxRadiusMilesFor(signedIn));
}
