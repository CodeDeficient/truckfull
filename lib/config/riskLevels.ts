/**
 * Risk level configuration for auto-approval logic
 * Used by the automated update approval system to determine
 * which updates can be auto-approved vs. require manual review.
 */

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum UpdateCategory {
  LOCATION_UPDATE = 'location_update',
  HOURS_UPDATE = 'hours_update',
  MENU_UPDATE = 'menu_update',
  CUISINE_CHANGE = 'cuisine_change',
  GENERAL_CONTENT = 'general_content',
}

/**
 * Mapping of update categories to their risk levels.
 * HIGH risk updates are NEVER auto-approved.
 * MEDIUM risk requires > 90% confidence.
 * LOW risk requires > 80% confidence.
 */
export const CATEGORY_RISK_LEVELS: Record<UpdateCategory, RiskLevel> = {
  [UpdateCategory.LOCATION_UPDATE]: RiskLevel.HIGH,
  [UpdateCategory.CUISINE_CHANGE]: RiskLevel.HIGH,
  [UpdateCategory.MENU_UPDATE]: RiskLevel.MEDIUM,
  [UpdateCategory.HOURS_UPDATE]: RiskLevel.LOW,
  [UpdateCategory.GENERAL_CONTENT]: RiskLevel.LOW,
};

/**
 * Confidence thresholds for auto-approval by risk level.
 * HIGH risk is not in this map because it's never auto-approved.
 */
export const AUTO_APPROVAL_THRESHOLDS: Partial<Record<RiskLevel, number>> = {
  [RiskLevel.LOW]: 0.8,
  [RiskLevel.MEDIUM]: 0.9,
};

/**
 * Distance threshold in miles for anomaly detection.
 * If a location update moves the truck more than this distance,
 * it's flagged as an anomaly requiring manual review.
 */
export const LOCATION_ANOMALY_DISTANCE_MILES = 100;

/**
 * Evaluates the risk level for a given update.
 */
export function getRiskLevel(category: UpdateCategory): RiskLevel {
  return CATEGORY_RISK_LEVELS[category] ?? RiskLevel.HIGH;
}

/**
 * Determines if an update can be auto-approved based on category and confidence.
 */
export function canAutoApprove(category: UpdateCategory, confidence: number): boolean {
  const riskLevel = getRiskLevel(category);

  // HIGH risk updates are never auto-approved
  if (riskLevel === RiskLevel.HIGH) {
    return false;
  }

  const threshold = AUTO_APPROVAL_THRESHOLDS[riskLevel];
  if (threshold === undefined) {
    return false;
  }

  return confidence >= threshold;
}

/**
 * Checks if a distance change should be flagged as an anomaly.
 */
export function isLocationAnomaly(distanceMiles: number): boolean {
  return distanceMiles > LOCATION_ANOMALY_DISTANCE_MILES;
}
