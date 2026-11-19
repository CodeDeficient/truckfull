import { logError } from '@/lib/logging';
/**
 * Utility function to handle reset filters with proper error handling
 */
export function handleResetFilters(resetCallback: () => void | Promise<void>) {
  const result = resetCallback();
  if (result instanceof Promise) {
    result.catch((error) => logError('Error resetting filters:', error));
  }
  return result;
}
