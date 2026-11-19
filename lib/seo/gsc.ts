/**
 * Google Search Console API pipeline — pure functions for GSC data processing.
 * No side effects, no API calls — testable with static fixtures.
 */

// GSC API query dimensions available
export type GscDimension = 'date' | 'query' | 'page' | 'country' | 'device' | 'searchAppearance';

// A single row from GSC Search Analytics
export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// GSC API request body
export interface GscRequest {
  startDate: string;
  endDate: string;
  dimensions: GscDimension[];
  rowLimit?: number;
  startRow?: number;
}

/**
 * Default GSC query — daily clicks, impressions, CTR, position by query + page.
 */
export function defaultGscRequest(startDate: string, endDate: string): GscRequest {
  return {
    startDate,
    endDate,
    dimensions: ['date', 'query', 'page'],
    rowLimit: 25_000,
  };
}

/**
 * Build the GSC API URL.
 */
export function gscApiUrl(siteUrl: string): string {
  const encoded = encodeURIComponent(siteUrl);
  return `https://searchconsole.googleapis.com/v1/sites/${encoded}/searchAnalytics/query`;
}

/**
 * Parse a GSC API response into flat rows ready for DB storage.
 */
export function parseGscResponse(responseBody: unknown): GscRow[] {
  if (!responseBody || typeof responseBody !== 'object') return [];
  const body = responseBody as Record<string, unknown>;
  const rows = body.rows;
  if (!Array.isArray(rows)) return [];
  return rows.map((row: unknown) => {
    const r = row as GscRow;
    return {
      keys: r.keys ?? [],
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    };
  });
}

/**
 * Format GSC rows for Supabase insertion.
 */
export function formatGscRows(
  rows: GscRow[],
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const [date, query, page] = row.keys;
    return {
      date,
      query,
      page,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      collected_at: new Date().toISOString(),
    };
  });
}

/**
 * Aggregate rows by date for trend monitoring.
 */
export function aggregateByDate(
  rows: GscRow[],
): Array<{ date: string; clicks: number; impressions: number; avgCtr: number; avgPosition: number }> {
  const byDate = new Map<string, { clicks: number; impressions: number; ctrSum: number; positionSum: number; count: number }>();
  for (const row of rows) {
    const date = row.keys[0];
    if (!date) continue;
    const existing = byDate.get(date) || { clicks: 0, impressions: 0, ctrSum: 0, positionSum: 0, count: 0 };
    existing.clicks += row.clicks;
    existing.impressions += row.impressions;
    existing.ctrSum += row.ctr;
    existing.positionSum += row.position;
    existing.count += 1;
    byDate.set(date, existing);
  }
  return [...byDate.entries()]
    .map(([date, stats]) => ({
      date,
      clicks: stats.clicks,
      impressions: stats.impressions,
      avgCtr: stats.count > 0 ? stats.ctrSum / stats.count : 0,
      avgPosition: stats.count > 0 ? stats.positionSum / stats.count : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
