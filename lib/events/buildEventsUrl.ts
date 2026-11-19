export function buildEventsUrl(period: string): string {
  const params = new URLSearchParams({ status: 'published', period, all: 'true' });
  return `/api/events?${params.toString()}`;
}