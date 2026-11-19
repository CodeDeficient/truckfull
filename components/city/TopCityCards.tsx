import Image from 'next/image';
import Link from '@/components/navigation/IntentLink';
import type { JSX } from 'react';
import type { TopCity } from '@/lib/city/cityDirectory';
import { holoClipPath } from '@/lib/holo/holoCities';
import { slugifyCity } from '@/lib/utils/slugify';
import { HoloCardClip } from './HoloCardClip';

const CARD_FADE =
  'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.92) 100%)';

function CardBackdrop({
  image,
  slug,
}: {
  readonly image: string;
  readonly slug: string;
}): JSX.Element {
  return (
    <span
      aria-hidden
      className="absolute inset-0 brightness-90 transition-[filter] duration-300 group-hover:brightness-125 group-focus-visible:brightness-125"
    >
      <Image
        src={image}
        alt=""
        fill
        sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
        className="object-cover"
      />
      <HoloCardClip src={holoClipPath(slug)} />
    </span>
  );
}

function TopCityCard({ entry }: { readonly entry: TopCity }): JSX.Element {
  const slug = slugifyCity(entry.city, entry.state);
  return (
    <li>
      <Link
        href={`/city/${slug}`}
        className="group relative block aspect-[4/3] overflow-hidden [container-type:inline-size] rounded-xl border border-white/10 bg-neutral-900 transition-colors hover:border-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
      >
        <CardBackdrop image={entry.image} slug={slug} />
        <span
          aria-hidden
          className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-60 group-focus-visible:opacity-60"
          style={{ background: CARD_FADE }}
        />
        <span className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <span className="block truncate whitespace-nowrap font-heading font-bold leading-tight text-white [font-size:clamp(0.7rem,6.8cqi,1.25rem)]">
            {entry.city}, {entry.state}
          </span>
          <span className="mt-0.5 block text-xs text-gray-300 sm:text-sm">
            {entry.count.toLocaleString('en-US')} {entry.count === 1 ? 'listing' : 'listings'}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function TopCityCards({
  cities,
}: {
  readonly cities: readonly TopCity[];
}): JSX.Element | null {
  if (cities.length === 0) return null;
  return (
    <section aria-labelledby="top-cities" className="py-6">
      <div className="mx-auto max-w-5xl px-6 sm:px-10">
        <h2 id="top-cities" className="font-heading text-3xl font-bold text-white sm:text-4xl">
          Top food truck cities
        </h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {cities.map((entry) => (
            <TopCityCard key={slugifyCity(entry.city, entry.state)} entry={entry} />
          ))}
        </ul>
      </div>
    </section>
  );
}
