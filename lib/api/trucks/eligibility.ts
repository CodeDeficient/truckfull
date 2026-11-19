import type { FoodTruck } from '@/lib/types';

export const BLOCKED_VERIFICATION_STATUSES: ReadonlySet<string> = new Set([
  'shadowbanned',
  'rejected',
]);

export const BLOCKED_STATUSES_SQL = `("${[...BLOCKED_VERIFICATION_STATUSES].join('","')}")`;

export function isPublicTruckListCandidate(truck: Pick<FoodTruck, 'data_quality_score' | 'verification_status'>): boolean {
  const qualityScore = truck.data_quality_score;
  return (
    typeof qualityScore === 'number' &&
    Number.isFinite(qualityScore) &&
    qualityScore >= 0 &&
    !BLOCKED_VERIFICATION_STATUSES.has(truck.verification_status ?? '')
  );
}
