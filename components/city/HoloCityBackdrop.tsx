'use client';

import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { loadHoloScene } from '@/lib/holo/holoCities';
import { startHoloScene } from '@/lib/holo/holoRenderer';

interface HoloCityBackdropProps {
  readonly citySlug: string;
}

export function HoloCityBackdrop({ citySlug }: HoloCityBackdropProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    const canvas = document.createElement('canvas');
    canvas.className = 'block h-full w-full';
    loadHoloScene(citySlug)
      .then((scene) => {
        if (cancelled) return;
        host.append(canvas);
        stop = startHoloScene(canvas, scene);
      })
      .catch(() => canvas.remove());
    return () => {
      cancelled = true;
      stop?.();
      canvas.remove();
    };
  }, [citySlug]);

  return <div ref={hostRef} aria-hidden className="absolute inset-0" />;
}
