import Link from '@/components/navigation/IntentLink';
import type { JSX } from 'react';
import type { NearbyCity } from '@/lib/events/nearbyCities';

interface NearbyCitiesProps {
  readonly cities: readonly NearbyCity[];
  readonly variant: 'desktop' | 'mobile' | 'responsive';
}

export function NearbyCities({ cities, variant }: NearbyCitiesProps): JSX.Element | null {
  if (cities.length === 0) return null;

  const isMobile = variant === 'mobile';
  const isResponsive = variant === 'responsive';
  let sectionClass = 'bg-white py-10 dark:bg-black';
  let containerClass = 'mx-auto max-w-4xl px-6 sm:px-10';
  let headingClass = 'font-heading text-2xl font-bold text-gray-900 dark:text-white';
  let listClass = 'mt-4 flex flex-wrap gap-2';
  let linkClass =
    'inline-block rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-900 transition-all hover:scale-105 hover:border-red-500 hover:bg-red-500 hover:text-white dark:border-white/40 dark:text-white';
  if (isMobile) {
    sectionClass = 'bg-black py-8';
    containerClass = 'mx-auto max-w-4xl px-4';
    headingClass = 'font-heading text-xl font-bold text-white';
    listClass = 'mt-3 flex flex-wrap gap-2';
    linkClass =
      'inline-block rounded-full border border-white/30 px-4 py-1.5 text-sm font-semibold text-white transition-all hover:scale-105 hover:border-red-500 hover:bg-red-500';
  } else if (isResponsive) {
    sectionClass = 'bg-black py-8 sm:py-10';
    containerClass = 'mx-auto max-w-4xl px-4 sm:px-10';
    headingClass = 'font-heading text-xl font-bold text-white sm:text-2xl';
    listClass = 'mt-3 flex flex-wrap gap-2 sm:mt-4';
    linkClass =
      'inline-block rounded-full border border-white/30 px-4 py-1.5 text-sm font-semibold text-white transition-all hover:scale-105 hover:border-red-500 hover:bg-red-500';
  }

  return (
    <section className={sectionClass} data-testid="nearby-city-links">
      <div className={containerClass}>
        <h2 className={headingClass}>Events in nearby cities</h2>
        <ul className={listClass}>
          {cities.map((city) => (
            <li key={city.slug}>
              <Link href={`/events/${city.slug}`} className={linkClass}>
                {city.city}, {city.state}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
