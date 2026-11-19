/**
 * Cron Authorization Utility
 * Shared timing-safe Bearer token comparison for cron endpoints
 */

import { timingSafeEqual } from 'node:crypto';

export function isAuthorized(authHeader: string | null, secret: string): boolean {
  if (!authHeader || !secret) return false;

  const parts = authHeader.split(' ', 2);
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return false;
  }

  const providedToken = parts[1];
  const expected = secret;

  try {
    const provided = Buffer.from(providedToken);
    const expectedBuf = Buffer.from(expected);
    if (provided.length !== expectedBuf.length) return false;
    return timingSafeEqual(provided, expectedBuf);
  } catch {
    return false;
  }
}
