/**
 * Location Accuracy Service
 * Provides location accuracy indicators and confidence scoring for the application
 */

// Type alias for confidence levels to avoid union type warnings
type ConfidenceLevel = 'high' | 'medium' | 'low';
// Type alias for source types to avoid union type warnings
type LocationAccuracySource =
  | 'live'
  | 'recent'
  | 'address_geocoded'
  | 'gps'
  | 'network'
  | 'ip'
  | 'last_known'
  | 'default';

interface LocationAccuracy {
  source: LocationAccuracySource;
  confidence: ConfidenceLevel;
  estimatedAccuracyMeters: number;
  description: string;
  icon: string;
  color: string;
  searchRadiusAdjustment: number; // Multiplier for search radius based on accuracy
}

class LocationAccuracyService {
  /**
   * Get accuracy information for a given location source
   */
  public static getAccuracyInfo(
    source: LocationAccuracySource,
    accuracyMeters?: number,
  ): LocationAccuracy {
    // If we have a specific accuracy measurement, use it; otherwise, estimate based on source
    const estimatedAccuracy = accuracyMeters ?? this.estimateAccuracyBySource(source);

    let confidence: ConfidenceLevel;
    let description: string;
    let icon: string;
    let color: string;
    let searchRadiusAdjustment: number;

    // Determine confidence based on accuracy in meters
    if (estimatedAccuracy <= 100) {
      confidence = 'high';
      description = 'Precise location';
      icon = '🎯';
      color = 'text-green-600';
      searchRadiusAdjustment = 1;
    } else if (estimatedAccuracy <= 1000) {
      confidence = 'medium';
      description = 'Approximate location';
      icon = '📍';
      color = 'text-yellow-600';
      searchRadiusAdjustment = 1.5;
    } else {
      confidence = 'low';
      description = 'General area';
      icon = '🗺️';
      color = 'text-red-600';
      searchRadiusAdjustment = 2;
    }

    return {
      source: source,
      confidence,
      estimatedAccuracyMeters: estimatedAccuracy,
      description,
      icon,
      color,
      searchRadiusAdjustment,
    };
  }

  /**
   * Estimate accuracy based on the source of the location
   */
  private static estimateAccuracyBySource(source: LocationAccuracySource): number {
    switch (source) {
      case 'live':
      case 'gps': {
        return 50;
      } // High accuracy for live GPS data

      case 'recent': {
        // Recent location accuracy depends on how recent it is and original accuracy
        // But we'll assume medium accuracy for a recent location
        return 500;
      }

      case 'address_geocoded': {
        return 100;
      } // Medium accuracy for geocoded addresses

      case 'network': {
        return 200;
      } // Medium accuracy for network-based location

      case 'ip': {
        return 50_000;
      } // Low accuracy for IP-based location (50km)

      case 'last_known': {
        // Last known accuracy depends on how old it is
        // But we'll assume medium-low accuracy
        return 1000;
      }

      case 'default': {
        return 100_000;
      } // Very low accuracy for default location (100km)

      default: {
        return 500;
      } // Default medium accuracy
    }
  }

  /**
   * Format accuracy for display to users
   */
  public static formatAccuracyDisplay(accuracyInfo: LocationAccuracy): string {
    const { estimatedAccuracyMeters, description } = accuracyInfo;

    if (estimatedAccuracyMeters < 1000) {
      return `${description} (${Math.round(estimatedAccuracyMeters)}m accuracy)`;
    } else {
      const kmAccuracy = Math.round(estimatedAccuracyMeters / 1000);
      return `${description} (~${kmAccuracy}km accuracy)`;
    }
  }

  /**
   * Get appropriate search radius based on location accuracy
   */
  public static getRecommendedSearchRadius(
    accuracyInfo: LocationAccuracy,
    baseRadiusMiles: number,
  ): number {
    // Convert base radius to meters for calculation
    const baseRadiusMeters = baseRadiusMiles * 1609.34; // 1 mile = 1609.34 meters

    // Adjust radius based on accuracy confidence
    const adjustedRadiusMeters = baseRadiusMeters * accuracyInfo.searchRadiusAdjustment;

    // Convert back to miles for return
    return Math.round(adjustedRadiusMeters / 1609.34);
  }

  /**
   * Determine if location is precise enough for specific use case
   */
  public static isAccurateEnough(
    accuracyInfo: LocationAccuracy,
    requiredPrecisionMeters: number,
  ): boolean {
    return accuracyInfo.estimatedAccuracyMeters <= requiredPrecisionMeters;
  }

  /**
   * Create a confidence score (0-100) based on location accuracy
   */
  public static getConfidenceScore(accuracyInfo: LocationAccuracy): number {
    // Invert the accuracy for scoring (lower accuracy = higher score)
    // 0m = 100% confidence, 100000m = 0% confidence
    const maxAccuracy = 100_000; // Maximum possible accuracy in meters
    const score = Math.max(0, 100 - (accuracyInfo.estimatedAccuracyMeters / maxAccuracy) * 100);
    return Math.round(score);
  }
}

export { LocationAccuracyService, type LocationAccuracy };
