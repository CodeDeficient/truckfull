/**
 * JSON Repair Utility for Webhook Payloads
 *
 * Uses the deterministic `jsonrepair` library (NOT AI) to fix common
 * JSON malformation issues from Facebook webhooks:
 * - Trailing commas
 * - Missing quotes around keys
 * - Truncated structures
 * - Single quotes instead of double quotes
 */

import { jsonrepair } from 'jsonrepair';

export interface RepairResult {
  /** The repaired (or original if valid) JSON string */
  repaired: string;
  /** Number of character-level differences found */
  issuesFound: number;
  /** Whether the original payload was malformed */
  wasMalformed: boolean;
  /** Metadata about the repair operation */
  repairMetadata: RepairMetadata;
}

export interface RepairMetadata {
  repairTimeMs: number;
  payloadSizeBytes: number;
  repairStatus: 'none' | 'repaired' | 'failed' | 'skipped';
}

/**
 * Attempt to repair a potentially malformed JSON webhook payload.
 *
 * @param rawBody - The raw request body string
 * @returns RepairResult with repaired payload and metadata
 */
export function repairWebhookJson(rawBody: string): RepairResult {
  const startTime = performance.now();
  const payloadSizeBytes = Buffer.byteLength(rawBody, 'utf8');

  // Empty or whitespace-only input — skip repair
  if (rawBody.trim().length === 0) {
    return {
      repaired: rawBody,
      issuesFound: 0,
      wasMalformed: false,
      repairMetadata: {
        repairTimeMs: Math.round(performance.now() - startTime),
        payloadSizeBytes,
        repairStatus: 'skipped',
      },
    };
  }

  try {
    const repaired = jsonrepair(rawBody);
    const wasMalformed = repaired !== rawBody;
    const issuesFound = wasMalformed ? countDifferences(rawBody, repaired) : 0;
    const repairTimeMs = Math.round(performance.now() - startTime);

    return {
      repaired,
      issuesFound,
      wasMalformed,
      repairMetadata: {
        repairTimeMs,
        payloadSizeBytes,
        repairStatus: wasMalformed ? 'repaired' : 'none',
      },
    };
  } catch {
    // jsonrepair itself threw — payload is beyond repair.
    // We can't determine if input was malformed JSON or arbitrary
    // garbage, so wasMalformed stays false. repairStatus: 'failed'
    // already signals the failure.
    const repairTimeMs = Math.round(performance.now() - startTime);
    return {
      repaired: rawBody,
      issuesFound: 0,
      wasMalformed: false,
      repairMetadata: {
        repairTimeMs,
        payloadSizeBytes,
        repairStatus: 'failed',
      },
    };
  }
}

/**
 * Count character-level differences between two strings.
 * Used to estimate the number of issues jsonrepair fixed.
 */
function countDifferences(original: string, repaired: string): number {
  const maxLen = Math.max(original.length, repaired.length);
  let differences = 0;
  for (let i = 0; i < maxLen; i++) {
    if (original[i] !== repaired[i]) {
      differences++;
    }
  }
  return differences;
}
