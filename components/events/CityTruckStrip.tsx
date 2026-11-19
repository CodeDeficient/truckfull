import Link from '@/components/navigation/IntentLink';
import type { JSX } from 'react';
import TruckMarquee from '@/components/truck-profile/TruckMarquee';
import type { CityTruckStrip as CityTruckStripData } from '@/lib/events/cityTruckStrip';
import { resolveCuisineTheme } from '@/lib/truck-profile/theme';

interface CityTruckStripProps {
  readonly cityName: string;
  readonly stateName: string;
  readonly citySlug: string;
  readonly strip: CityTruckStripData;
  readonly compact?: boolean;
}

export function CityTruckStrip({
  cityName,
  stateName,
  citySlug,
  strip,
  compact = false,
}: CityTruckStripProps): JSX.Element {
  return (
    <section className="bg-black pb-10 sm:pb-14">
      <div className={`mx-auto max-w-4xl ${compact ? 'px-4' : 'px-6 sm:px-10'}`}>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">
            Food trucks in {cityName}
          </h2>
          {strip.totalInCity > 0 && (
            <Link
              href={`/city/${citySlug}`}
              className="shrink-0 text-sm font-semibold text-red-400 hover:underline"
            >
              See all {strip.totalInCity.toLocaleString('en-US')} →
            </Link>
          )}
        </div>
      </div>
      {strip.trucks.length > 0 && (
        <div className="mx-auto mt-3 max-w-6xl">
          <TruckMarquee
            trucks={strip.trucks}
            theme={resolveCuisineTheme([])}
            direction="right"
            speed={22}
          />
        </div>
      )}
      <div className={`mx-auto max-w-4xl ${compact ? 'px-4' : 'px-6 sm:px-10'}`}>
        <p className="mt-4 text-sm">
          <Link href={`/city/${citySlug}`} className="font-semibold text-red-400 hover:underline">
            Browse food trucks in {cityName}, {stateName}
          </Link>
        </p>
      </div>
    </section>
  );
}
