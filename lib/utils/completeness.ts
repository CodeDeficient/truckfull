/**
 * Checks if a food truck has the minimum required data to be considered complete for MVP.
 * This is a simplified check that ensures basic data quality.
 *
 * @param truck - The food truck object to check
 * @returns boolean - True if the truck has sufficient data for MVP
 */
export function isTruckCompleteForMVP(truck: unknown): boolean {
  // Type guard to check if truck has the expected structure
  if (typeof truck !== 'object' || truck == null) {
    return false;
  }

  // Cast to a generic object for property checking
  const truckObj = truck as Record<string, unknown>;

  // Check for essential properties that should exist for an MVP truck listing
  const hasId = typeof truckObj.id === 'string' && truckObj.id.length > 0;
  const hasName = typeof truckObj.name === 'string' && truckObj.name.length > 0;

  // For MVP, we might consider a truck complete if it has at least an ID and name
  // In a real implementation, we might check for more properties like location, menu, etc.
  return hasId && hasName;
}
