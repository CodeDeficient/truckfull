import Link from '@/components/navigation/IntentLink';
import type { JSX } from 'react';

interface TruckCard {
  readonly id: string;
  readonly name: string;
  readonly slug: string | null;
  readonly cuisine_type: string[] | null;
  readonly photo_url?: string | null;
}

interface TruckStripProps {
  readonly trucks: readonly TruckCard[];
  readonly cityName: string;
  readonly eventTitle?: string;
}

export function TruckStrip({ trucks, cityName, eventTitle }: TruckStripProps): JSX.Element | null {
  if (trucks.length === 0) return null;
  return (
    <section className="bg-white py-14 dark:bg-black sm:py-20">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <h2 className="font-heading text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
          {eventTitle ? `Food trucks nearby this event` : `Food trucks in ${cityName}`}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Trucks based in {cityName}.</p>
        <div className="mt-8 -mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-4">
          {trucks.map((truck) => (
            <Link
              key={truck.id}
              href={`/${truck.slug ?? truck.id}`}
              className="group block w-60 shrink-0 snap-start"
            >
              <div
                aria-hidden
                className="aspect-square w-full bg-gray-200 dark:bg-gray-800"
                style={
                  truck.photo_url
                    ? {
                        backgroundImage: `url(${truck.photo_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : undefined
                }
              />
              <h3 className="mt-3 font-heading text-lg font-semibold text-gray-900 group-hover:text-red-600 group-hover:underline dark:text-white">
                {truck.name}
              </h3>
              {Array.isArray(truck.cuisine_type) && truck.cuisine_type.length > 0 && (
                <p className="mt-1 text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  {truck.cuisine_type.slice(0, 3).join(' · ')}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
