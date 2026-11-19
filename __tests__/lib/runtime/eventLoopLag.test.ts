/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import {
  LOOP_RESOLUTION_MS,
  LOOP_WINDOW_MS,
  createLagReader,
  eventLoopLagMs,
  withLoopTiming,
} from '@/lib/runtime/eventLoopLag';

function histogramAt(nanoseconds: number) {
  const state = { value: nanoseconds, resets: 0 };
  return {
    state,
    percentile: (): number => state.value,
    reset: (): void => {
      state.resets += 1;
      state.value = 0;
    },
  };
}

describe('event loop lag', () => {
  it('reports how late the slowest one percent of loop ticks ran, in milliseconds', () => {
    const histogram = histogramAt((LOOP_RESOLUTION_MS + 42) * 1_000_000);
    expect(createLagReader(histogram, () => 0)()).toBe(42);
    expect(histogram.state.resets).toBe(0);
  });

  it('starts a fresh window so an old stall stops showing up', () => {
    let clock = 0;
    const histogram = histogramAt(900_000_000);
    const read = createLagReader(histogram, () => clock);
    clock = LOOP_WINDOW_MS;
    expect(read()).toBe(900 - LOOP_RESOLUTION_MS);
    expect(read()).toBe(0);
    expect(histogram.state.resets).toBe(1);
  });

  it('reads an idle loop ticking on schedule as zero', () => {
    expect(createLagReader(histogramAt(21_400_000), () => 0)()).toBe(1);
    expect(createLagReader(histogramAt(19_000_000), () => 0)()).toBe(0);
  });

  it('reads zero rather than a broken number before any samples', () => {
    expect(createLagReader(histogramAt(Number.NaN), () => 0)()).toBe(0);
  });

  it('measures the real process loop', () => {
    expect(eventLoopLagMs()).toBeGreaterThanOrEqual(0);
  });

  it('adds the reading to the response timing header next to existing entries', () => {
    const response = new Response('ok', { headers: { 'server-timing': 'auth;dur=4' } });
    expect(withLoopTiming(response, () => 17).headers.get('server-timing')).toBe(
      'auth;dur=4, loop;dur=17',
    );
  });

  it('leaves responses with locked headers untouched', () => {
    const locked = new Response('moved', { status: 302 });
    Object.defineProperty(locked, 'headers', {
      value: {
        append: (): void => {
          throw new TypeError('immutable');
        },
      },
    });
    expect(withLoopTiming(locked, () => 5)).toBe(locked);
  });
});
