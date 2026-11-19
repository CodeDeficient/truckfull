import { describe, it, expect } from '@jest/globals';
import {
  formatQualityScore,
  categorizeQualityScore,
  getQualityBadgeClasses,
  calculateQualityTrend,
  getQualityImprovementSuggestions,
  formatQualityStats,
  isValidQualityScore,
  getQualityScoreAriaLabel,
  QUALITY_THRESHOLDS,
  QUALITY_CATEGORIES,
} from '@/lib/utils/dataQualityFormatters';

describe('formatQualityScore', () => {
  it('returns N/A for undefined', () => {
    expect(formatQualityScore(undefined)).toBe('N/A');
  });

  it('returns N/A for NaN', () => {
    expect(formatQualityScore(NaN)).toBe('N/A');
  });

  it('formats 0 as 0%', () => {
    expect(formatQualityScore(0)).toBe('0.0%');
  });

  it('formats 1 as 100%', () => {
    expect(formatQualityScore(1)).toBe('100.0%');
  });

  it('formats 0.5 as 50%', () => {
    expect(formatQualityScore(0.5)).toBe('50.0%');
  });

  it('formats 0.75 as 75%', () => {
    expect(formatQualityScore(0.75)).toBe('75.0%');
  });

  it('handles 0-100 range by normalizing', () => {
    expect(formatQualityScore(50)).toBe('50.0%');
    expect(formatQualityScore(75)).toBe('75.0%');
  });

  it('respects precision parameter', () => {
    expect(formatQualityScore(0.333, 2)).toBe('33.30%');
    expect(formatQualityScore(0.1234, 3)).toBe('12.340%');
  });

  it('defaults precision to 1', () => {
    expect(formatQualityScore(0.333)).toBe('33.3%');
  });
});

describe('categorizeQualityScore', () => {
  it('returns High for score >= 0.8', () => {
    expect(categorizeQualityScore(0.8)).toEqual(QUALITY_CATEGORIES.high);
    expect(categorizeQualityScore(1)).toEqual(QUALITY_CATEGORIES.high);
    expect(categorizeQualityScore(0.9)).toEqual(QUALITY_CATEGORIES.high);
  });

  it('returns Medium for score >= 0.6 and < 0.8', () => {
    expect(categorizeQualityScore(0.6)).toEqual(QUALITY_CATEGORIES.medium);
    expect(categorizeQualityScore(0.7)).toEqual(QUALITY_CATEGORIES.medium);
    expect(categorizeQualityScore(0.79)).toEqual(QUALITY_CATEGORIES.medium);
  });

  it('returns Low for score < 0.6', () => {
    expect(categorizeQualityScore(0)).toEqual(QUALITY_CATEGORIES.low);
    expect(categorizeQualityScore(0.1)).toEqual(QUALITY_CATEGORIES.low);
    expect(categorizeQualityScore(0.59)).toEqual(QUALITY_CATEGORIES.low);
  });

  it('returns Low for undefined', () => {
    expect(categorizeQualityScore(undefined)).toEqual(QUALITY_CATEGORIES.low);
  });

  it('returns Low for NaN', () => {
    expect(categorizeQualityScore(NaN)).toEqual(QUALITY_CATEGORIES.low);
  });

  it('returns correct category labels and colors', () => {
    expect(QUALITY_CATEGORIES.high.label).toBe('High');
    expect(QUALITY_CATEGORIES.high.color).toBe('#22c55e');
    expect(QUALITY_CATEGORIES.medium.label).toBe('Medium');
    expect(QUALITY_CATEGORIES.medium.color).toBe('#f59e0b');
    expect(QUALITY_CATEGORIES.low.label).toBe('Low');
    expect(QUALITY_CATEGORIES.low.color).toBe('#ef4444');
  });
});

describe('getQualityBadgeClasses', () => {
  it('returns high quality classes for high score', () => {
    const classes = getQualityBadgeClasses(0.8);
    expect(classes).toContain('bg-green-100');
    expect(classes).toContain('text-green-800');
  });

  it('returns medium quality classes for medium score', () => {
    const classes = getQualityBadgeClasses(0.6);
    expect(classes).toContain('bg-yellow-100');
    expect(classes).toContain('text-yellow-800');
  });

  it('returns low quality classes for low score', () => {
    const classes = getQualityBadgeClasses(0.3);
    expect(classes).toContain('bg-red-100');
    expect(classes).toContain('text-red-800');
  });

  it('returns low quality classes for undefined', () => {
    const classes = getQualityBadgeClasses(undefined);
    expect(classes).toContain('bg-red-100');
    expect(classes).toContain('text-red-800');
  });
});

