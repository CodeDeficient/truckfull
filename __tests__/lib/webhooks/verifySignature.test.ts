import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import crypto from 'node:crypto';

describe('verifyWebhookSignature', () => {
  let verifyWebhookSignature: typeof import('@/lib/webhooks/verifySignature').verifyWebhookSignature;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    jest.resetModules();
    originalEnv = process.env.META_WEBHOOK_APP_SECRET;
    verifyWebhookSignature = (await import('@/lib/webhooks/verifySignature')).verifyWebhookSignature;
  });

  afterEach(() => {
    process.env.META_WEBHOOK_APP_SECRET = originalEnv;
    jest.resetModules();
  });

  it('should throw error if META_WEBHOOK_APP_SECRET is not set', async () => {
    delete process.env.META_WEBHOOK_APP_SECRET;

    await expect(verifyWebhookSignature('body', 'sig')).rejects.toThrow(
      'META_WEBHOOK_APP_SECRET is not configured'
    );
  });

  it('should return true for valid HMAC signature', async () => {
    process.env.META_WEBHOOK_APP_SECRET = 'test-secret';

    const rawBody = 'test body';
    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', 'test-secret').update(rawBody).digest('hex');

    const result = await verifyWebhookSignature(rawBody, expectedSignature);
    expect(result).toBe(true);
  });

  it('should return false for invalid signature', async () => {
    process.env.META_WEBHOOK_APP_SECRET = 'test-secret';

    const result = await verifyWebhookSignature('test body', 'sha256=invalid');
    expect(result).toBe(false);
  });

  it('should return false for signature with wrong prefix', async () => {
    process.env.META_WEBHOOK_APP_SECRET = 'test-secret';

    const result = await verifyWebhookSignature('test body', 'md5=abc123');
    expect(result).toBe(false);
  });

  it('should return false for empty signature', async () => {
    process.env.META_WEBHOOK_APP_SECRET = 'test-secret';

    const result = await verifyWebhookSignature('test body', '');
    expect(result).toBe(false);
  });
});
