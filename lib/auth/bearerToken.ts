export function usesBearerScheme(header: string | null): boolean {
  return header !== null && /^bearer(?:\s|$)/i.test(header.trim());
}

export function readBearerToken(header: string | null): string | null {
  if (header === null) return null;
  const match = /^bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}
