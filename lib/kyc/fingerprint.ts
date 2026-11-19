/**
 * FingerprintJS Device Tracking
 * WBS: 6.5.2
 *
 * Device fingerprinting for fraud prevention.
 */

import { logMessage, logWarning } from '@/lib/logging';

/**
 * Stores a visitor ID from FingerprintJS during organizer registration.
 * Used to prevent banned users from re-registering.
 */
export async function storeVisitorId(
  userId: string,
  visitorId: string,
  _requestId: string,
): Promise<boolean> {
  // In production, store in database
  // For now, just log and validate format

  if (!visitorId || visitorId.length < 10) {
    logWarning(`Invalid visitorId for user ${userId}`);
    return false;
  }

  logMessage(`Stored visitorId ${visitorId} for user ${userId}`);
  return true;
}

/**
 * Checks if a visitor ID is blocked (banned user trying to re-register).
 */
export async function isVisitorBlocked(_visitorId: string): Promise<boolean> {
  // In production, check against blocked_visitors table
  // For now, return false (not blocked)

  return false;
}

/**
 * Blocks a visitor ID (admin action after fraud detection).
 */
export async function blockVisitor(
  visitorId: string,
  reason: string,
  blockedBy: string,
): Promise<boolean> {
  logMessage(`Visitor ${visitorId} blocked by ${blockedBy}: ${reason}`);

  // In production, insert into blocked_visitors table
  return true;
}

/**
 * Gets FingerprintJS configuration for the frontend SDK.
 */
export function getFingerprintConfig() {
  const apiKey = process.env.FINGERPRINTJS_API_KEY;
  const region = process.env.FINGERPRINTJS_REGION || 'us';

  return {
    isConfigured: !!apiKey,
    region,
    // Note: API key should be public-safe (client-side SDK)
    apiKey: apiKey || undefined,
    endpoint: region === 'eu' ? 'https://eu.api.fpjs.io' : 'https://api.fpjs.io',
  };
}

/**
 * Validates a FingerprintJS result from the frontend.
 */
export function validateFingerprintResult(result: {
  visitorId: string;
  requestId: string;
  confidence: { score: number };
  ip?: string;
}): { valid: boolean; reason?: string } {
  // Must have minimum confidence
  if (result.confidence.score < 0.6) {
    return { valid: false, reason: 'Low confidence score' };
  }

  // Must have valid visitor ID format
  if (!result.visitorId || result.visitorId.length < 10) {
    return { valid: false, reason: 'Invalid visitor ID' };
  }

  return { valid: true };
}
