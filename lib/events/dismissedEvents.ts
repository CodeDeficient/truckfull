const STORAGE_KEY = 'dismissed_events';

export function getDismissedEventIds(): Set<string> {
  if (globalThis.window === undefined) return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Set();
    return new Set(JSON.parse(stored));
  } catch {
    return new Set();
  }
}

export function dismissEvent(eventId: string): void {
  const dismissed = getDismissedEventIds();
  dismissed.add(eventId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
  } catch {}
}

export function undismissEvent(eventId: string): void {
  const dismissed = getDismissedEventIds();
  dismissed.delete(eventId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
  } catch {}
}

export function isEventDismissed(eventId: string): boolean {
  return getDismissedEventIds().has(eventId);
}
