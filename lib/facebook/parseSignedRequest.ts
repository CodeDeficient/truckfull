import { createHmac, timingSafeEqual } from 'node:crypto';
import { logMessage } from '@/lib/logging';

export interface FacebookSignedRequestPayload {
  user_id?: string;
  code?: string;
  algorithm?: string;
  issued_at?: number;
  oauth_token?: string;
}

function base64UrlDecode(str: string): string {
  let base64 = str.replaceAll('-', '+').replaceAll('_', '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function parseSignedRequest(
  signedRequest: string,
  appSecret: string,
): FacebookSignedRequestPayload | null {
  try {
    const [encodedSig, payload] = signedRequest.split('.');
    if (!encodedSig || !payload) {
      return null;
    }

    const expectedSig = createHmac('sha256', appSecret)
      .update(payload)
      .digest('base64')
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');

    if (
      encodedSig.length !== expectedSig.length ||
      !timingSafeEqual(Buffer.from(encodedSig), Buffer.from(expectedSig))
    ) {
      logMessage('Facebook signed_request signature mismatch');
      return null;
    }

    const dataStr = base64UrlDecode(payload);
    const data: FacebookSignedRequestPayload = JSON.parse(dataStr);

    if (data.algorithm && data.algorithm !== 'HMAC-SHA256') {
      logMessage('Facebook signed_request rejected: unsupported algorithm', {
        algorithm: data.algorithm,
      });
      return null;
    }

    return data;
  } catch (error) {
    logMessage('Failed to parse Facebook signed_request', { error });
    return null;
  }
}
