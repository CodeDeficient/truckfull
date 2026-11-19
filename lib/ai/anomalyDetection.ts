/**
 * Anomaly Detection Module
 * WBS: 3.5.1, 3.5.2
 *
 * Detects anomalies in location and category changes that require manual review.
 */

import { calculateDistance } from '@/lib/utils/geoUtils';
import { LOCATION_ANOMALY_DISTANCE_MILES, RiskLevel } from '@/lib/config/riskLevels';
import { logMessage, logWarning } from '@/lib/logging';

export interface AnomalyCheckResult {
  isAnomaly: boolean;
  reasons: string[];
  riskLevel: RiskLevel;
}

export interface LocationData {
  lat: number;
  lng: number;
}

/**
 * Checks if a location change is anomalous.
 * An anomaly is flagged if the distance exceeds the threshold.
 *
 * @param currentLocation - Current truck location
 * @param newLocation - Proposed new location
 * @returns Anomaly check result
 */
export function checkLocationAnomaly(
  currentLocation: LocationData | null | undefined,
  newLocation: LocationData,
): AnomalyCheckResult {
  const reasons: string[] = [];
  let isAnomaly = false;

  // If no current location, can't check distance - be conservative
  if (!currentLocation) {
    logMessage('checkLocationAnomaly: No current location to compare');
    return {
      isAnomaly: false,
      reasons: ['First location set - no anomaly check possible'],
      riskLevel: RiskLevel.MEDIUM,
    };
  }

  // Calculate distance between current and new location
  const distanceMiles = calculateDistance(
    currentLocation.lat,
    currentLocation.lng,
    newLocation.lat,
    newLocation.lng,
  );

  logMessage('Location distance check:', {
    distanceMiles,
    threshold: LOCATION_ANOMALY_DISTANCE_MILES,
  });

  if (distanceMiles > LOCATION_ANOMALY_DISTANCE_MILES) {
    isAnomaly = true;
    reasons.push(
      `Location change of ${distanceMiles.toFixed(1)} miles exceeds ${LOCATION_ANOMALY_DISTANCE_MILES} mile threshold`,
    );
    logWarning('Location anomaly detected:', { distanceMiles });
  }

  // Additional checks can be added here:
  // - Check if location is in a completely different state
  // - Check if location is in water/ocean (invalid)
  // - Check if location is outside service area

  return {
    isAnomaly,
    reasons,
    riskLevel: isAnomaly ? RiskLevel.HIGH : RiskLevel.MEDIUM,
  };
}

/**
 * Checks if a cuisine/category change is anomalous.
 * Category changes are ALWAYS flagged as high risk.
 *
 * @param currentCuisine - Current cuisine types
 * @param newCuisine - Proposed new cuisine types
 * @returns Anomaly check result
 */
export function checkCuisineChangeAnomaly(
  currentCuisine: string[] | null | undefined,
  newCuisine: string[] | null | undefined,
): AnomalyCheckResult {
  const reasons: string[] = [];

  // If no current cuisine set, this is an addition not a change
  if (!currentCuisine?.length) {
    return {
      isAnomaly: false,
      reasons: ['First cuisine set - no change detected'],
      riskLevel: RiskLevel.LOW,
    };
  }

  // If new cuisine is empty, that's suspicious
  if (!newCuisine?.length) {
    return {
      isAnomaly: true,
      reasons: ['Cuisine would be cleared - requires manual review'],
      riskLevel: RiskLevel.HIGH,
    };
  }

  // Check for significant changes
  const currentSet = new Set(currentCuisine.map((c) => c.toLowerCase().trim()));
  const newSet = new Set(newCuisine.map((c) => c.toLowerCase().trim()));

  const removed = [...currentSet].filter((c) => !newSet.has(c));
  const added = [...newSet].filter((c) => !currentSet.has(c));

  if (removed.length > 0 || added.length > 0) {
    reasons.push(`Cuisine change: removed [${removed.join(', ')}], added [${added.join(', ')}]`);
    logWarning('Cuisine change detected:', { removed, added });

    return {
      isAnomaly: true,
      reasons,
      riskLevel: RiskLevel.HIGH,
    };
  }

  return {
    isAnomaly: false,
    reasons: [],
    riskLevel: RiskLevel.LOW,
  };
}

/**
 * Combined anomaly check for any update.
 */
export function checkUpdateAnomalies(
  updateType: string,
  currentData: Record<string, unknown>,
  newData: Record<string, unknown>,
): AnomalyCheckResult {
  const allReasons: string[] = [];
  let highestRiskLevel: RiskLevel = RiskLevel.LOW;
  let hasAnomaly = false;

  // Location anomaly check
  if (updateType === 'location_update' && newData.lat && newData.lng) {
    const currentLoc = currentData.current_location as LocationData | null;
    const newLoc = { lat: newData.lat as number, lng: newData.lng as number };

    const locResult = checkLocationAnomaly(currentLoc, newLoc);
    if (locResult.isAnomaly) {
      hasAnomaly = true;
      allReasons.push(...locResult.reasons);
    }
    if (locResult.riskLevel === RiskLevel.HIGH) {
      highestRiskLevel = RiskLevel.HIGH;
    }
  }

  // Cuisine anomaly check
  if (updateType === 'cuisine_change') {
    const currentCuisine = currentData.cuisine_type as string[] | null;
    const newCuisine = newData.cuisine_type as string[] | null;

    const cuisineResult = checkCuisineChangeAnomaly(currentCuisine, newCuisine);
    if (cuisineResult.isAnomaly) {
      hasAnomaly = true;
      allReasons.push(...cuisineResult.reasons);
    }
    if (cuisineResult.riskLevel === RiskLevel.HIGH) {
      highestRiskLevel = RiskLevel.HIGH;
    }
  }

  return {
    isAnomaly: hasAnomaly,
    reasons: allReasons,
    riskLevel: highestRiskLevel,
  };
}
