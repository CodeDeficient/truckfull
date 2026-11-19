import { describe, it, expect } from '@jest/globals';
import { shouldUseFallback } from '@/lib/ai/ocrFallback';
import type { OcrIssue } from '@/lib/research/textQuality';

describe('shouldUseFallback', () => {
  it('returns true when garbled name detected', () => {
    const issues: OcrIssue[] = [
      { type: 'garbled_name', detail: 'name may be misread' },
    ];
    expect(shouldUseFallback(issues)).toBe(true);
  });

  it('returns true when low confidence detected', () => {
    const issues: OcrIssue[] = [
      { type: 'low_confidence', detail: 'low confidence' },
    ];
    expect(shouldUseFallback(issues)).toBe(true);
  });

  it('returns true for truncated URL', () => {
    const issues: OcrIssue[] = [
      { type: 'truncated_url', detail: 'URL truncated' },
    ];
    expect(shouldUseFallback(issues)).toBe(true);
  });

  it('returns false for empty issues', () => {
    expect(shouldUseFallback([])).toBe(false);
  });

  it('returns true when multiple issues detected', () => {
    const issues: OcrIssue[] = [
      { type: 'garbled_name', detail: 'a' },
      { type: 'low_confidence', detail: 'b' },
      { type: 'truncated_url', detail: 'c' },
    ];
    expect(shouldUseFallback(issues)).toBe(true);
  });

  it('returns false for null input', () => {
    expect(shouldUseFallback(null as unknown as OcrIssue[])).toBe(false);
  });
});
