export function normalizeTimestamp(raw: unknown): string | null {
  const value = typeof raw === 'string' ? raw.trim() : typeof raw === 'number' ? String(raw) : null;
  if (!value) return null;

  const num = Number(value);
  if (Number.isFinite(num)) {
    const timestamp = new Date(num * 1000);
    return Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : null;
  }

  const parsed = new Date(value);
  if (Number.isFinite(parsed.getTime())) {
    return parsed.toISOString();
  }

  return null;
}
