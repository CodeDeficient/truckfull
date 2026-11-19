import type { JSX } from 'react';
import type { EventHero as EventHeroConfig } from '@/lib/events/eventHero';
import type { ConfidenceBadge } from '@/lib/events/confidenceBadge';
import { CategoryStripe } from '@/components/events/CategoryStripe';
import { Vortex } from '@/components/ui/vortex';

/**
 * Full-bleed hero for the event detail page.
 *
 * Composition:
 * - Background: the events-page Vortex particle treatment
 *   (categoryColor remains only on the CategoryStripe).
 * - A dark gradient overlay covers the bottom h-16 of the hero,
 *   matching the top gradient height, fading from transparent to black
 *   so the section dissolves seamlessly into the page below.
 * - Top-left: CategoryStripe (8px colored stripe + uppercase label).
 * - Top-right: Confidence badge label (text only).
 * - Centered: serif title, serif subtitle, small-caps date/time line.
 *
 * No CTA in hero — CTAs come in the body. No Lucide icons.
 */

interface EventHeroProps {
  readonly title: string;
  readonly subtitle: string;
  readonly dateLine: string;
  readonly hero: EventHeroConfig;
  readonly badge: ConfidenceBadge;
  readonly isPast?: boolean;
  readonly variant?: 'desktop' | 'mobile' | 'responsive';
  readonly className?: string;
  readonly style?: React.CSSProperties;
}

export function EventHero({
  title,
  subtitle,
  dateLine,
  hero,
  badge,
  variant = 'desktop',
  className,
  style,
  isPast = false,
}: EventHeroProps): JSX.Element {
  const sectionClass =
    variant === 'responsive'
      ? 'relative h-[40vh] min-h-[300px] w-full overflow-hidden bg-black text-white'
      : 'relative w-full overflow-hidden bg-black text-white';

  return (
    <section
      className={[sectionClass, className].filter(Boolean).join(' ')}
      style={variant === 'responsive' ? style : { height: '40vh', ...style }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 15%, rgba(140,23,28,0.25), transparent 44%), linear-gradient(180deg, #070708 0%, #10090a 58%, #08090a 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 52%, rgba(240,106,25,0.1), transparent 39%), linear-gradient(90deg, rgba(8,9,10,0.88), transparent 34%, transparent 66%, rgba(8,9,10,0.88))',
        }}
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
        containerClassName="pointer-events-none absolute inset-0 z-0"
        className="h-full w-full"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-16"
        style={{
          background:
            'linear-gradient(to bottom, rgb(0,0,0) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-16"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.85) 70%, rgb(0,0,0) 100%)',
        }}
      />
      <div className="relative z-10 flex h-full flex-col px-4 pb-4 pt-4 sm:px-10 sm:pb-8 sm:pt-5">
        <div className="flex items-start justify-between gap-4">
          <CategoryStripe label={hero.categoryLabel} color={hero.categoryColor} />
          <div className="flex shrink-0 items-center gap-2">
            {isPast && (
              <span className="inline-flex items-center rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-black">
                Past Event
              </span>
            )}
            <span
              className="inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: badge.pillBg,
                color: badge.pillFg,
              }}
            >
              {badge.label}
            </span>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-8 top-16 z-10 flex flex-col items-center justify-center px-6 text-center sm:px-10">
          <h1
            className="mx-auto max-w-4xl font-heading text-3xl font-bold leading-snug tracking-tight text-white sm:text-4xl md:text-5xl"
            style={{
              letterSpacing: '-0.01em',
              textShadow: '0 2px 12px rgba(0,0,0,0.85), 0 0 28px rgba(0,0,0,0.5)',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="mx-auto mt-2 max-w-2xl font-heading text-base text-white sm:text-lg"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
            >
              {subtitle}
            </p>
          )}
          {dateLine && (
            <p
              className="mx-auto mt-2 text-sm font-medium uppercase tracking-widest text-white"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}
            >
              {dateLine}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
