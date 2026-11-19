export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
  } catch {
    if ((url.startsWith('/') && !url.startsWith('//')) || url.startsWith('#')) return url;
  }
  return null;
}
