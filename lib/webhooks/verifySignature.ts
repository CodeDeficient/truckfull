import crypto from 'node:crypto';

export async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  const appSecret = process.env.FACEBOOK_BUSINESS_APP_SECRET || process.env.META_WEBHOOK_APP_SECRET;

  if (!appSecret) {
    throw new Error(
      'FACEBOOK_BUSINESS_APP_SECRET or META_WEBHOOK_APP_SECRET is not configured. ' +
        'Webhook signature verification requires this environment variable. ' +
        'Set it in your .env.local or deployment environment variables.',
    );
  }

  const expectedSignature =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedBuf.length) {
    // Compare anyway for constant-time safety, but always reject length mismatches
    const paddedSig = Buffer.alloc(expectedBuf.length);
    sigBuf.copy(paddedSig);
    crypto.timingSafeEqual(paddedSig, expectedBuf);
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}
