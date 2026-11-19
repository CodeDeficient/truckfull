'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { TRUCK_FALLBACK_IMAGE } from '@/lib/utils/photoTransform';
import { resolveCuisineTheme } from '@/lib/truck-profile/theme';
import type { RelatedTruck } from '@/lib/truck-profile/relatedTrucks';
import type { CuisineTheme } from '@/lib/truck-profile/theme';

interface TruckMarqueeProps {
  readonly trucks: readonly RelatedTruck[];
  readonly theme: CuisineTheme;
  readonly direction?: 'left' | 'right';
  readonly speed?: number;
  readonly offset?: number;
}

const TILTS = [-3, 2.5, -1.5, 3, -2, 1.5];
const MIN_MARQUEE_TRUCKS = 6;

function TruckCard({
  truck,
  theme,
  index,
}: {
  readonly truck: RelatedTruck;
  readonly theme: CuisineTheme;
  readonly index: number;
}) {
  const href = truck.slug ? `/${truck.slug}` : '#';
  const tile = resolveCuisineTheme(truck.cuisines ?? []);
  const tilt = TILTS[index % TILTS.length];
  return (
    <a
      href={href}
      className="group relative shrink-0"
      style={{
        width: 150,
        height: 184,
        flex: '0 0 150px',
        boxSizing: 'border-box',
        padding: 7,
        borderRadius: 5,
        background: 'linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.07))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 5px 14px rgba(0,0,0,0.24), inset 0 1px 2px rgba(255,255,255,0.16)',
        transform: `translate3d(0, 0, 0) rotate(${tilt}deg)`,
        backfaceVisibility: 'hidden',
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: 136,
          height: 136,
          borderRadius: 2,
          background: `radial-gradient(120% 120% at 30% 20%, ${tile.deep}, ${tile.base})`,
          isolation: 'isolate',
        }}
      >
        <img
          src={truck.photoUrl ?? TRUCK_FALLBACK_IMAGE}
          alt={`${truck.name} logo`}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'block',
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
      <div style={{ width: 136, height: 34, paddingTop: 6, textAlign: 'center', overflow: 'hidden' }}>
        <div className="truncate" style={{ color: theme.cream, fontFamily: 'Georgia, serif', fontSize: 11, lineHeight: '14px' }}>
          {truck.name}
        </div>
        <div className="truncate" style={{ fontSize: 9, lineHeight: '12px', color: 'rgba(255,255,255,0.45)' }}>
          {[truck.city, truck.state].filter(Boolean).join(', ')}
        </div>
      </div>
    </a>
  );
}

function cloneSet(track: HTMLElement, originals: readonly HTMLElement[]): HTMLElement[] {
  return originals.map((child) => {
    const clone = child.cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('tabindex', '-1');
    track.append(clone);
    return clone;
  });
}

function fillTrack(
  wrap: HTMLElement,
  track: HTMLElement,
  originals: readonly HTMLElement[],
  clones: HTMLElement[],
): number {
  if (clones.length === 0) clones.push(...cloneSet(track, originals));
  const period = (clones[0]?.offsetLeft ?? 0) - (originals[0]?.offsetLeft ?? 0);
  while (period > 0 && track.scrollWidth - period < wrap.clientWidth) {
    clones.push(...cloneSet(track, originals));
  }
  return period;
}

export default function TruckMarquee({
  trucks = [],
  theme,
  direction = 'left',
  speed = 26,
  offset: initialOffset = 0,
}: TruckMarqueeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track || trucks.length < MIN_MARQUEE_TRUCKS) return;

    const originals = [...track.children] as HTMLElement[];
    const clones: HTMLElement[] = [];

    const sign = direction === 'right' ? 1 : -1;
    let offset = initialOffset * sign;
    let velocity = speed * sign;
    let target = speed * sign;
    let period = 0;
    let last = performance.now();
    let raf = 0;

    const wrapOffset = () => {
      if (period <= 0) return;
      offset = (((offset % period) + period) % period) - period;
    };

    const measure = () => {
      period = fillTrack(wrap, track, originals, clones);
      wrapOffset();
    };
    measure();

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') target = 0;
    };
    const onLeave = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') target = speed * sign;
    };

    wrap.addEventListener('pointerenter', onEnter);
    wrap.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', measure);

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      velocity += (target - velocity) * Math.min(dt * 2.4, 1);
      offset += velocity * dt;
      wrapOffset();
      track.style.transform = `translate3d(${offset}px, 0, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener('pointerenter', onEnter);
      wrap.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', measure);
      for (const clone of clones) clone.remove();
      track.style.transform = '';
    };
  }, [trucks, direction, speed, initialOffset]);

  if (trucks.length === 0) {
    return null;
  }

  if (trucks.length < MIN_MARQUEE_TRUCKS) {
    return (
      <div className="flex flex-wrap justify-center gap-4 py-4 sm:gap-6 sm:px-2">
        {trucks.map((truck, index) => (
          <TruckCard key={truck.id} truck={truck} theme={theme} index={index} />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_8%,white_92%,transparent)]"
      style={{ '--tw-mask': 'none' } as CSSProperties}
    >
      <div ref={trackRef} className="flex w-max items-center gap-6 px-2 py-4 will-change-transform">
        {trucks.map((truck, index) => (
          <TruckCard key={truck.id} truck={truck} theme={theme} index={index} />
        ))}
      </div>
    </div>
  );
}
