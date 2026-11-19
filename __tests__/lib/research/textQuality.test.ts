import { describe, it, expect } from '@jest/globals';
import {
  detectAnnualPrefix,
  isLowConfidenceName,
  getOcrIssueSummary,
} from '@/lib/research/textQuality';

describe('detectAnnualPrefix', () => {
  it('detects 10th Annual', () => {
    expect(detectAnnualPrefix('10th Annual Juneteenth Augusta Festival')).toBe(10);
  });

  it('detects 1st Annual', () => {
    expect(detectAnnualPrefix('1st Annual Craft Fair')).toBe(1);
  });

  it('detects 2nd Annual', () => {
    expect(detectAnnualPrefix('2nd Annual Food Festival')).toBe(2);
  });

  it('detects 3rd Annual', () => {
    expect(detectAnnualPrefix('3rd Annual BBQ Cookoff')).toBe(3);
  });

  it('detects 4th Annual', () => {
    expect(detectAnnualPrefix('4th Annual Chili Challenge')).toBe(4);
  });

  it('detects 5th Annual', () => {
    expect(detectAnnualPrefix('5th Annual Makers Market')).toBe(5);
  });

  it('detects 21st Annual', () => {
    expect(detectAnnualPrefix('21st Annual Heritage Festival')).toBe(21);
  });

  it('detects 42nd Annual', () => {
    expect(detectAnnualPrefix('42nd Annual County Fair')).toBe(42);
  });

  it('detects 100th Annual', () => {
    expect(detectAnnualPrefix('100th Annual State Fair')).toBe(100);
  });

  it('detects lowercase annual prefix', () => {
    expect(detectAnnualPrefix('the 10th annual fall harvest')).toBe(10);
  });

  it('returns null for non-annual event names', () => {
    expect(detectAnnualPrefix('Summer Food Truck Rally')).toBeNull();
    expect(detectAnnualPrefix('4th of July Celebration')).toBeNull();
  });

  it('returns null for "Annual" without number', () => {
    expect(detectAnnualPrefix('Annual Spring Fling')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(detectAnnualPrefix('')).toBeNull();
  });

  it('does not match "4th of July" as annual', () => {
    expect(detectAnnualPrefix('4th of July at the Fairgrounds')).toBeNull();
  });

  it('matches annual even with "Annual" before number', () => {
    expect(detectAnnualPrefix('The Annual 7th Charity Gala')).toBe(7);
  });
});

describe('isLowConfidenceName', () => {
  it('returns true for very low confidence', () => {
    expect(isLowConfidenceName('4th of Fealty', 0.2)).toBe(true);
  });

  it('returns true for single uncommon word', () => {
    expect(isLowConfidenceName('Fealty', 0.3)).toBe(true);
  });

  it('returns false for high confidence names', () => {
    expect(isLowConfidenceName('4th of July Celebration', 0.8)).toBe(false);
  });

  it('returns false for reasonable names with decent confidence', () => {
    expect(isLowConfidenceName("Mama's Day Market", 0.6)).toBe(false);
  });

  it('returns true for empty name', () => {
    expect(isLowConfidenceName('', 0)).toBe(true);
  });

  it('returns true for whitespace-padded garbled name', () => {
    expect(isLowConfidenceName('  fealty  ', 0.4)).toBe(true);
  });
});

describe('getOcrIssueSummary', () => {
  it('detects garbled event name', () => {
    const issues = getOcrIssueSummary(
      'The 4th of Fealty at the Orangeburg County Fairgrounds',
      { name: '4th of Fealty', date: '2026-07-04', confidence: 0.3 },
    );
    expect(issues.some((i) => i.type === 'garbled_name')).toBe(true);
  });

  it('detects truncated URL ending abruptly', () => {
    const issues = getOcrIssueSummary(
      'Visit https://www.g for details',
      { name: 'Vendor Event', date: '2026-06-01', confidence: 0.7 },
    );
    expect(issues.some((i) => i.type === 'truncated_url')).toBe(true);
  });

  it('detects truncated URL missing TLD', () => {
    const issues = getOcrIssueSummary(
      'Tickets at https://eventbrite',
      { name: 'Festival', date: '2026-05-01', confidence: 0.7 },
    );
    expect(issues.some((i) => i.type === 'truncated_url')).toBe(true);
  });

  it('returns empty for clean text', () => {
    const issues = getOcrIssueSummary(
      'Join us for the 4th of July Celebration at 350 Magnolia Street, Orangeburg, SC',
      { name: '4th of July Celebration', date: '2026-07-04', confidence: 0.85 },
    );
    expect(issues).toHaveLength(0);
  });

  it('detects low confidence overall', () => {
    const issues = getOcrIssueSummary(
      'Some garbled text here',
      { name: 'Test Event', date: '2026-05-01', confidence: 0.25 },
    );
    expect(issues.some((i) => i.type === 'low_confidence')).toBe(true);
  });

  it('handles empty text', () => {
    const issues = getOcrIssueSummary('', { name: '', date: null, confidence: 0 });
    expect(issues).toHaveLength(0);
  });
});
