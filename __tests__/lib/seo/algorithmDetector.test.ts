import { describe, it, expect } from '@jest/globals';
import {
  median,
  mad,
  aggregateByDate,
  detectAnomalies,
  volatilityIndex,
  isVolatilitySpike,
} from '@/lib/seo/algorithmDetector';
import type { RankTimePoint, DailyRankStats } from '@/lib/seo/algorithmDetector';

describe('median', () => {
  it('should compute median of odd-length array', () => {
    expect(median([1, 3, 5])).toBe(3);
  });

  it('should compute median of even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('should return 0 for empty array', () => {
    expect(median([])).toBe(0);
  });

  it('should handle single element', () => {
    expect(median([42])).toBe(42);
  });

  it('should handle unsorted input', () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it('should handle negative numbers', () => {
    expect(median([-5, -1, -3])).toBe(-3);
  });
});

describe('mad', () => {
  it('should compute Median Absolute Deviation', () => {
    const result = mad([1, 2, 3, 4, 5]);
    expect(result).toBeCloseTo(1, 0);
  });

  it('should return 0 for identical values', () => {
    expect(mad([5, 5, 5, 5])).toBe(0);
  });

  it('should return 0 for empty array', () => {
    expect(mad([])).toBe(0);
  });

  it('should be robust to outliers', () => {
    const result = mad([1, 2, 2, 3, 100]);
    expect(result).toBeCloseTo(1, 0);
  });

  it('should handle single element', () => {
    expect(mad([42])).toBe(0);
  });

  it('should handle two elements', () => {
    const result = mad([10, 20]);
    expect(result).toBeCloseTo(5, 0);
  });
});

describe('aggregateByDate', () => {
  it('should aggregate multiple keywords per date', () => {
    const points: RankTimePoint[] = [
      { date: '2026-05-16', position: 3, keyword: 'kw1' },
      { date: '2026-05-16', position: 5, keyword: 'kw2' },
      { date: '2026-05-15', position: 4, keyword: 'kw1' },
    ];
    const stats = aggregateByDate(points);
    expect(stats).toHaveLength(2);
    expect(stats[0].date).toBe('2026-05-15');
    expect(stats[1].avgPosition).toBe(4); // (3+5)/2
  });

  it('should skip null positions', () => {
    const points: RankTimePoint[] = [
      { date: '2026-05-16', position: null, keyword: 'kw1' },
      { date: '2026-05-16', position: 3, keyword: 'kw2' },
    ];
    const stats = aggregateByDate(points);
    expect(stats).toHaveLength(1);
    expect(stats[0].avgPosition).toBe(3);
  });

  it('should return empty for empty input', () => {
    expect(aggregateByDate([])).toEqual([]);
  });

  it('should sort by date ascending', () => {
    const points: RankTimePoint[] = [
      { date: '2026-05-17', position: 2, keyword: 'kw1' },
      { date: '2026-05-16', position: 3, keyword: 'kw1' },
    ];
    const stats = aggregateByDate(points);
    expect(stats[0].date).toBe('2026-05-16');
    expect(stats[1].date).toBe('2026-05-17');
  });

  it('should compute correct volatility (stddev)', () => {
    const points: RankTimePoint[] = [
      { date: '2026-05-16', position: 2, keyword: 'kw1' },
      { date: '2026-05-16', position: 4, keyword: 'kw2' },
      { date: '2026-05-16', position: 6, keyword: 'kw3' },
    ];
    const stats = aggregateByDate(points);
    expect(stats).toHaveLength(1);
    expect(stats[0].avgPosition).toBe(4);
    expect(stats[0].medianPosition).toBe(4);
    expect(stats[0].count).toBe(3);
    // variance = ((2-4)^2 + (4-4)^2 + (6-4)^2) / 3 = (4+0+4)/3 = 2.666...
    // stddev = sqrt(2.666...) ≈ 1.633
    expect(stats[0].volatility).toBeCloseTo(1.633, 1);
  });

  it('should handle all null positions gracefully', () => {
    const points: RankTimePoint[] = [
      { date: '2026-05-16', position: null, keyword: 'kw1' },
      { date: '2026-05-16', position: null, keyword: 'kw2' },
    ];
    const stats = aggregateByDate(points);
    expect(stats).toEqual([]);
  });
});

