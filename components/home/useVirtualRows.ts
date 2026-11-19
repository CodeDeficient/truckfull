import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export interface VirtualWindow {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly offsetY: number;
  readonly totalHeight: number;
}

export interface VirtualWindowInput {
  readonly offsets: readonly number[];
  readonly scrollTop: number;
  readonly viewportHeight: number;
  readonly overscan: number;
}

export function computeVirtualWindow({
  offsets,
  scrollTop,
  viewportHeight,
  overscan,
}: VirtualWindowInput): Omit<VirtualWindow, 'totalHeight'> {
  const itemCount = offsets.length - 1;
  let startIndex = 0;
  while (startIndex < itemCount && offsets[startIndex + 1] <= scrollTop) {
    startIndex++;
  }
  startIndex = Math.max(0, startIndex - overscan);

  const viewportBottom = scrollTop + viewportHeight;
  let endIndex = startIndex;
  while (endIndex < itemCount && offsets[endIndex] < viewportBottom) {
    endIndex++;
  }
  endIndex = Math.min(itemCount, endIndex + overscan);

  return { startIndex, endIndex, offsetY: offsets[startIndex] ?? 0 };
}

export interface VirtualRowsResult extends VirtualWindow {
  measure: (key: string, height: number) => void;
}

export function buildRowOffsets(
  keys: readonly string[],
  measured: ReadonlyMap<string, number>,
  estimatedItemHeight: number,
): number[] {
  const offsets: number[] = [0];
  for (const key of keys) {
    offsets.push(offsets.at(-1)! + (measured.get(key) ?? estimatedItemHeight));
  }
  return offsets;
}

interface UseVirtualRowsOptions {
  readonly keys: readonly string[];
  readonly estimatedItemHeight: number;
  readonly overscan?: number;
  readonly scrollRef: RefObject<HTMLElement | null>;
}

export function useVirtualRows({
  keys,
  estimatedItemHeight,
  overscan = 6,
  scrollRef,
}: UseVirtualRowsOptions): VirtualRowsResult {
  const [viewport, setViewport] = useState({ scrollTop: 0, height: 0 });
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const measured = useRef<Map<string, number>>(new Map());
  const frameRef = useRef<number | null>(null);

  const measure = useCallback((key: string, height: number) => {
    if (height > 0 && Math.abs((measured.current.get(key) ?? 0) - height) > 0.5) {
      measured.current.set(key, height);
      setViewport((current) => ({ ...current }));
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current !== scrollElement) {
      setScrollElement(scrollRef.current);
    }
  });

  useEffect(() => {
    const element = scrollElement;
    if (!element) return;

    const update = () => {
      frameRef.current = null;
      setViewport({ scrollTop: element.scrollTop, height: element.clientHeight });
    };

    const onScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(update);
    };

    update();
    element.addEventListener('scroll', onScroll, { passive: true });

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(element);

    return () => {
      element.removeEventListener('scroll', onScroll);
      observer?.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [scrollElement]);

  const offsets = buildRowOffsets(keys, measured.current, estimatedItemHeight);
  const totalHeight = offsets.at(-1) ?? 0;

  const windowRange = computeVirtualWindow({
    offsets,
    scrollTop: viewport.scrollTop,
    viewportHeight: viewport.height,
    overscan,
  });

  return { ...windowRange, totalHeight, measure };
}