describe('calculateQualityTrend', () => {
  it('returns up trend when current > previous', () => {
    const result = calculateQualityTrend(0.8, 0.5);
    expect(result.direction).toBe('up');
    expect(result.change).toBeCloseTo(30, 0);
    expect(result.changeText).toBe('+30.0%');
  });

  it('returns down trend when current < previous', () => {
    const result = calculateQualityTrend(0.5, 0.8);
    expect(result.direction).toBe('down');
    expect(result.change).toBeCloseTo(30, 0);
    expect(result.changeText).toBe('-30.0%');
  });

  it('returns stable when change < 1%', () => {
    const result = calculateQualityTrend(0.801, 0.8);
    expect(result.direction).toBe('stable');
    expect(result.change).toBe(0);
    expect(result.changeText).toBe('No change');
  });

  it('returns unknown for undefined currentScore', () => {
    const result = calculateQualityTrend(undefined, 0.5);
    expect(result.direction).toBe('unknown');
    expect(result.change).toBe(0);
    expect(result.changeText).toBe('N/A');
  });

  it('returns unknown for undefined previousScore', () => {
    const result = calculateQualityTrend(0.5, undefined);
    expect(result.direction).toBe('unknown');
    expect(result.change).toBe(0);
    expect(result.changeText).toBe('N/A');
  });

  it('returns unknown when both are undefined', () => {
    const result = calculateQualityTrend(undefined, undefined);
    expect(result.direction).toBe('unknown');
  });

  it('calculates small changes correctly', () => {
    const result = calculateQualityTrend(0.51, 0.5);
    expect(result.direction).toBe('up');
    expect(result.change).toBeCloseTo(1, 0);
  });

  it('formats change text with sign', () => {
    const upResult = calculateQualityTrend(0.6, 0.5);
    expect(upResult.changeText).toContain('+');

    const downResult = calculateQualityTrend(0.4, 0.5);
    expect(downResult.changeText).toContain('-');
  });
});

describe('getQualityImprovementSuggestions', () => {
  it('returns excellent message for score >= 0.8', () => {
    const suggestions = getQualityImprovementSuggestions(0.8);
    expect(suggestions).toContain('Quality score is excellent! Continue maintaining data standards.');
  });

  it('returns excellent message for undefined score', () => {
    const suggestions = getQualityImprovementSuggestions(undefined);
    expect(suggestions).toContain('Quality score is excellent! Continue maintaining data standards.');
  });

  it('returns critical suggestions for score < 0.6', () => {
    const suggestions = getQualityImprovementSuggestions(0.5);
    expect(suggestions).toContain('Critical: Add missing core information (name, location, contact details)');
    expect(suggestions).toContain('Verify and update GPS coordinates for accurate location data');
    expect(suggestions).toContain('Add comprehensive menu information and pricing');
    expect(suggestions).toContain('Update operating hours and schedule information');
  });

  it('returns enhancement suggestions for score >= 0.6 and < 0.8', () => {
    const suggestions = getQualityImprovementSuggestions(0.7);
    expect(suggestions).toContain('Add missing optional fields (website, social media, ratings)');
    expect(suggestions).toContain('Enhance menu descriptions and categories');
    expect(suggestions).toContain('Update recent photos and promotional content');
    expect(suggestions).toContain('Verify contact information accuracy');
  });

  it('returns empty array for exact threshold', () => {
    const suggestions = getQualityImprovementSuggestions(0.8);
    expect(suggestions).toHaveLength(1);
  });
});

describe('formatQualityStats', () => {
  it('formats basic stats correctly', () => {
    const stats = {
      total_trucks: 100,
      avg_quality_score: 0.75,
      high_quality_count: 40,
      medium_quality_count: 35,
      low_quality_count: 25,
      verified_count: 60,
      pending_count: 30,
      flagged_count: 10,
    };

    const result = formatQualityStats(stats);

    expect(result.totalTrucks).toBe(100);
    expect(result.averageScore).toBe('75.0%');
    expect(result.averageScoreRaw).toBe(0.75);
  });

  it('calculates distribution percentages correctly', () => {
    const stats = {
      total_trucks: 100,
      avg_quality_score: 0.5,
      high_quality_count: 25,
      medium_quality_count: 25,
      low_quality_count: 50,
      verified_count: 50,
      pending_count: 40,
      flagged_count: 10,
    };

    const result = formatQualityStats(stats);

    expect(result.distribution.high.count).toBe(25);
    expect(result.distribution.high.percentage).toBe('25.0');
    expect(result.distribution.medium.count).toBe(25);
    expect(result.distribution.medium.percentage).toBe('25.0');
    expect(result.distribution.low.count).toBe(50);
    expect(result.distribution.low.percentage).toBe('50.0');
  });

  it('calculates verification percentages correctly', () => {
    const stats = {
      total_trucks: 100,
      avg_quality_score: 0.5,
      high_quality_count: 25,
      medium_quality_count: 25,
      low_quality_count: 50,
      verified_count: 50,
      pending_count: 40,
      flagged_count: 10,
    };

    const result = formatQualityStats(stats);

    expect(result.verification.verified.count).toBe(50);
    expect(result.verification.verified.percentage).toBe('50.0');
    expect(result.verification.pending.count).toBe(40);
    expect(result.verification.pending.percentage).toBe('40.0');
    expect(result.verification.flagged.count).toBe(10);
    expect(result.verification.flagged.percentage).toBe('10.0');
  });

  it('handles zero trucks', () => {
    const stats = {
      total_trucks: 0,
      avg_quality_score: 0,
      high_quality_count: 0,
      medium_quality_count: 0,
      low_quality_count: 0,
      verified_count: 0,
      pending_count: 0,
      flagged_count: 0,
    };

    const result = formatQualityStats(stats);

    expect(result.distribution.high.percentage).toBe('NaN');
  });
});