describe('detectAnomalies', () => {
  it('should detect an obvious outlier', () => {
    // Positions: 3, 3, 3, 15, 4
    // Median = 3, deviations = [0, 0, 0, 12, 1], sorted = [0, 0, 0, 1, 12], MAD = 0 (still 0!)
    // Need values where MAD > 0. Use: 3, 4, 3, 15, 5
    // Sorted: 3, 3, 4, 5, 15. Median = 4. Deviations: [1, 0, 1, 11, 1]. Sorted: [0, 1, 1, 1, 11]. MAD = 1.
    // Threshold = 1 * 2 = 2. Deviation of 15 = 11 > 2 => anomaly.
    const stats: DailyRankStats[] = [
      { date: '2026-05-10', avgPosition: 3, medianPosition: 3, count: 10, volatility: 0.5 },
      { date: '2026-05-11', avgPosition: 4, medianPosition: 4, count: 10, volatility: 0.5 },
      { date: '2026-05-12', avgPosition: 3, medianPosition: 3, count: 10, volatility: 0.5 },
      { date: '2026-05-13', avgPosition: 15, medianPosition: 15, count: 10, volatility: 5 }, // anomaly
      { date: '2026-05-14', avgPosition: 5, medianPosition: 5, count: 10, volatility: 0.5 },
    ];
    const anomalies = detectAnomalies(stats);
    const may13 = anomalies.find((a) => a.date === '2026-05-13');
    expect(may13).toBeDefined();
    expect(may13!.isAnomaly).toBe(true);
    expect(may13!.severity).toBe('high');
  });

  it('should return empty for empty input', () => {
    expect(detectAnomalies([])).toEqual([]);
  });

  it('should have no anomalies for stable data', () => {
    const stats: DailyRankStats[] = [
      { date: '2026-05-10', avgPosition: 3, medianPosition: 3, count: 10, volatility: 0.3 },
      { date: '2026-05-11', avgPosition: 4, medianPosition: 4, count: 10, volatility: 0.3 },
      { date: '2026-05-12', avgPosition: 3, medianPosition: 3, count: 10, volatility: 0.3 },
    ];
    const anomalies = detectAnomalies(stats);
    expect(anomalies.every((a) => !a.isAnomaly)).toBe(true);
  });

  it('should use custom threshold multiplier', () => {
    const stats: DailyRankStats[] = [
      { date: '2026-05-10', avgPosition: 2, medianPosition: 2, count: 10, volatility: 0.5 },
      { date: '2026-05-11', avgPosition: 2, medianPosition: 2, count: 10, volatility: 0.5 },
      { date: '2026-05-12', avgPosition: 6, medianPosition: 6, count: 10, volatility: 2 },
    ];
    // With multiplier = 10, the 4-point deviation should not be anomalous
    const anomalies = detectAnomalies(stats, 10);
    const may12 = anomalies.find((a) => a.date === '2026-05-12');
    expect(may12!.isAnomaly).toBe(false);
  });

  it('should assign correct severity levels', () => {
    // Positions: [10, 11, 12, 20, 50]
    // Sorted: [10, 11, 12, 20, 50]. Median = 12.
    // Deviations: [2, 1, 0, 8, 38]. Sorted deviations: [0, 1, 2, 8, 38]. MAD = 2.
    // Threshold = 2 * 2 = 4.
    // Position 10: deviation 2 < 4 => none
    // Position 11: deviation 1 < 4 => none
    // Position 12: deviation 0 < 4 => none
    // Position 20: deviation 8 > 4, ratio=4 => medium
    // Position 50: deviation 38 > 4, ratio=19 => high
    const stats: DailyRankStats[] = [
      { date: 'a', avgPosition: 10, medianPosition: 10, count: 10, volatility: 1 },
      { date: 'b', avgPosition: 11, medianPosition: 11, count: 10, volatility: 1 },
      { date: 'c', avgPosition: 12, medianPosition: 12, count: 10, volatility: 1 },
      { date: 'd', avgPosition: 20, medianPosition: 20, count: 10, volatility: 5 },
      { date: 'e', avgPosition: 50, medianPosition: 50, count: 10, volatility: 5 },
    ];
    const anomalies = detectAnomalies(stats, 2);
    expect(anomalies[0].severity).toBe('none');
    expect(anomalies[1].severity).toBe('none');
    expect(anomalies[2].severity).toBe('none');
    expect(anomalies[3].severity).toBe('medium');
    expect(anomalies[4].severity).toBe('high');
  });

  it('should return expected range in the result', () => {
    const stats: DailyRankStats[] = [
      { date: 'a', avgPosition: 3, medianPosition: 3, count: 10, volatility: 0.5 },
      { date: 'b', avgPosition: 4, medianPosition: 4, count: 10, volatility: 0.5 },
      { date: 'c', avgPosition: 3, medianPosition: 3, count: 10, volatility: 0.5 },
    ];
    const anomalies = detectAnomalies(stats);
    expect(anomalies[0].expectedRange).toBeDefined();
    expect(anomalies[0].expectedRange.low).toBeLessThanOrEqual(anomalies[0].expectedRange.high);
  });
});

