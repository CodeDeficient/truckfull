import type { OcrIssue } from '@/lib/research/textQuality';

export type { OcrIssue } from '@/lib/research/textQuality';

export function shouldUseFallback(issues: OcrIssue[]): boolean {
  if (!issues || !Array.isArray(issues)) return false;
  return issues.length > 0;
}
