export const SEARXNG_AUTH_HEADER = 'x-truckfull-searxng-key';

export function constantTimeEqual(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  if (provided.length === 0 || expected.length === 0) return false;

  const providedBytes = new TextEncoder().encode(provided);
  const expectedBytes = new TextEncoder().encode(expected);
  if (providedBytes.length !== expectedBytes.length) return false;

  let mismatch = 0;
  for (const [index, byte] of providedBytes.entries()) {
    mismatch |= byte ^ expectedBytes[index];
  }
  return mismatch === 0;
}

export function isAuthorizedSearxngRequest(providedToken, expectedToken) {
  return constantTimeEqual(providedToken, expectedToken);
}
