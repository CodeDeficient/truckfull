import { FoodTruckCurrentLocation, FoodTruck } from '@/lib/types';

const TIME_STRING = /^\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

export function hasValidDateString(date: unknown): date is string {
  return typeof date === 'string' && date.length > 0;
}

export function hasValidTimeString(time: unknown): time is string {
  return typeof time === 'string' && TIME_STRING.test(time);
}

export function hasValidId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0;
}

export function hasValidString(str: unknown): str is string {
  return typeof str === 'string' && str.length > 0;
}

export function hasValidLocation(location: unknown): location is FoodTruckCurrentLocation {
  return (
    typeof location === 'object' &&
    location !== null &&
    'address' in location &&
    typeof (location as FoodTruckCurrentLocation).address === 'string'
  );
}

export function hasValidCuisineType(cuisine: unknown): cuisine is string[] {
  return Array.isArray(cuisine) && cuisine.every((c) => typeof c === 'string');
}

export function hasValidRating(rating: unknown): rating is number {
  return typeof rating === 'number' && rating >= 0 && rating <= 5;
}

export function hasValidReviewCount(reviewCount: unknown): reviewCount is number {
  return typeof reviewCount === 'number' && reviewCount >= 0;
}

export function hasValidBoolean(bool: unknown): bool is boolean {
  return typeof bool === 'boolean';
}

export function isTruckResultWithError(result: unknown): result is { error: string } {
  return (
    result != null &&
    typeof result === 'object' &&
    'error' in result &&
    typeof (result as { error: unknown }).error === 'string'
  );
}

export function isTruckResultSuccess(result: unknown): result is { trucks: FoodTruck[] } {
  return (
    result != null &&
    typeof result === 'object' &&
    'trucks' in result &&
    Array.isArray((result as { trucks: unknown }).trucks)
  );
}
