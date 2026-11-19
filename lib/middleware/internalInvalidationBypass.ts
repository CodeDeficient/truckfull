import { INVALIDATION_EDGE_HEADER } from '@/lib/events/syncCacheTargets';

const INTERNAL_INVALIDATION_PATH = '/api/revalidate/event';

const encoder = new TextEncoder();

function constantTimeEquals(provided: string, expected: string): boolean {
  const providedBytes = encoder.encode(provided);
  const expectedBytes = encoder.encode(expected);
  if (providedBytes.length !== expectedBytes.length) return false;
  let difference = 0;
  for (const [index, byte] of expectedBytes.entries()) {
    difference |= providedBytes[index] ^ byte;
  }
  return difference === 0;
}

export function isInternalInvalidationRequest(
  pathname: string,
  method: string,
  headers: Headers,
  edgeSecret: string | undefined,
): boolean {
  if (!edgeSecret || method !== 'POST' || pathname !== INTERNAL_INVALIDATION_PATH) return false;
  const provided = headers.get(INVALIDATION_EDGE_HEADER);
  if (!provided) return false;
  return constantTimeEquals(provided, edgeSecret);
}
