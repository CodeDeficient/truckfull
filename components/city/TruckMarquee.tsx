'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { MarqueeViewport } from '@/components/city/MarqueeViewport';

const COLUMN_COUNT = 14;
const TILES_PER_COLUMN = 8;
const LOOP_COPIES = 4;
const COLUMN_DELAY_STEP_SECONDS = 23;
const TILE_PIXELS = 160;

export function buildColumns(photos: readonly string[]): string[][] {
  if (photos.length === 0) return [];
  return Array.from({ length: COLUMN_COUNT }, (_, column) =>
    Array.from(
      { length: TILES_PER_COLUMN },
      (_, tile) => photos[(column * TILES_PER_COLUMN + tile) % photos.length] ?? '',
    ),
  );
}

function MarqueeColumn({
  photos,
  index,
}: {
  readonly photos: readonly string[];
  readonly index: number;
}): JSX.Element {
  const looped = Array.from({ length: LOOP_COPIES }, () => photos).flat();
  return (
    <div
      className={`hub-marquee-col flex flex-col ${index % 2 === 1 ? 'hub-marquee-col-reverse' : ''}`}
      style={{ animationDelay: `-${String(index * COLUMN_DELAY_STEP_SECONDS)}s` }}
    >
      {looped.map((src, tile) => (
        <div
          key={`${src}-${String(tile)}`}
          className="hub-sticker relative mb-4 aspect-square w-28 shrink-0 overflow-hidden rounded-2xl bg-neutral-900 sm:w-40"
        >
          <Image
            src={src}
            alt=""
            width={TILE_PIXELS}
            height={TILE_PIXELS}
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

export function TruckMarquee({ photos }: { readonly photos: readonly string[] }): JSX.Element {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <MarqueeViewport>
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-4 [transform-style:preserve-3d]">
        <div className="flex gap-4 [transform:rotateX(50deg)_rotateZ(-40deg)]">
          {mounted
            ? buildColumns(photos).map((column, index) => (
                <MarqueeColumn key={`column-${String(index)}`} photos={column} index={index} />
              ))
            : null}
        </div>
      </div>
    </MarqueeViewport>
  );
}