describe('isValidQualityScore', () => {
  it('returns true for valid score between 0 and 1', () => {
    expect(isValidQualityScore(0)).toBe(true);
    expect(isValidQualityScore(0.5)).toBe(true);
    expect(isValidQualityScore(1)).toBe(true);
  });

  it('returns false for undefined', () => {
    expect(isValidQualityScore(undefined)).toBe(false);
  });

  it('returns false for NaN', () => {
    expect(isValidQualityScore(NaN)).toBe(false);
  });

  it('returns false for negative score', () => {
    expect(isValidQualityScore(-0.1)).toBe(false);
  });

  it('returns false for score greater than 1', () => {
    expect(isValidQualityScore(1.1)).toBe(false);
  });

  it('returns true for edge case 0', () => {
    expect(isValidQualityScore(0)).toBe(true);
  });

  it('returns true for edge case 1', () => {
    expect(isValidQualityScore(1)).toBe(true);
  });
});

describe('getQualityScoreAriaLabel', () => {
  it('returns not available message for invalid score', () => {
    expect(getQualityScoreAriaLabel(undefined)).toBe('Quality score not available');
    expect(getQualityScoreAriaLabel(NaN)).toBe('Quality score not available');
    expect(getQualityScoreAriaLabel(-1)).toBe('Quality score not available');
    expect(getQualityScoreAriaLabel(1.1)).toBe('Quality score not available');
  });

  it('returns formatted label for valid high score', () => {
    const label = getQualityScoreAriaLabel(0.85);
    expect(label).toContain('85.0%');
    expect(label).toContain('high');
  });

  it('returns formatted label for valid medium score', () => {
    const label = getQualityScoreAriaLabel(0.65);
    expect(label).toContain('65.0%');
    expect(label).toContain('medium');
  });

  it('returns formatted label for valid low score', () => {
    const label = getQualityScoreAriaLabel(0.45);
    expect(label).toContain('45.0%');
    expect(label).toContain('low');
  });

  it('includes score and category in label', () => {
    const label = getQualityScoreAriaLabel(0.8);
    expect(label).toMatch(/Data quality score:.*, categorized as.*quality/);
  });
});

describe('QUALITY_THRESHOLDS', () => {
  it('has correct high threshold', () => {
    expect(QUALITY_THRESHOLDS.high).toBe(0.8);
  });

  it('has correct medium threshold', () => {
    expect(QUALITY_THRESHOLDS.medium).toBe(0.6);
  });

  it('has correct low threshold', () => {
    expect(QUALITY_THRESHOLDS.low).toBe(0.6);
  });
});

describe('QUALITY_CATEGORIES', () => {
  it('has high category with correct properties', () => {
    expect(QUALITY_CATEGORIES.high.label).toBe('High');
    expect(QUALITY_CATEGORIES.high.color).toBe('#22c55e');
    expect(QUALITY_CATEGORIES.high.bgColor).toBe('bg-green-100');
    expect(QUALITY_CATEGORIES.high.textColor).toBe('text-green-800');
  });

  it('has medium category with correct properties', () => {
    expect(QUALITY_CATEGORIES.medium.label).toBe('Medium');
    expect(QUALITY_CATEGORIES.medium.color).toBe('#f59e0b');
    expect(QUALITY_CATEGORIES.medium.bgColor).toBe('bg-yellow-100');
    expect(QUALITY_CATEGORIES.medium.textColor).toBe('text-yellow-800');
  });

  it('has low category with correct properties', () => {
    expect(QUALITY_CATEGORIES.low.label).toBe('Low');
    expect(QUALITY_CATEGORIES.low.color).toBe('#ef4444');
    expect(QUALITY_CATEGORIES.low.bgColor).toBe('bg-red-100');
    expect(QUALITY_CATEGORIES.low.textColor).toBe('text-red-800');
  });
});
