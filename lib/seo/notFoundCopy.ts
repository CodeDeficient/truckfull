export interface NotFoundLink {
  readonly href: string;
  readonly label: string;
}

export interface NotFoundCopy {
  readonly heading: string;
  readonly body: string;
  readonly primary: NotFoundLink;
  readonly secondary?: NotFoundLink;
}

const MAP_LINK: NotFoundLink = { href: '/', label: 'See trucks on the map' };

const TRUCK_COPY: NotFoundCopy = {
  heading: 'We could not find this page',
  body: 'If you were looking for a food truck, it may no longer be listed. It may have closed, changed its name, or asked to be removed. There are plenty of other trucks on the map.',
  primary: MAP_LINK,
  secondary: { href: '/trucks', label: 'Browse all trucks' },
};

const EVENT_COPY: NotFoundCopy = {
  heading: 'This event has ended or was removed',
  body: 'We could not find this event anymore. Check out what is coming up next.',
  primary: { href: '/events', label: 'See upcoming events' },
  secondary: MAP_LINK,
};

const GENERIC_COPY: NotFoundCopy = {
  heading: 'Page not found',
  body: 'The page you are looking for does not exist or has moved.',
  primary: { href: '/', label: 'Find food trucks' },
};

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/i;

export function getNotFoundCopy(pathname: string | null): NotFoundCopy {
  const segments = (pathname ?? '').split('/').filter(Boolean);
  if (segments[0] === 'events' && segments.length === 3) return EVENT_COPY;
  if (segments.length === 1 && SLUG_PATTERN.test(segments[0] ?? '')) return TRUCK_COPY;
  return GENERIC_COPY;
}
