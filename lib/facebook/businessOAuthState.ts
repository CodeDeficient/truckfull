import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  decodeFacebookBusinessState,
  encodeFacebookBusinessState,
  type FacebookBusinessStatePayload,
} from '@/lib/facebook/businessOAuth';

interface VerifyOptions {
  nowEpochSeconds?: number;
  maxAgeSeconds?: number;
}

interface VerifyResult {
  valid: boolean;
  payload: FacebookBusinessStatePayload | null;
  error?: 'invalid_format' | 'invalid_signature' | 'invalid_payload' | 'expired_state';
}

function signValue(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createSignedFacebookBusinessState(
  payload: FacebookBusinessStatePayload,
  secret: string,
): string {
  const encodedPayload = encodeFacebookBusinessState(payload);
  const signature = signValue(encodedPayload, secret);
  return `${signature}.${encodedPayload}`;
}

export function verifySignedFacebookBusinessState(
  signedState: string,
  secret: string,
  options: VerifyOptions = {},
): VerifyResult {
  const [signature, encodedPayload] = signedState.split('.', 2);

  if (!signature || !encodedPayload) {
    return { valid: false, payload: null, error: 'invalid_format' };
  }

  const expectedSignature = signValue(encodedPayload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return { valid: false, payload: null, error: 'invalid_signature' };
  }

  const payload = decodeFacebookBusinessState(encodedPayload);
  if (!payload) {
    return { valid: false, payload: null, error: 'invalid_payload' };
  }

  const nowEpochSeconds = options.nowEpochSeconds ?? Math.floor(Date.now() / 1000);
  const maxAgeSeconds = options.maxAgeSeconds ?? 600;
  const ageSeconds = nowEpochSeconds - payload.issuedAt;

  if (ageSeconds < 0 || ageSeconds > maxAgeSeconds) {
    return { valid: false, payload: null, error: 'expired_state' };
  }

  return { valid: true, payload };
}
