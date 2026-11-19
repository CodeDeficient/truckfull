/**
 * Centralized status ring styling utilities
 * Used across map pins, avatar components, and cards for consistency
 */

import type { FoodTruck, FoodTruckDomain } from '@/lib/types';
import { shouldShowTruckStatus } from './foodTruckHelpers';
import { convertToDomain } from './foodTruckUtils';

/**
 * Get the open status for a truck, handling type conversion and tier extraction
 */
export function getTruckOpenStatus(truck: FoodTruck | FoodTruckDomain): boolean | null {
  // Convert to domain if needed
  const truckDomain: FoodTruckDomain =
    'description' in truck && typeof truck.description === 'string'
      ? (truck as FoodTruckDomain)
      : convertToDomain(truck as FoodTruck);

  // Extract subscription tier
  const rawTier = (truck as { subscription_tier?: string }).subscription_tier;
  const ownerTier =
    rawTier && typeof rawTier === 'string' && rawTier.trim() !== '' ? rawTier : undefined;

  return shouldShowTruckStatus(truckDomain, ownerTier);
}

/**
 * Get CSS class for status ring (used with .avatar-marker class)
 */
export function getStatusRingClass(truck: FoodTruck | FoodTruckDomain): string {
  const status = getTruckOpenStatus(truck);
  if (status === true) {
    return 'open';
  }
  if (status === false) {
    return 'closed';
  }
  return '';
}

/**
 * Get inline style for status ring from a raw status value
 */
export function getStatusRingStyleFromStatus(status: boolean | null): React.CSSProperties {
  if (status === true) {
    return { border: '3px solid #22c55e', boxShadow: '0 0 6px rgba(34, 197, 94, 0.4)' };
  }
  if (status === false) {
    return { border: '3px solid #ef4444', boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)' };
  }
  return { border: '3px solid #6b7280' };
}

/**
 * Get inline style for status ring (green/red/gray border with glow)
 */
export function getStatusRingStyle(truck: FoodTruck | FoodTruckDomain): React.CSSProperties {
  return getStatusRingStyleFromStatus(getTruckOpenStatus(truck));
}
