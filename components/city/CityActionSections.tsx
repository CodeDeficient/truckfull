import Link from '@/components/navigation/IntentLink';
import type { JSX } from 'react';
import { formatEventDateRange } from '@/components/events/EventList';
import type { CityPageEvents } from '@/lib/city/cityEvents.server';
import { BOOK_DIRECT_HASH } from '@/lib/city/cityGuide';

const SECTION_HEADING = 'font-heading text-3xl font-bold text-white sm:text-4xl';
const BODY = 'text-base leading-relaxed text-gray-300';
const BUTTON =
  'rainbow-hover mt-6 inline-block rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15 focus:outline-none';

export function CityEventsSection({
  cityName,
  citySlug,
  events,
}: {
  readonly cityName: string;
  readonly citySlug: string;
  readonly events: CityPageEvents;
}): JSX.Element | null {
  if (events.upcoming.length === 0) return null;
  return (
    <section className="py-10">
      <div className="mx-auto max-w-5xl px-6 sm:px-10">
        <h2 className={SECTION_HEADING}>Food truck events in {cityName}</h2>
        <ul className="mt-6 divide-y divide-white/10">
          {events.upcoming.map((event) => (
            <li key={event.id}>
              <Link
                href={event.path}
                className="group -mx-3 flex flex-col gap-1 rounded-lg px-3 py-4 transition-colors hover:bg-white/10 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              >
                <span className="min-w-0">
                  <span className="block font-heading text-xl font-bold text-white">
                    {event.title}
                  </span>
                  {event.address && (
                    <span className="mt-1 block truncate text-sm text-gray-400">
                      {event.address}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs font-medium uppercase tracking-widest text-gray-400 group-hover:text-white">
                  {formatEventDateRange(event.startDate, event.endDate)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href={`/events/${citySlug}`} className={BUTTON}>
          See all {events.total} upcoming {cityName} food truck{' '}
          {events.total === 1 ? 'event' : 'events'}
        </Link>
      </div>
    </section>
  );
}

export function BookDirectSection({
  cityName,
  withPhone,
  total,
}: {
  readonly cityName: string;
  readonly withPhone: number;
  readonly total: number;
}): JSX.Element {
  return (
    <section className="py-10">
      <div className="mx-auto max-w-5xl px-6 sm:px-10">
        <h2 className={SECTION_HEADING}>Book a food truck in {cityName}, direct</h2>
        <p className={`mt-4 max-w-3xl ${BODY}`}>
          Planning a wedding, office lunch, private party or community event? Contact the truck
          yourself. TruckFull is not a booking agency and adds no fees, so you deal with the owner
          and agree on the menu and price together.
          {withPhone > 0 &&
            ` ${withPhone} of the ${total} ${cityName} listings include a phone number.`}
        </p>
        {withPhone > 0 && (
          <a href={BOOK_DIRECT_HASH} className={BUTTON}>
            Show trucks with a phone number
          </a>
        )}
      </div>
    </section>
  );
}
