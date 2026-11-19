import { describe, it, expect } from '@jest/globals';
import { buildEventsUrl } from '@/lib/events/buildEventsUrl';

describe('buildEventsUrl', () => {
  it('builds base URL with period and all flag', () => {
    const url = buildEventsUrl('future');
    expect(url).toContain('period=future');
    expect(url).toContain('all=true');
    expect(url).toContain('status=published');
  });

  it('does NOT include geo params (lat/lng/radiusMiles)', () => {
    const url = buildEventsUrl('future');
    expect(url).not.toContain('lat=');
    expect(url).not.toContain('lng=');
    expect(url).not.toContain('radiusMiles=');
  });

  it('does NOT include filter params (startDate/endDate/minVettingScore/q)', () => {
    const url = buildEventsUrl('future');
    expect(url).not.toContain('startDate=');
    expect(url).not.toContain('endDate=');
    expect(url).not.toContain('minVettingScore=');
    expect(url).not.toContain('q=');
  });

  it('handles past period', () => {
    const url = buildEventsUrl('past');
    expect(url).toContain('period=past');
  });

  it('respects URLSearchParams encoding', () => {
    const url = buildEventsUrl('future');
    expect(url).toMatch(/^\/api\/events\?/);
    expect(url.split('?')[1]).not.toBe('');
  });
});