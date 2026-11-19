import Link from '@/components/navigation/IntentLink';
import type { JSX } from 'react';
import { EventVortexHero } from '@/components/events/EventVortexHero';
import { SeoPageShell } from '@/components/ui/organisms/SeoPageShell';
import { slugifyCity } from '@/lib/utils/slugify';

export interface CityEventCount {
  readonly city: string;
  readonly state: string;
  readonly count: number;
}

interface EventsDirectoryProps {
  readonly cities: readonly CityEventCount[];
}

function formatEventCount(count: number): string {
  return `${count} upcoming event${count === 1 ? '' : 's'}`;
}

export function EventsDirectory({ cities }: EventsDirectoryProps): JSX.Element {
  const totalEvents = cities.reduce((sum, city) => sum + city.count, 0);

  return (
    <SeoPageShell>
      <div className="min-h-full bg-background text-foreground">
        <EventVortexHero totalEvents={totalEvents} />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <section id="city-directory" aria-labelledby="city-directory-title" className="py-10 sm:py-14">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Browse by city
              </p>
              <h2
                id="city-directory-title"
                className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              >
                Cities with upcoming events
              </h2>
            </div>

            {cities.length > 0 ? (
              <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cities.map((city) => {
                  const slug = slugifyCity(city.city, city.state);
                  return (
                    <li key={slug}>
                      <Link
                        href={`/events/${slug}`}
                        className="flex min-h-32 flex-col justify-between rounded-md border border-border bg-card p-5 text-card-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <span className="font-heading text-2xl font-bold leading-tight">
                          {city.city}, {city.state}
                        </span>
                        <span className="mt-6 text-sm font-medium text-muted-foreground">
                          {formatEventCount(city.count)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-8 text-muted-foreground">
                No upcoming events are currently tracked. Check back soon.
              </p>
            )}
          </section>
        </div>
      </div>
    </SeoPageShell>
  );
}
