/** Resolve the configured public HTTP(S) origin.
 * Normalize the configured URL so redirect inputs remain origin-only.
 */
export function resolvePublicOrigin(requestOrigin: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return requestOrigin;

  try {
    const parsed = new URL(configured);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return requestOrigin;
    }
    return parsed.origin;
  } catch {
    return requestOrigin;
  }
}
