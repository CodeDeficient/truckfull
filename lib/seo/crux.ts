/**
 * CrUX (Chrome User Experience Report) API client for Core Web Vitals monitoring.
 * Pure functions — no side effects, no API calls.
 */

/** Key page URLs to monitor */
export const CRUX_PAGES: string[] = [
  'https://www.truckfull.food/',
  'https://www.truckfull.food/augusta-ga',
  'https://www.truckfull.food/cuisine/bbq',
  'https://www.truckfull.food/city/augusta-ga',
];

/**
 * Build the CrUX API URL with the given API key.
 */
export function cruxApiUrl(apiKey: string): string {
  return `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${apiKey}`;
}

/**
 * Build the request body for querying a specific URL.
 */
export function cruxRequestBody(url: string): Record<string, unknown> {
  return {
    url,
    formFactor: 'PHONE',
    metrics: [
      'largest_contentful_paint',
      'first_contentful_paint',
      'cumulative_layout_shift',
      'interaction_to_next_paint',
    ],
  };
}

export interface CruxMetric {
  percentile: number;
  /** Histogram buckets with start, end, proportion */
  histogram: Array<{ start: number; end?: number; proportion: number }>;
}

export interface CruxRecord {
  url: string;
  collectionPeriod: {
    firstDate: { year: number; month: number; day: number };
    lastDate: { year: number; month: number; day: number };
  };
  record: {
    metrics: Record<string, CruxMetric>;
  };
}

export interface ParsedMetrics {
  p75: number | null;
  good: number | null;
}

/**
 * Parse a raw CrUX API response into a flat metrics map.
 * Returns null if the response is invalid.
 */
export function parseCruxResponse(
  url: string,
  responseBody: unknown,
): Record<string, ParsedMetrics> | null {
  try {
    const body = responseBody as Record<string, unknown>;
    if (!body || !body.record) return null;
    const record = body.record as { metrics?: Record<string, CruxMetric> };
    if (!record.metrics) return null;

    const result: Record<string, ParsedMetrics> = {};
    for (const [metricName, metric] of Object.entries(record.metrics)) {
      const p75 = metric.percentile ?? null;
      const goodFraction = metric.histogram?.[0]?.proportion ?? null;
      result[metricName] = { p75, good: goodFraction };
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Format a CrUX metrics object into a DB-ready row for Supabase insertion.
 */
export function formatCruxRow(
  url: string,
  metrics: Record<string, ParsedMetrics>,
): Record<string, unknown> {
  return {
    url,
    lcp_p75: metrics.largest_contentful_paint?.p75 ?? null,
    lcp_good_fraction: metrics.largest_contentful_paint?.good ?? null,
    fcp_p75: metrics.first_contentful_paint?.p75 ?? null,
    fcp_good_fraction: metrics.first_contentful_paint?.good ?? null,
    cls_p75: metrics.cumulative_layout_shift?.p75 ?? null,
    cls_good_fraction: metrics.cumulative_layout_shift?.good ?? null,
    inp_p75: metrics.interaction_to_next_paint?.p75 ?? null,
    inp_good_fraction: metrics.interaction_to_next_paint?.good ?? null,
    collected_at: new Date().toISOString(),
  };
}
