/**
 * Unit tests for repairWebhookJson utility
 *
 * Tests the deterministic jsonrepair library integration with:
 * - Valid JSON passthrough
 * - Common malformation repairs
 * - Error handling for unrepairable payloads
 * - Performance metadata tracking
 */

import { repairWebhookJson } from '@/lib/utils/repairWebhookJson';
import {
  VALID_JSON_STRING,
  MALFORMED_TRAILING_COMMA,
  MALFORMED_SINGLE_QUOTES,
  MALFORMED_UNQUOTED_KEYS,
  MALFORMED_TRUNCATED,
} from '../../fixtures/webhook-payloads';

describe('repairWebhookJson', () => {
  describe('valid JSON', () => {
    it('returns unchanged payload with wasMalformed=false', () => {
      const result = repairWebhookJson(VALID_JSON_STRING);

      expect(result.repaired).toBe(VALID_JSON_STRING);
      expect(result.wasMalformed).toBe(false);
      expect(result.issuesFound).toBe(0);
      expect(result.repairMetadata.repairStatus).toBe('none');
    });

    it('tracks payload size in bytes', () => {
      const result = repairWebhookJson(VALID_JSON_STRING);

      expect(result.repairMetadata.payloadSizeBytes).toBe(
        Buffer.byteLength(VALID_JSON_STRING, 'utf8'),
      );
    });

    it('tracks repair time in ms', () => {
      const result = repairWebhookJson(VALID_JSON_STRING);

      expect(result.repairMetadata.repairTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('malformed JSON repair', () => {
    it('repairs trailing commas', () => {
      const result = repairWebhookJson(MALFORMED_TRAILING_COMMA);

      expect(result.wasMalformed).toBe(true);
      expect(result.issuesFound).toBeGreaterThan(0);
      expect(result.repairMetadata.repairStatus).toBe('repaired');

      // Repaired JSON should be parseable
      const parsed = JSON.parse(result.repaired);
      expect(parsed.object).toBe('page');
    });

    it('repairs single quotes to double quotes', () => {
      const result = repairWebhookJson(MALFORMED_SINGLE_QUOTES);

      expect(result.wasMalformed).toBe(true);
      expect(result.repairMetadata.repairStatus).toBe('repaired');

      const parsed = JSON.parse(result.repaired);
      expect(parsed.object).toBe('page');
    });

    it('repairs unquoted keys', () => {
      const result = repairWebhookJson(MALFORMED_UNQUOTED_KEYS);

      expect(result.wasMalformed).toBe(true);
      expect(result.repairMetadata.repairStatus).toBe('repaired');

      const parsed = JSON.parse(result.repaired);
      expect(parsed.object).toBe('page');
    });

    it('attempts to repair truncated JSON', () => {
      const result = repairWebhookJson(MALFORMED_TRUNCATED);

      // jsonrepair may or may not succeed depending on truncation
      expect(['repaired', 'failed'].includes(result.repairMetadata.repairStatus)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty string input', () => {
      const result = repairWebhookJson('');

      expect(result.repaired).toBe('');
      expect(result.wasMalformed).toBe(false);
      expect(result.repairMetadata.repairStatus).toBe('skipped');
    });

    it('handles whitespace-only input', () => {
      const result = repairWebhookJson('   \n  ');

      expect(result.wasMalformed).toBe(false);
      expect(result.repairMetadata.repairStatus).toBe('skipped');
    });

    it('handles large valid payloads', () => {
      const largePayload = JSON.stringify({
        object: 'page',
        entry: Array.from({ length: 100 }, (_, i) => ({
          id: `entry_${i}`,
          time: Date.now(),
          changes: [
            {
              field: 'feed',
              value: {
                item: 'post',
                post_id: `post_${i}`,
                message: `Post number ${i} with some content`,
              },
            },
          ],
        })),
      });

      const result = repairWebhookJson(largePayload);

      expect(result.wasMalformed).toBe(false);
      expect(result.repairMetadata.payloadSizeBytes).toBeGreaterThan(1000);
    });

    it('sets wasMalformed=false when repair status is failed', () => {
      // jsonrepair is very permissive and wraps most input
      // as a JSON string rather than throwing. When it does
      // throw, we can't tell if input was malformed JSON or
      // arbitrary garbage, so wasMalformed must be false.
      const garbageInput = 'This is not JSON at all !!!@@@###';
      const result = repairWebhookJson(garbageInput);

      // repairStatus signals the outcome
      expect(['repaired', 'failed', 'none'].includes(result.repairMetadata.repairStatus)).toBe(
        true,
      );
      // wasMalformed is only true when jsonrepair
      // successfully changed the input
      if (result.repairMetadata.repairStatus === 'failed') {
        expect(result.wasMalformed).toBe(false);
        expect(result.repaired).toBe(garbageInput);
      }
    });
  });

  describe('determinism', () => {
    it('produces identical output on repeated calls', () => {
      const result1 = repairWebhookJson(MALFORMED_TRAILING_COMMA);
      const result2 = repairWebhookJson(MALFORMED_TRAILING_COMMA);

      expect(result1.repaired).toBe(result2.repaired);
      expect(result1.wasMalformed).toBe(result2.wasMalformed);
      expect(result1.issuesFound).toBe(result2.issuesFound);
    });
  });
});
