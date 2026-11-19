import Link from '@/components/navigation/IntentLink';
import type { JSX } from 'react';
import { cuisineCityDescription } from '@/lib/seo/keywords';
import { slugifyCuisine } from '@/lib/utils/slugify';
import type { CityGuideStats, CuisineCount } from '@/lib/city/cityGuide';
import { CuisinePicker } from '@/components/city/CuisinePicker';

const SECTION_HEADING = 'font-heading text-3xl font-bold text-white sm:text-4xl';
const BODY = 'text-base leading-relaxed text-gray-300';

function StatItem({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): JSX.Element {
  return (
    <div className="rounded-xl bg-white/5 p-4">
      <dt className="text-sm text-gray-400">{label}</dt>
      <dd className="mt-1 font-heading text-2xl font-bold text-white">{value}</dd>
    </div>
  );
}

export function CityIntroSection({
  intro,
  stats,
}: {
  readonly intro: string;
  readonly stats: CityGuideStats;
}): JSX.Element {
  return (
    <section className="pt-8">
      <div className="mx-auto max-w-5xl px-6 sm:px-10">
        <p className={`max-w-3xl ${BODY}`}>{intro}</p>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatItem label="Listings" value={String(stats.listingCount)} />
          <StatItem label="Cuisines" value={String(stats.cuisineCount)} />
          {stats.topCuisine && <StatItem label="Most common cuisine" value={stats.topCuisine} />}
        </dl>
      </div>
    </section>
  );
}

export function CuisineBreakdownSection({
  cityName,
  cuisines,
}: {
  readonly cityName: string;
  readonly cuisines: readonly CuisineCount[];
}): JSX.Element | null {
  if (cuisines.length === 0) return null;
  return (
    <section className="py-10">
      <div className="mx-auto max-w-5xl px-6 sm:px-10">
        <h2 className={SECTION_HEADING}>Food truck cuisines in {cityName}</h2>
        <CuisinePicker
          items={cuisines.map(([cuisine, count]) => {
            const cuisineSlug = slugifyCuisine(cuisine);
            return {
              cuisine,
              count,
              href: cuisineSlug ? `/cuisine/${cuisineSlug}` : null,
              title: cuisineCityDescription(cuisine, cityName, count),
            };
          })}
        />
      </div>
    </section>
  );
}

export function HowCompiledSection({ cityName }: { readonly cityName: string }): JSX.Element {
  return (
    <section className="py-10">
      <div className="mx-auto max-w-5xl px-6 sm:px-10">
        <h2 className={SECTION_HEADING}>How this list is compiled</h2>
        <p className={`mt-4 max-w-3xl ${BODY}`}>
          The {cityName} listings come from public information, such as each truck&apos;s own
          website and social media pages, plus the details owners add when they claim their listing.
          Trucks with the most details on file are shown first. You can sort by name instead, or
          filter to trucks that have a menu, phone number or other details.
        </p>
        <p className={`mt-3 max-w-3xl ${BODY}`}>
          Spot something out of date? Owners can claim their listing for free, and anyone can{' '}
          <Link href="/contact" className="text-white underline hover:no-underline">
            send us a correction
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
