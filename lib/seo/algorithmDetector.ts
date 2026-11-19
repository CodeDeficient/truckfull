/**
 * Algorithm change detection using statistical methods on rank time series.
 * Pure functions — testable with static fixtures.
 */

// A single rank observation over time
export interface RankTimePoint {
  date: string;
  position: number | null;
  keyword: string;
}

// Aggregate statistics for a date
export interface DailyRankStats {
  date: string;
  avgPosition: number;
  medianPosition: number;
  count: number;
  volatility: number;
}

// Anomaly detection result
export interface AnomalyResult {
  date: string;
  avgPosition: number;
  expectedRange: { low: number; high: number };
  isAnomaly: boolean;
  severity: 'none' | 'low' | 'medium' | 'high';
}

/**
 * Compute the median of a sorted array of numbers.
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Compute the Median Absolute Deviation (MAD) — a robust measure of variability.
 */
export function mad(values: number[]): number {
  if (values.length === 0) return 0;
  const med = median(values);
  const deviations = values.map((v) => Math.abs(v - med));
  return median(deviations);
}

/**
 * Aggregate rank time points by date, computing daily statistics.
 */
export function aggregateByDate(
  points: RankTimePoint[],
): DailyRankStats[] {
  const byDate = new Map<string, number[]>();
  for (const point of points) {
    if (point.position === null) continue;
    const existing = byDate.get(point.date) || [];
    existing.push(point.position);
    byDate.set(point.date, existing);
  }

  return [...byDate.entries()]
    .map(([date, positions]) => {
      const avgPosition = positions.reduce((s, p) => s + p, 0) / positions.length;
      const medPosition = median(positions);
      const variance = positions.reduce((s, p) => s + (p - avgPosition) ** 2, 0) / positions.length;
      return {
        date,
        avgPosition,
        medianPosition: medPosition,
        count: positions.length,
        volatility: Math.sqrt(variance),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Detect anomalies in rank data using MAD-based thresholding.
 * A point is anomalous if its position deviates from the median by more than
 * thresholdMultiplier * MAD.
 */
export function detectAnomalies(
  dailyStats: DailyRankStats[],
  thresholdMultiplier: number = 2,
): AnomalyResult[] {
  if (dailyStats.length === 0) return [];

  const positions = dailyStats.map((d) => d.avgPosition);
  const med = median(positions);
  const m = mad(positions);
  const threshold = m * thresholdMultiplier;

  return dailyStats.map((stat) => {
    const deviation = Math.abs(stat.avgPosition - med);
    const isAnomaly = deviation > threshold && m > 0;
    let severity: 'none' | 'low' | 'medium' | 'high' = 'none';
    if (isAnomaly) {
      const ratio = deviation / (m || 1);
      if (ratio >= 5) severity = 'high';
      else if (ratio >= 3) severity = 'medium';
      else severity = 'low';
    }

    return {
      date: stat.date,
      avgPosition: stat.avgPosition,
      expectedRange: {
        low: Math.max(1, Math.round(med - threshold)),
        high: Math.round(med + threshold),
      },
      isAnomaly,
      severity,
    };
  });
}

/**
 * Compute the volatility index for a period — higher values suggest
 * algorithm changes.
 */
export function volatilityIndex(stats: DailyRankStats[]): number {
  if (stats.length < 2) return 0;
  const volatilities = stats.map((s) => s.volatility);
  const avgVol = volatilities.reduce((s, v) => s + v, 0) / volatilities.length;
  return avgVol;
}

/**
 * Check if current volatility exceeds the baseline by a given factor.
 */
export function isVolatilitySpike(
  currentStats: DailyRankStats[],
  baselineStats: DailyRankStats[],
  factor: number = 2,
): boolean {
  if (currentStats.length === 0 || baselineStats.length === 0) return false;
  const currentVol = volatilityIndex(currentStats);
  const baselineVol = volatilityIndex(baselineStats);
  if (baselineVol === 0) return currentVol > 0;
  return currentVol / baselineVol > factor;
}
