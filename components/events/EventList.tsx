import Link from '@/components/navigation/IntentLink';
import type { JSX } from 'react';
import type { EventPageData } from '@/lib/events/eventPageData';
import { getConfidenceBadge } from '@/lib/events/confidenceBadge';
import { safeBuildEventSlug } from '@/lib/events/eventSlug';
import { cleanAddress } from '@/lib/utils/addressCleaner';
import { SortableEventItems, type SortableEventItem } from '@/components/events/SortableEventItems';

interface EventListProps {
  readonly events: readonly EventPageData[];
  readonly citySlug: string;
  readonly emptyMessage?: string;
  readonly sortable?: boolean;
}

const LIST_CLASS = 'divide-y divide-gray-200 dark:divide-gray-800';

export function EventList({
  events,
  citySlug,
  emptyMessage,
  sortable = false,
}: EventListProps): JSX.Element {
  if (events.length === 0) {
    return (
      <p className="text-sm italic text-gray-600 dark:text-gray-400">
        {emptyMessage ?? 'No upcoming events listed.'}
      </p>
    );
  }
  const items = events
    .map((event) => toSortableItem(event, citySlug))
    .filter((item): item is SortableEventItem => item !== null);
  if (sortable) return <SortableEventItems items={items} listClassName={LIST_CLASS} />;
  return <ul className={LIST_CLASS}>{items.map((item) => item.node)}</ul>;
}

function toSortableItem(event: EventPageData, citySlug: string): SortableEventItem | null {
  const slug = safeBuildEventSlug(event.title, event.eventStartDate ?? '');
  if (!slug) return null;
  return {
    key: event.id,
    title: event.title,
    date: event.eventStartDate,
    node: <EventListItem key={event.id} event={event} href={`/events/${citySlug}/${slug}`} />,
  };
}

function EventListItem({
  event,
  href,
}: {
  readonly event: EventPageData;
  readonly href: string;
}): JSX.Element {
  const badge = getConfidenceBadge(event.vettingScore ?? 0);
  return (
    <li>
      <Link
        href={href}
        className="group -mx-3 flex flex-col gap-1 rounded-lg px-3 py-5 transition-colors hover:bg-gray-200/50 dark:hover:bg-white/10 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
      >
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            {event.title}
          </h3>
          {event.locationAddress && (
            <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">
              {cleanAddress(event.locationAddress)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="text-right text-xs font-medium uppercase tracking-widest text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white">
            {formatEventDateRange(event.eventStartDate, event.eventEndDate)}
          </p>
          <p className={`text-right text-xs font-semibold uppercase tracking-wider ${badge.color}`}>
            {badge.label}
          </p>
        </div>
      </Link>
    </li>
  );
}

function formatEventDate(value: string | null): string {
  if (!value) return 'Date TBA';
  const d = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatEventDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'Date TBA';
  if (!end || end === start) return formatEventDate(start);
  const startD = new Date(`${start}T12:00:00Z`);
  const endD = new Date(`${end}T12:00:00Z`);
  if (Number.isNaN(startD.getTime()) || Number.isNaN(endD.getTime())) {
    return `${formatEventDate(start)} – ${formatEventDate(end)}`;
  }
  const weekday = startD.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const startMonth = startD.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const startDay = startD.getUTCDate();
  const endMonth = endD.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const endDay = endD.getUTCDate();
  const startYear = startD.getUTCFullYear();
  const endYear = endD.getUTCFullYear();
  const sameMonth = startD.getUTCMonth() === endD.getUTCMonth();
  const sameYear = startYear === endYear;
  if (sameMonth && sameYear) {
    return `${weekday}, ${startMonth} ${startDay} – ${endDay}, ${startYear}`;
  }
  if (sameYear) {
    return `${weekday}, ${startMonth} ${startDay} – ${endMonth} ${endDay}, ${startYear}`;
  }
  return `${weekday}, ${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`;
}
