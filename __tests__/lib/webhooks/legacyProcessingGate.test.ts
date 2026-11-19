/**
 * Tests for the legacy post-processing gate (lib/webhooks/legacyProcessingGate.ts).
 *
 * The legacy writer entry points must be unreachable by default in
 * Production and re-enabled only by an explicit environment flag.
 * Route-level disabled-path behavior is covered by Playwright E2E per the
 * project API-route testing rule; the flag-enabled route path is not
 * currently covered at the route level.
 */

import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { isLegacyProcessingEnabled } from '@/lib/webhooks/legacyProcessingGate';

const FLAG = 'ENABLE_LEGACY_POST_PROCESSING';

describe('isLegacyProcessingEnabled', () => {
  const originalFlag = process.env[FLAG];

  beforeEach(() => {
    delete process.env[FLAG];
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env[FLAG];
    } else {
      process.env[FLAG] = originalFlag;
    }
  });

  it('is disabled when the flag is unset (Production default)', () => {
    expect(isLegacyProcessingEnabled()).toBe(false);
  });

  it('is enabled only by the exact string "true"', () => {
    process.env[FLAG] = 'true';
    expect(isLegacyProcessingEnabled()).toBe(true);
  });

  it('treats any other value as disabled', () => {
    process.env[FLAG] = 'TRUE';
    expect(isLegacyProcessingEnabled()).toBe(false);
    process.env[FLAG] = '1';
    expect(isLegacyProcessingEnabled()).toBe(false);
    process.env[FLAG] = 'false';
    expect(isLegacyProcessingEnabled()).toBe(false);
  });
});