describe('volatilityIndex', () => {
  it('should compute average volatility across days', () => {
    const stats: DailyRankStats[] = [
      { date: 'a', avgPosition: 3, medianPosition: 3, count: 10, volatility: 1 },
      { date: 'b', avgPosition: 3, medianPosition: 3, count: 10, volatility: 3 },
    ];
    expect(volatilityIndex(stats)).toBe(2);
  });

  it('should return 0 for fewer than 2 data points', () => {
    const stats: DailyRankStats[] = [{ date: 'a', avgPosition: 3, medianPosition: 3, count: 10, volatility: 1 }];
    expect(volatilityIndex(stats)).toBe(0);
  });

  it('should return 0 for empty input', () => {
    expect(volatilityIndex([])).toBe(0);
  });

  it('should handle many data points', () => {
    const stats: DailyRankStats[] = [
      { date: 'a', avgPosition: 3, medianPosition: 3, count: 10, volatility: 1 },
      { date: 'b', avgPosition: 3, medianPosition: 3, count: 10, volatility: 2 },
      { date: 'c', avgPosition: 3, medianPosition: 3, count: 10, volatility: 3 },
      { date: 'd', avgPosition: 3, medianPosition: 3, count: 10, volatility: 4 },
    ];
    expect(volatilityIndex(stats)).toBe(2.5);
  });
});

describe('isVolatilitySpike', () => {
  it('should detect a volatility spike', () => {
    const current = [
      { date: 'a', avgPosition: 3, medianPosition: 3, count: 10, volatility: 5 },
      { date: 'b', avgPosition: 3, medianPosition: 3, count: 10, volatility: 5 },
    ];
    const baseline = [
      { date: 'c', avgPosition: 3, medianPosition: 3, count: 10, volatility: 1 },
    ];
    expect(isVolatilitySpike(current, baseline)).toBe(true);
  });

  it('should not flag stable data', () => {
    // current vol = (1+1)/2 = 1, baseline vol = (1+1)/2 = 1, ratio = 1 -> NOT > 2
    const current = [
      { date: 'a', avgPosition: 3, medianPosition: 3, count: 10, volatility: 1 },
      { date: 'b', avgPosition: 3, medianPosition: 3, count: 10, volatility: 1 },
    ];
    const baseline = [
      { date: 'c', avgPosition: 3, medianPosition: 3, count: 10, volatility: 1 },
      { date: 'd', avgPosition: 3, medianPosition: 3, count: 10, volatility: 1 },
    ];
    expect(isVolatilitySpike(current, baseline)).toBe(false);
  });

  it('should return false for empty inputs', () => {
    const current: DailyRankStats[] = [];
    const baseline: DailyRankStats[] = [{ date: 'a', avgPosition: 3, medianPosition: 3, count: 10, volatility: 1 }];
    expect(isVolatilitySpike(current, baseline)).toBe(false);
  });

  it('should handle zero baseline volatility', () => {
    // current vol = (1+1)/2 = 1, baseline vol = 0, so 1 > 0 => spike
    const current = [
      { date: 'a', avgPosition: 3, medianPosition: 3, count: 10, volatility: 1 },
      { date: 'b', avgPosition: 3, medianPosition: 3, count: 10, volatility: 1 },
    ];
    const baseline = [
      { date: 'c', avgPosition: 4, medianPosition: 4, count: 5, volatility: 0 },
      { date: 'd', avgPosition: 4, medianPosition: 4, count: 5, volatility: 0 },
    ];
    expect(isVolatilitySpike(current, baseline)).toBe(true);
  });

  it('should respect custom factor parameter', () => {
    // current vol = (4+4)/2 = 4, baseline vol = 2, ratio = 2 -> NOT > 3
    const current = [
      { date: 'a', avgPosition: 3, medianPosition: 3, count: 10, volatility: 4 },
      { date: 'b', avgPosition: 3, medianPosition: 3, count: 10, volatility: 4 },
    ];
    const baseline = [
      { date: 'c', avgPosition: 3, medianPosition: 3, count: 10, volatility: 2 },
      { date: 'd', avgPosition: 3, medianPosition: 3, count: 10, volatility: 2 },
    ];
    expect(isVolatilitySpike(current, baseline, 3)).toBe(false);
  });

  it('should return false when both inputs are empty', () => {
    expect(isVolatilitySpike([], [])).toBe(false);
  });
});
