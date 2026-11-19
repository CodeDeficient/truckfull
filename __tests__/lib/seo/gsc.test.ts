import { describe, it, expect } from '@jest/globals';
import {
  defaultGscRequest,
  gscApiUrl,
  parseGscResponse,
  formatGscRows,
  aggregateByDate,
} from '@/lib/seo/gsc';

describe('defaultGscRequest', () => {
  it('should create request with date range and default dimensions', () => {
    const req = defaultGscRequest('2026-05-01', '2026-05-16');
    expect(req.startDate).toBe('2026-05-01');
    expect(req.endDate).toBe('2026-05-16');
    expect(req.dimensions).toContain('date');
    expect(req.dimensions).toContain('query');
    expect(req.dimensions).toContain('page');
    expect(req.rowLimit).toBe(25000);
  });
});

describe('gscApiUrl', () => {
  it('should construct the API URL with encoded site URL', () => {
    const url = gscApiUrl('sc-domain:truckfull.food');
    expect(url).toContain('searchconsole.googleapis.com');
    expect(url).toContain('sc-domain%3Atruckfull.food');
  });

  it('should handle full https site URLs', () => {
    const url = gscApiUrl('https://www.truckfull.food');
    expect(url).toContain('https%3A%2F%2F');
  });
});

describe('parseGscResponse', () => {
  it('should parse a valid GSC response into rows', () => {
    const response = {
      rows: [
        { keys: ['2026-05-16', 'best food trucks', '/augusta-ga'], clicks: 10, impressions: 200, ctr: 0.05, position: 4.2 },
        { keys: ['2026-05-16', 'food truck bbq', '/cuisine/bbq'], clicks: 5, impressions: 100, ctr: 0.05, position: 3.8 },
      ],
    };
    const rows = parseGscResponse(response);
    expect(rows).toHaveLength(2);
    expect(rows[0].keys).toContain('best food trucks');
    expect(rows[0].clicks).toBe(10);
    expect(rows[1].impressions).toBe(100);
  });

  it('should return empty array for null body', () => {
    expect(parseGscResponse(null)).toEqual([]);
  });

  it('should return empty array for body without rows', () => {
    expect(parseGscResponse({})).toEqual([]);
  });

  it('should handle empty rows array', () => {
    expect(parseGscResponse({ rows: [] })).toEqual([]);
  });

  it('should handle missing fields in row', () => {
    const response = { rows: [{ keys: ['2026-05-16'] }] };
    const rows = parseGscResponse(response);
    expect(rows).toHaveLength(1);
    expect(rows[0].clicks).toBe(0);
    expect(rows[0].impressions).toBe(0);
  });
});

describe('formatGscRows', () => {
  it('should format rows for Supabase insertion', () => {
    const rows = [
      { keys: ['2026-05-16', 'food trucks', '/'], clicks: 50, impressions: 1000, ctr: 0.05, position: 3.2 },
    ];
    const formatted = formatGscRows(rows);
    expect(formatted).toHaveLength(1);
    expect(formatted[0].date).toBe('2026-05-16');
    expect(formatted[0].query).toBe('food trucks');
    expect(formatted[0].page).toBe('/');
    expect(formatted[0].clicks).toBe(50);
    expect(formatted[0].collected_at).toBeDefined();
  });
});

describe('aggregateByDate', () => {
  it('should aggregate rows by date', () => {
    const rows = [
      { keys: ['2026-05-16', 'q1', '/a'], clicks: 10, impressions: 200, ctr: 0.05, position: 4.0 },
      { keys: ['2026-05-16', 'q2', '/b'], clicks: 20, impressions: 300, ctr: 0.06, position: 3.0 },
      { keys: ['2026-05-15', 'q3', '/c'], clicks: 5, impressions: 100, ctr: 0.05, position: 5.0 },
    ];
    const aggregated = aggregateByDate(rows);
    expect(aggregated).toHaveLength(2);
    const may16 = aggregated.find(a => a.date === '2026-05-16');
    expect(may16).toBeDefined();
    expect(may16!.clicks).toBe(30);
    expect(may16!.impressions).toBe(500);
  });

  it('should return empty array for empty input', () => {
    expect(aggregateByDate([])).toEqual([]);
  });

  it('should sort by date ascending', () => {
    const rows = [
      { keys: ['2026-05-16', 'q1', '/a'], clicks: 10, impressions: 200, ctr: 0.05, position: 4.0 },
      { keys: ['2026-05-15', 'q2', '/b'], clicks: 5, impressions: 100, ctr: 0.05, position: 5.0 },
    ];
    const aggregated = aggregateByDate(rows);
    expect(aggregated[0].date).toBe('2026-05-15');
    expect(aggregated[1].date).toBe('2026-05-16');
  });

  it('should handle rows with missing date key', () => {
    const rows = [
      { keys: [], clicks: 10, impressions: 200, ctr: 0.05, position: 4.0 },
    ];
    const aggregated = aggregateByDate(rows);
    expect(aggregated).toHaveLength(0);
  });
});
