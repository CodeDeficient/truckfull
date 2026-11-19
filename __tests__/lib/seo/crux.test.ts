import { describe, it, expect } from '@jest/globals';
import {
  cruxApiUrl,
  cruxRequestBody,
  CRUX_PAGES,
  parseCruxResponse,
  formatCruxRow,
} from '@/lib/seo/crux';

describe('cruxApiUrl', () => {
  it('should construct the CrUX API URL with the given key', () => {
    const url = cruxApiUrl('test-key-123');
    expect(url).toContain('chromeuxreport.googleapis.com');
    expect(url).toContain('test-key-123');
  });
});

describe('cruxRequestBody', () => {
  it('should include the URL and PHONE form factor', () => {
    const body = cruxRequestBody('https://example.com');
    expect(body.url).toBe('https://example.com');
    expect(body.formFactor).toBe('PHONE');
  });

  it('should include all four Core Web Vitals metrics', () => {
    const body = cruxRequestBody('https://example.com');
    expect(body.metrics).toContain('largest_contentful_paint');
    expect(body.metrics).toContain('first_contentful_paint');
    expect(body.metrics).toContain('cumulative_layout_shift');
    expect(body.metrics).toContain('interaction_to_next_paint');
    expect(body.metrics).toHaveLength(4);
  });
});

describe('CRUX_PAGES', () => {
  it('should include at least the homepage', () => {
    expect(CRUX_PAGES.length).toBeGreaterThanOrEqual(1);
    expect(CRUX_PAGES[0]).toBe('https://www.truckfull.food/');
  });
});

describe('parseCruxResponse', () => {
  it('should parse a valid CrUX response into metrics', () => {
    const response = {
      record: {
        metrics: {
          largest_contentful_paint: {
            percentile: 2500,
            histogram: [{ start: 0, end: 2500, proportion: 0.75 }],
          },
          cumulative_layout_shift: {
            percentile: 0.15,
            histogram: [{ start: 0, end: 0.1, proportion: 0.6 }],
          },
        },
      },
    };
    const parsed = parseCruxResponse('https://example.com', response);
    expect(parsed).not.toBeNull();
    expect(parsed!.largest_contentful_paint.p75).toBe(2500);
    expect(parsed!.cumulative_layout_shift.p75).toBe(0.15);
    expect(parsed!.largest_contentful_paint.good).toBe(0.75);
  });

  it('should return null for null response body', () => {
    expect(parseCruxResponse('https://example.com', null)).toBeNull();
  });

  it('should return null for response without record', () => {
    expect(parseCruxResponse('https://example.com', { foo: 'bar' })).toBeNull();
  });

  it('should return null for response with null record', () => {
    const parsed = parseCruxResponse('https://example.com', { record: null });
    expect(parsed).toBeNull();
  });

  it('should handle response with record but no metrics', () => {
    const parsed = parseCruxResponse('https://example.com', { record: { no_metrics: true } });
    expect(parsed).toBeNull();
  });

  it('should handle empty metrics', () => {
    const parsed = parseCruxResponse('https://example.com', { record: { metrics: {} } });
    expect(parsed).not.toBeNull();
    expect(Object.keys(parsed!)).toHaveLength(0);
  });
});

describe('formatCruxRow', () => {
  it('should flatten metrics into a DB-ready row', () => {
    const metrics = {
      largest_contentful_paint: { p75: 2000, good: 0.8 },
      cumulative_layout_shift: { p75: 0.05, good: 0.9 },
    };
    const row = formatCruxRow('https://example.com', metrics);
    expect(row.url).toBe('https://example.com');
    expect(row.lcp_p75).toBe(2000);
    expect(row.lcp_good_fraction).toBe(0.8);
    expect(row.cls_p75).toBe(0.05);
    expect(row.cls_good_fraction).toBe(0.9);
    expect(row.collected_at).toBeDefined();
  });

  it('should handle null p75 and good values', () => {
    const metrics = {
      largest_contentful_paint: { p75: null, good: null },
    };
    const row = formatCruxRow('https://example.com', metrics);
    expect(row.lcp_p75).toBeNull();
    expect(row.lcp_good_fraction).toBeNull();
  });

  it('should handle missing metrics by returning null values', () => {
    const row = formatCruxRow('https://example.com', {});
    expect(row.lcp_p75).toBeNull();
    expect(row.inp_p75).toBeNull();
    expect(row.fcp_good_fraction).toBeNull();
  });

  it('should include all eight metric fields plus url and collected_at', () => {
    const metrics = {
      largest_contentful_paint: { p75: 2000, good: 0.75 },
      first_contentful_paint: { p75: 1500, good: 0.8 },
      cumulative_layout_shift: { p75: 0.1, good: 0.85 },
      interaction_to_next_paint: { p75: 300, good: 0.7 },
    };
    const row = formatCruxRow('https://example.com', metrics);
    expect(Object.keys(row)).toHaveLength(10); // 8 metric fields + url + collected_at
    expect(row.lcp_p75).toBe(2000);
    expect(row.fcp_p75).toBe(1500);
    expect(row.cls_p75).toBe(0.1);
    expect(row.inp_p75).toBe(300);
  });
});
