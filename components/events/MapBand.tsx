import type { JSX } from 'react';

import { GridPattern } from '@/components/ui/GridPattern';
import { cn } from '@/lib/utils';

interface MapBandProps {
  readonly address: string;
  readonly cityName: string;
  readonly stateName: string;
  readonly mapsUrl: string | null;
  readonly lat: number | null;
  readonly lng: number | null;
}

function RouteLines(): JSX.Element {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 800 267"
      preserveAspectRatio="none"
    >
      <path
        d="M-20 200 Q100 160 200 190 T400 130 T600 170 T820 110"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity={0.6}
        strokeDasharray="6 6"
        strokeLinecap="round"
        className="text-red-400"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="48"
          dur="2s"
          repeatCount="indefinite"
        />
      </path>
      <path
        d="M-20 100 Q150 170 250 90 T450 140 T650 70 T820 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity={0.45}
        strokeDasharray="4 8"
        strokeLinecap="round"
        className="text-amber-300"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="36"
          dur="2.5s"
          repeatCount="indefinite"
        />
      </path>
      <path
        d="M200 -10 Q250 80 300 40 T450 100 T550 20 T600 80 T700 -5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity={0.35}
        strokeDasharray="3 10"
        strokeLinecap="round"
        className="text-red-300"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="39"
          dur="3s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

function ScatteredPins(): JSX.Element {
  const pins: ReadonlyArray<{
    readonly cx: string;
    readonly cy: string;
    readonly r: number;
    readonly opacity: number;
    readonly bobDuration: number;
    readonly bobOffset: number;
  }> = [
    { cx: '15%', cy: '25%', r: 3.5, opacity: 0.4, bobDuration: 3.5, bobOffset: 0 },
    { cx: '75%', cy: '30%', r: 4.5, opacity: 0.3, bobDuration: 4.2, bobOffset: 1 },
    { cx: '25%', cy: '70%', r: 2.5, opacity: 0.25, bobDuration: 2.8, bobOffset: 2 },
    { cx: '65%', cy: '65%', r: 3.5, opacity: 0.35, bobDuration: 5, bobOffset: 0.5 },
    { cx: '40%', cy: '15%', r: 2.5, opacity: 0.2, bobDuration: 3, bobOffset: 1.5 },
    { cx: '85%', cy: '55%', r: 2.5, opacity: 0.15, bobDuration: 6, bobOffset: 0.8 },
    { cx: '50%', cy: '85%', r: 3.5, opacity: 0.25, bobDuration: 4, bobOffset: 1.2 },
  ];

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 800 267"
      preserveAspectRatio="none"
    >
      {pins.map((pin, i) => {
        const cyNum = Number.parseFloat(pin.cy);
        const bobUp = (cyNum - 2).toFixed(1);
        const bobDown = (cyNum + 1).toFixed(1);
        return (
          <circle
            key={i}
            cx={pin.cx}
            cy={pin.cy}
            r={pin.r}
            fill="currentColor"
            opacity={pin.opacity}
            className="text-red-500"
          >
            <animate
              attributeName="cy"
              values={`${pin.cy};${bobUp}%;${pin.cy};${bobDown}%;${pin.cy}`}
              dur={`${pin.bobDuration}s`}
              begin={`${pin.bobOffset}s`}
              repeatCount="indefinite"
            />
          </circle>
        );
      })}
    </svg>
  );
}

export function MapBand({
  address,
  cityName: _cityName,
  stateName: _stateName,
  mapsUrl,
  lat,
  lng,
}: MapBandProps): JSX.Element {
  return (
    <section className="bg-neutral-950 py-16 text-white sm:py-24">
      <div className="mx-auto max-w-4xl px-6 text-center sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Getting there</p>
        <h2 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">{address}</h2>
        <div
          aria-hidden
          className={cn(
            'relative mx-auto mt-10 aspect-[3/1] w-full max-w-3xl overflow-hidden rounded-xl',
            'border border-white/10',
            'bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950',
            'before:pointer-events-none before:absolute before:inset-0 before:animate-gradient before:bg-gradient-to-r before:from-transparent before:via-white/[0.015] before:to-transparent before:bg-[length:200%_100%]',
            '[mask-image:radial-gradient(circle_at_center,black_40%,transparent_80%)]',
            '[-webkit-mask-image:radial-gradient(circle_at_center,black_40%,transparent_80%)]',
          )}
        >
          <GridPattern
            width={36}
            height={36}
            x={-1}
            y={-1}
            className="stroke-white/30 fill-white/[0.03]"
          />
          <RouteLines />
          <ScatteredPins />
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <span className="relative flex h-5 w-5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-600 opacity-40" />
              <span className="absolute inline-flex h-5 w-5 rounded-full bg-red-600 shadow-[0_0_0_6px_rgba(220,38,38,0.25)]" />
              <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
          <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-red-500/10 to-transparent" />
        </div>
        <p className="mt-3 text-xs text-white/40">
          {lat !== null && lng !== null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Coordinates pending'}
        </p>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="nofollow noopener"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-red-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Open in Google Maps →
          </a>
        )}
      </div>
    </section>
  );
}
