import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getCachedEvents, setCachedEvents, clearCache } from '@/lib/events/eventCache';

describe('eventCache', () => {
  beforeEach(() => {
    clearCache();
  });

  it('returns null for cache miss', () => {
    expect(getCachedEvents('future')).toBeNull();
  });

  it('returns cached events on hit within TTL', () => {
    const data = [{ id: '1' }] as any[];
    setCachedEvents('future', data);
    const result = getCachedEvents('future');
    expect(result?.events).toEqual(data);
  });

  it('returns radiusCap on hit when stored', () => {
    setCachedEvents('future', [{ id: '1' }] as any[], 300);
    const result = getCachedEvents('future');
    expect(result?.radiusCap).toBe(300);
  });

  it('returns undefined radiusCap when not stored', () => {
    setCachedEvents('future', [{ id: '1' }] as any[]);
    const result = getCachedEvents('future');
    expect(result?.radiusCap).toBeUndefined();
  });

  it('returns null after TTL expires', () => {
    jest.useFakeTimers();
    const data = [{ id: '1' }] as any[];
    setCachedEvents('future', data);
    jest.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(getCachedEvents('future')).toBeNull();
    jest.useRealTimers();
  });

  it('distinguishes keys', () => {
    const futureData = [{ id: 'future' }] as any[];
    const pastData = [{ id: 'past' }] as any[];
    setCachedEvents('future', futureData, 100);
    setCachedEvents('past', pastData, 100);
    expect(getCachedEvents('future')?.events).toEqual(futureData);
    expect(getCachedEvents('past')?.events).toEqual(pastData);
  });

  it('replaces cache entry on second set', () => {
    const oldData = [{ id: 'old' }] as any[];
    const newData = [{ id: 'new' }] as any[];
    setCachedEvents('future', oldData, 100);
    setCachedEvents('future', newData, 300);
    const result = getCachedEvents('future');
    expect(result?.events).toEqual(newData);
    expect(result?.radiusCap).toBe(300);
  });

  it('clears all entries on clearCache', () => {
    setCachedEvents('future', [{ id: '1' }] as any[]);
    setCachedEvents('past', [{ id: '2' }] as any[]);
    clearCache();
    expect(getCachedEvents('future')).toBeNull();
    expect(getCachedEvents('past')).toBeNull();
  });

  it('handles empty arrays', () => {
    setCachedEvents('future', []);
    const result = getCachedEvents('future');
    expect(result?.events).toEqual([]);
  });

  it('isolates entries by tier suffix (regression: cross-user radiusCap leak)', () => {
    setCachedEvents('future:pro', [{ id: '1' }] as any[], 300);
    expect(getCachedEvents('future:free')).toBeNull();
  });
});