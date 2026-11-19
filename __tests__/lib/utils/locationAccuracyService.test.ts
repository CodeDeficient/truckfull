import { describe, it, expect } from '@jest/globals';
import { LocationAccuracyService, type LocationAccuracy } from '@/lib/utils/locationAccuracyService';

describe('LocationAccuracyService', () => {
  describe('getAccuracyInfo', () => {
    it('returns high confidence for live source with default accuracy', () => {
      const result = LocationAccuracyService.getAccuracyInfo('live');

      expect(result.confidence).toBe('high');
      expect(result.source).toBe('live');
      expect(result.estimatedAccuracyMeters).toBe(50);
      expect(result.description).toBe('Precise location');
      expect(result.icon).toBe('🎯');
      expect(result.color).toBe('text-green-600');
      expect(result.searchRadiusAdjustment).toBe(1);
    });

    it('returns high confidence for gps source with default accuracy', () => {
      const result = LocationAccuracyService.getAccuracyInfo('gps');

      expect(result.confidence).toBe('high');
      expect(result.source).toBe('gps');
      expect(result.estimatedAccuracyMeters).toBe(50);
    });

    it('returns medium confidence for recent source', () => {
      const result = LocationAccuracyService.getAccuracyInfo('recent');

      expect(result.confidence).toBe('medium');
      expect(result.source).toBe('recent');
      expect(result.estimatedAccuracyMeters).toBe(500);
      expect(result.description).toBe('Approximate location');
      expect(result.icon).toBe('📍');
      expect(result.color).toBe('text-yellow-600');
      expect(result.searchRadiusAdjustment).toBe(1.5);
    });

    it('returns high confidence for address_geocoded source (100m)', () => {
      const result = LocationAccuracyService.getAccuracyInfo('address_geocoded');

      expect(result.confidence).toBe('high');
      expect(result.estimatedAccuracyMeters).toBe(100);
    });

    it('returns medium confidence for network source', () => {
      const result = LocationAccuracyService.getAccuracyInfo('network');

      expect(result.confidence).toBe('medium');
      expect(result.estimatedAccuracyMeters).toBe(200);
    });

    it('returns low confidence for ip source', () => {
      const result = LocationAccuracyService.getAccuracyInfo('ip');

      expect(result.confidence).toBe('low');
      expect(result.estimatedAccuracyMeters).toBe(50000);
      expect(result.description).toBe('General area');
      expect(result.icon).toBe('🗺️');
      expect(result.color).toBe('text-red-600');
      expect(result.searchRadiusAdjustment).toBe(2);
    });

    it('returns medium-low confidence for last_known source', () => {
      const result = LocationAccuracyService.getAccuracyInfo('last_known');

      expect(result.confidence).toBe('medium');
      expect(result.estimatedAccuracyMeters).toBe(1000);
    });

    it('returns very low confidence for default source', () => {
      const result = LocationAccuracyService.getAccuracyInfo('default');

      expect(result.confidence).toBe('low');
      expect(result.estimatedAccuracyMeters).toBe(100000);
    });

    it('uses custom accuracy when provided', () => {
      const result = LocationAccuracyService.getAccuracyInfo('live', 25);

      expect(result.estimatedAccuracyMeters).toBe(25);
      expect(result.confidence).toBe('high');
    });

    it('uses custom accuracy of 100m for high confidence', () => {
      const result = LocationAccuracyService.getAccuracyInfo('ip', 100);

      expect(result.estimatedAccuracyMeters).toBe(100);
      expect(result.confidence).toBe('high');
    });

    it('uses custom accuracy of 500m for medium confidence', () => {
      const result = LocationAccuracyService.getAccuracyInfo('default', 500);

      expect(result.estimatedAccuracyMeters).toBe(500);
      expect(result.confidence).toBe('medium');
    });

    it('uses custom accuracy of 5000m for low confidence', () => {
      const result = LocationAccuracyService.getAccuracyInfo('gps', 5000);

      expect(result.estimatedAccuracyMeters).toBe(5000);
      expect(result.confidence).toBe('low');
    });

    it('handles unknown source with network accuracy', () => {
      const result = LocationAccuracyService.getAccuracyInfo('network' as 'live');

      expect(result.estimatedAccuracyMeters).toBe(200);
    });
  });

  describe('formatAccuracyDisplay', () => {
    it('formats meters when under 1000', () => {
      const accuracy: LocationAccuracy = {
        source: 'gps',
        confidence: 'high',
        estimatedAccuracyMeters: 50,
        description: 'Precise location',
        icon: '🎯',
        color: 'text-green-600',
        searchRadiusAdjustment: 1,
      };

      const result = LocationAccuracyService.formatAccuracyDisplay(accuracy);

      expect(result).toBe('Precise location (50m accuracy)');
    });

    it('formats kilometers when 1000 or over', () => {
      const accuracy: LocationAccuracy = {
        source: 'ip',
        confidence: 'low',
        estimatedAccuracyMeters: 50000,
        description: 'General area',
        icon: '🗺️',
        color: 'text-red-600',
        searchRadiusAdjustment: 2,
      };

      const result = LocationAccuracyService.formatAccuracyDisplay(accuracy);

      expect(result).toBe('General area (~50km accuracy)');
    });

    it('rounds meters correctly', () => {
      const accuracy: LocationAccuracy = {
        source: 'network',
        confidence: 'medium',
        estimatedAccuracyMeters: 123.456,
        description: 'Approximate location',
        icon: '📍',
        color: 'text-yellow-600',
        searchRadiusAdjustment: 1.5,
      };

      const result = LocationAccuracyService.formatAccuracyDisplay(accuracy);

      expect(result).toBe('Approximate location (123m accuracy)');
    });

    it('rounds kilometers correctly', () => {
      const accuracy: LocationAccuracy = {
        source: 'default',
        confidence: 'low',
        estimatedAccuracyMeters: 10500,
        description: 'General area',
        icon: '🗺️',
        color: 'text-red-600',
        searchRadiusAdjustment: 2,
      };

      const result = LocationAccuracyService.formatAccuracyDisplay(accuracy);

      expect(result).toBe('General area (~11km accuracy)');
    });
  });

  describe('getRecommendedSearchRadius', () => {
    it('adjusts radius for high confidence location', () => {
      const accuracy: LocationAccuracy = {
        source: 'gps',
        confidence: 'high',
        estimatedAccuracyMeters: 50,
        description: 'Precise location',
        icon: '🎯',
        color: 'text-green-600',
        searchRadiusAdjustment: 1,
      };

      const result = LocationAccuracyService.getRecommendedSearchRadius(accuracy, 5);

      expect(result).toBe(5);
    });

    it('adjusts radius for medium confidence location', () => {
      const accuracy: LocationAccuracy = {
        source: 'network',
        confidence: 'medium',
        estimatedAccuracyMeters: 500,
        description: 'Approximate location',
        icon: '📍',
        color: 'text-yellow-600',
        searchRadiusAdjustment: 1.5,
      };

      const result = LocationAccuracyService.getRecommendedSearchRadius(accuracy, 5);

      expect(result).toBe(8);
    });

    it('adjusts radius for low confidence location', () => {
      const accuracy: LocationAccuracy = {
        source: 'ip',
        confidence: 'low',
        estimatedAccuracyMeters: 50000,
        description: 'General area',
        icon: '🗺️',
        color: 'text-red-600',
        searchRadiusAdjustment: 2,
      };

      const result = LocationAccuracyService.getRecommendedSearchRadius(accuracy, 5);

      expect(result).toBe(10);
    });

    it('handles small base radius', () => {
      const accuracy: LocationAccuracy = {
        source: 'gps',
        confidence: 'high',
        estimatedAccuracyMeters: 50,
        description: 'Precise location',
        icon: '🎯',
        color: 'text-green-600',
        searchRadiusAdjustment: 1,
      };

      const result = LocationAccuracyService.getRecommendedSearchRadius(accuracy, 1);

      expect(result).toBe(1);
    });

    it('handles large base radius', () => {
      const accuracy: LocationAccuracy = {
        source: 'ip',
        confidence: 'low',
        estimatedAccuracyMeters: 50000,
        description: 'General area',
        icon: '🗺️',
        color: 'text-red-600',
        searchRadiusAdjustment: 2,
      };

      const result = LocationAccuracyService.getRecommendedSearchRadius(accuracy, 50);

      expect(result).toBe(100);
    });
  });

  describe('isAccurateEnough', () => {
    it('returns true when accuracy meets requirement', () => {
      const accuracy: LocationAccuracy = {
        source: 'gps',
        confidence: 'high',
        estimatedAccuracyMeters: 50,
        description: 'Precise location',
        icon: '🎯',
        color: 'text-green-600',
        searchRadiusAdjustment: 1,
      };

      expect(LocationAccuracyService.isAccurateEnough(accuracy, 100)).toBe(true);
    });

    it('returns false when accuracy exceeds requirement', () => {
      const accuracy: LocationAccuracy = {
        source: 'ip',
        confidence: 'low',
        estimatedAccuracyMeters: 50000,
        description: 'General area',
        icon: '🗺️',
        color: 'text-red-600',
        searchRadiusAdjustment: 2,
      };

      expect(LocationAccuracyService.isAccurateEnough(accuracy, 100)).toBe(false);
    });

    it('returns true when accuracy equals requirement', () => {
      const accuracy: LocationAccuracy = {
        source: 'gps',
        confidence: 'high',
        estimatedAccuracyMeters: 100,
        description: 'Precise location',
        icon: '🎯',
        color: 'text-green-600',
        searchRadiusAdjustment: 1,
      };

      expect(LocationAccuracyService.isAccurateEnough(accuracy, 100)).toBe(true);
    });
  });

  describe('getConfidenceScore', () => {
    it('returns 100 for 0 meters accuracy', () => {
      const accuracy: LocationAccuracy = {
        source: 'gps',
        confidence: 'high',
        estimatedAccuracyMeters: 0,
        description: 'Precise location',
        icon: '🎯',
        color: 'text-green-600',
        searchRadiusAdjustment: 1,
      };

      const result = LocationAccuracyService.getConfidenceScore(accuracy);

      expect(result).toBe(100);
    });

    it('returns 50 for 50000 meters accuracy', () => {
      const accuracy: LocationAccuracy = {
        source: 'ip',
        confidence: 'low',
        estimatedAccuracyMeters: 50000,
        description: 'General area',
        icon: '🗺️',
        color: 'text-red-600',
        searchRadiusAdjustment: 2,
      };

      const result = LocationAccuracyService.getConfidenceScore(accuracy);

      expect(result).toBe(50);
    });

    it('returns 0 for 100000 meters accuracy', () => {
      const accuracy: LocationAccuracy = {
        source: 'default',
        confidence: 'low',
        estimatedAccuracyMeters: 100000,
        description: 'General area',
        icon: '🗺️',
        color: 'text-red-600',
        searchRadiusAdjustment: 2,
      };

      const result = LocationAccuracyService.getConfidenceScore(accuracy);

      expect(result).toBe(0);
    });

    it('returns high score for precise location', () => {
      const accuracy: LocationAccuracy = {
        source: 'gps',
        confidence: 'high',
        estimatedAccuracyMeters: 10,
        description: 'Precise location',
        icon: '🎯',
        color: 'text-green-600',
        searchRadiusAdjustment: 1,
      };

      const result = LocationAccuracyService.getConfidenceScore(accuracy);

      expect(result).toBe(100);
    });

    it('returns medium score for approximate location', () => {
      const accuracy: LocationAccuracy = {
        source: 'network',
        confidence: 'medium',
        estimatedAccuracyMeters: 500,
        description: 'Approximate location',
        icon: '📍',
        color: 'text-yellow-600',
        searchRadiusAdjustment: 1.5,
      };

      const result = LocationAccuracyService.getConfidenceScore(accuracy);

      expect(result).toBe(100);
    });

    it('rounds the score to nearest integer', () => {
      const accuracy: LocationAccuracy = {
        source: 'network',
        confidence: 'medium',
        estimatedAccuracyMeters: 333,
        description: 'Approximate location',
        icon: '📍',
        color: 'text-yellow-600',
        searchRadiusAdjustment: 1.5,
      };

      const result = LocationAccuracyService.getConfidenceScore(accuracy);

      expect(result).toBe(100 - Math.round((333 / 100000) * 100));
    });
  });
});
