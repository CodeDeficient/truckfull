import { monitorEventLoopDelay } from 'node:perf_hooks';

export const LOOP_WINDOW_MS = 10_000;
export const LOOP_RESOLUTION_MS = 20;
const NANOSECONDS_PER_MS = 1_000_000;

export interface LagHistogram {
  percentile(percentile: number): number;
  reset(): void;
}

export type LagReader = () => number;

export function createLagReader(histogram: LagHistogram, now: () => number = Date.now): LagReader {
  let windowStart = now();
  return function readLag(): number {
    const p99 = histogram.percentile(99) / NANOSECONDS_PER_MS;
    if (now() - windowStart >= LOOP_WINDOW_MS) {
      histogram.reset();
      windowStart = now();
    }
    return Number.isFinite(p99) ? Math.max(0, Math.round(p99 - LOOP_RESOLUTION_MS)) : 0;
  };
}

let processReader: LagReader | null = null;

export function eventLoopLagMs(): number {
  if (processReader === null) {
    const histogram = monitorEventLoopDelay({ resolution: LOOP_RESOLUTION_MS });
    histogram.enable();
    processReader = createLagReader(histogram);
  }
  return processReader();
}

export function withLoopTiming<T extends Response>(response: T, readLag: LagReader = eventLoopLagMs): T {
  try {
    response.headers.append('server-timing', `loop;dur=${readLag()}`);
  } catch {
    return response;
  }
  return response;
}
