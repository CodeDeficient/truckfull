import Image from 'next/image';
import Link from '@/components/navigation/IntentLink';
import type { JSX } from 'react';
import { CityBackdrop } from '@/components/city/CityBackdrop';
import { HoloCityBackdrop } from '@/components/city/HoloCityBackdrop';
import { HeaderAuth } from '@/components/city/HeaderAuth';

interface CityHeroProps {
  readonly cityName: string;
  readonly stateName: string;
  readonly truckCount: number;
  readonly topCuisines: readonly string[];
  readonly citySlug: string;
}

export function BrandHeader({
  eventsHref = '/events',
}: {
  readonly eventsHref?: string;
}): JSX.Element {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 bg-black px-4 py-2 shadow-md">
      <Link href="/" className="block">
        <Image
          src="/truckfull-icon-transparent.webp"
          alt="TruckFull Logo"
          width={92}
          height={64}
          className="h-12 w-auto object-contain"
          sizes="92px"
          priority
        />
      </Link>
      <span className="font-brand text-3xl font-bold text-white neon-glow glow-red">
        <Link href="/">TruckFull</Link>
      </span>
      <nav aria-label="Account" className="ml-auto flex items-center gap-3">
        <Link href={eventsHref} className="text-sm font-medium text-gray-300 hover:text-white">
          Events
        </Link>
        <HeaderAuth />
      </nav>
    </header>
  );
}

export function CityHero({
  cityName,
  stateName,
  truckCount,
  topCuisines,
  citySlug,
}: CityHeroProps): JSX.Element {
  return (
    <section className="relative flex w-full flex-col justify-start overflow-hidden bg-black text-white sm:min-h-[clamp(380px,48vh,540px)]">
      <div className="relative h-60 sm:absolute sm:inset-0 sm:h-auto">
        <CityBackdrop>
          <HoloCityBackdrop citySlug={citySlug} />
        </CityBackdrop>
      </div>
      <div className="relative z-10 px-6 pb-8 text-center sm:px-10 sm:pb-4 sm:pt-2">
        <h1
          className="mx-auto max-w-4xl font-heading text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl"
          style={{ letterSpacing: '-0.01em', textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
        >
          Food Trucks &amp; Mobile Food in {cityName}, {stateName}
        </h1>
        {topCuisines.length > 0 && (
          <p
            className="mx-auto mt-2 max-w-2xl font-heading text-base text-white sm:text-lg"
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
          >
            Serving {topCuisines.join(', ')} and more.
          </p>
        )}
        <p className="mx-auto mt-3 inline-flex rounded-full bg-black/30 px-3 py-1 text-sm text-white backdrop-blur">
          {truckCount} {truckCount === 1 ? 'listing' : 'listings'}
        </p>
      </div>
    </section>
  );
}

export function CityBreadcrumb({ cityName }: { readonly cityName?: string }): JSX.Element {
  return (
    <nav aria-label="Breadcrumb" className="bg-black py-3 text-sm text-white/70">
      <div className="mx-auto max-w-5xl px-6 sm:px-10">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <span aria-hidden> / </span>
        {cityName ? (
          <>
            <Link href="/trucks" className="hover:underline">
              Food Trucks by City
            </Link>
            <span aria-hidden> / </span>
            <span className="font-semibold text-white">{cityName}</span>
          </>
        ) : (
          <span className="font-semibold text-white">Food Trucks by City</span>
        )}
      </div>
    </nav>
  );
}
