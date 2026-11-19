import { describe, it, expect } from '@jest/globals';
import { getConfidenceBadge } from '@/lib/events/confidenceBadge';

describe('getConfidenceBadge', () => {
  it('returns strong_signals for a high score', () => {
    const badge = getConfidenceBadge(89);
    expect(badge.tier).toBe('strong_signals');
    expect(badge.label).toBe('Strong Signals');
  });

  it('returns strong_signals at the boundary (score 50)', () => {
    expect(getConfidenceBadge(50).tier).toBe('strong_signals');
  });

  it('returns under_review for score 49', () => {
    expect(getConfidenceBadge(49).tier).toBe('under_review');
  });

  it('returns under_review for a low score', () => {
    expect(getConfidenceBadge(30).tier).toBe('under_review');
  });

  it('never returns a verified tier', () => {
    for (const score of [0, 30, 50, 60, 89, 100]) {
      expect(getConfidenceBadge(score).tier).not.toBe('verified');
    }
  });

  it('every tier has a non-empty label, fill, and color', () => {
    for (const score of [89, 30] as const) {
      const badge = getConfidenceBadge(score);
      expect(badge.label.length).toBeGreaterThan(0);
      expect(badge.color.length).toBeGreaterThan(0);
      expect(badge.pillBg.length).toBeGreaterThan(0);
      expect(badge.pillFg.length).toBeGreaterThan(0);
    }
  });

  it('exposes no tooltip field', () => {
    for (const score of [89, 30] as const) {
      expect(getConfidenceBadge(score)).not.toHaveProperty('tooltip');
    }
  });
});
