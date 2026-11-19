import { describe, it, expect } from '@jest/globals';
import { WEBHOOK_ENABLED_COLUMN } from '@/lib/facebook/webhookColumn';

describe('WEBHOOK_ENABLED_COLUMN', () => {
  it('resolves to the production column name', () => {
    expect(WEBHOOK_ENABLED_COLUMN).toBe('facebook_auto_updates_enabled');
  });

  it('is a non-empty string', () => {
    expect(typeof WEBHOOK_ENABLED_COLUMN).toBe('string');
    expect(WEBHOOK_ENABLED_COLUMN.length).toBeGreaterThan(0);
  });

  it('does not reference the renamed column', () => {
    expect(WEBHOOK_ENABLED_COLUMN).not.toContain('webhook_enabled');
  });
});
