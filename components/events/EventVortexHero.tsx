import Link from '@/components/navigation/IntentLink';
import type { JSX } from 'react';
import { Vortex } from '@/components/ui/vortex';

interface EventVortexHeroProps {
  readonly totalEvents: number;
}

const heroHeadingStyle = { fontFamily: 'Georgia, \"Times New Roman\", serif' } as const;

export function EventVortexHero({ totalEvents }: EventVortexHeroProps): JSX.Element {
  const eventLabel = `${totalEvents}+ upcoming events`;

  return (
    <section
      aria-labelledby="events-page-title"
      className="relative isolate min-h-[410px] overflow-hidden bg-[radial-gradient(circle_at_50%_15%,rgba(140,23,28,0.25),transparent_44%),linear-gradient(180deg,#070708_0%,#10090a_58%,#08090a_100%)] text-[#f6f1e8]"
      data-events-vortex-hero
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_52%,rgba(240,106,25,0.1),transparent_39%),linear-gradient(90deg,rgba(8,9,10,0.88),transparent_34%,transparent_66%,rgba(8,9,10,0.88))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-20 bg-[linear-gradient(180deg,#08090a_0%,rgba(8,9,10,0.78)_48%,transparent_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-14 bg-[linear-gradient(180deg,transparent_0%,rgba(8,9,10,0.55)_70%,#08090a_100%)]"
      />
      <Vortex
        backgroundColor="transparent"
        baseHue={13}
        rangeHue={49}
        particleCount={390}
        rangeY={120}
        baseSpeed={0}
        rangeSpeed={0.9}
        baseRadius={0.75}
        rangeRadius={1.6}
        containerClassName="relative z-10"
        className="relative flex min-h-[410px] flex-col items-center justify-center px-5 pb-16 pt-[58px] text-center sm:px-8"
      >
        <nav
          aria-label="Breadcrumb"
          className="absolute left-[clamp(20px,5vw,64px)] top-[22px] text-xs text-[#f6f1e8]/[0.56]"
        >
          <Link href="/" className="hover:text-white hover:underline">
            Home
          </Link>{' '}
          <span aria-hidden="true">/</span>{' '}
          <strong className="text-[#f6f1e8]">Events</strong>
        </nav>

        <div className="relative z-10 flex flex-col items-center">
          <p className="mb-4 inline-flex items-center gap-[9px] text-xs font-extrabold uppercase tracking-[0.2em] text-[#ffc132]">
            <span
              aria-hidden="true"
              className="h-[7px] w-[7px] rounded-full bg-[#e51f2a] shadow-[0_0_12px_rgba(229,31,42,0.9)]"
            />
            Live event discovery
          </p>

          <h1
            id="events-page-title"
            className="max-w-[820px] text-[clamp(42px,7vw,76px)] font-bold leading-[0.98] tracking-[-0.045em] text-[#f6f1e8] [text-wrap:balance] [text-shadow:0_4px_30px_rgba(0,0,0,0.72)]"
            style={heroHeadingStyle}
          >
            Food truck events are{' '}
            <em className="not-italic text-[#ffc132] [text-shadow:0_0_26px_rgba(240,106,25,0.3)]">
              always moving.
            </em>
          </h1>

          <p className="mx-auto mt-[18px] max-w-[560px] text-[clamp(15px,2vw,18px)] leading-[1.6] text-[#f6f1e8]/[0.72]">
            Explore upcoming local markets, festivals, and community events across Georgia and South Carolina.
          </p>

          <p className="mt-[26px] inline-flex items-center gap-2 text-xs text-[#f6f1e8]/[0.58]">
            <span
              aria-hidden="true"
              className="h-[5px] w-[5px] rounded-full bg-[#36c878] shadow-[0_0_10px_rgba(54,200,120,0.8)]"
            />
            <strong className="text-[#f6f1e8]">{eventLabel}</strong> across TruckFull
          </p>
        </div>
      </Vortex>
    </section>
  );
}
