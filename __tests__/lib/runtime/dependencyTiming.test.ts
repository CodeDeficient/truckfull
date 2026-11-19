/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  STAGE_WINDOW_MS,
  createStageRecorder,
  recordStage,
  slowestStage,
  timedFetch,
  timedStage,
  withDependencyTiming,
} from '../../../lib/runtime/dependencyTiming.mjs';

function clock(start = 0): { now: () => number; advance: (ms: number) => void } {
  let at = start;
  return { now: () => at, advance: (ms: number) => (at += ms) };
}

describe('createStageRecorder', () => {
  it('reports the slowest call per stage', () => {
    const time = clock();
    const recorder = createStageRecorder(time.now);
    recorder.record('db', 120);
    recorder.record('db', 2400.4);
    recorder.record('db', 300);
    recorder.record('r2', 40);
    expect(recorder.slowest('db')).toBe(2400);
    expect(recorder.slowest('r2')).toBe(40);
    expect(recorder.slowest('other')).toBe(0);
  });

  it('keeps a slow call visible for one more window, then forgets it', () => {
    const time = clock();
    const recorder = createStageRecorder(time.now);
    recorder.record('db', 5000);
    time.advance(STAGE_WINDOW_MS);
    recorder.record('db', 80);
    expect(recorder.slowest('db')).toBe(5000);
    time.advance(STAGE_WINDOW_MS);
    expect(recorder.slowest('db')).toBe(80);
    time.advance(STAGE_WINDOW_MS);
    expect(recorder.slowest('db')).toBe(0);
  });

  it('forgets everything after a long quiet spell', () => {
    const time = clock();
    const recorder = createStageRecorder(time.now);
    recorder.record('db', 5000);
    time.advance(STAGE_WINDOW_MS * 3);
    expect(recorder.slowest('db')).toBe(0);
  });
});

describe('process-wide timing', () => {
  it('times calls that fail as well as calls that succeed', async () => {
    await expect(
      timedStage('test-failing', () => Promise.reject(new Error('down'))),
    ).rejects.toThrow('down');
    expect(slowestStage('test-failing')).toBeGreaterThanOrEqual(0);
    recordStage('test-recorded', 900);
    expect(slowestStage('test-recorded')).toBe(900);
  });

  it('passes fetch arguments through unchanged', async () => {
    const seen: unknown[] = [];
    const wrapped = timedFetch('test-fetch', (input: unknown, init: unknown) => {
      seen.push(input, init);
      return Promise.resolve(new Response('ok'));
    });
    const init = { method: 'GET' };
    const response = await wrapped('https://example.test/a', init);
    expect(await response.text()).toBe('ok');
    expect(seen).toEqual(['https://example.test/a', init]);
  });
});

describe('withDependencyTiming', () => {
  it('adds the slowest recent database and R2 calls to server timing', () => {
    const response = withDependencyTiming(
      new Response('x', { headers: { 'server-timing': 'loop;dur=3' } }),
      (name: string) => (name === 'db' ? 1800 : 25),
    );
    expect(response.headers.get('server-timing')).toBe(
      'loop;dur=3, db-max;dur=1800, r2-max;dur=25',
    );
  });

  it('returns the response untouched when its headers are locked', () => {
    const locked = new Response('x');
    Object.defineProperty(locked, 'headers', {
      value: {
        append: () => {
          throw new TypeError('immutable');
        },
      },
    });
    expect(withDependencyTiming(locked, () => 1)).toBe(locked);
  });
});

describe('wiring', () => {
  const source = (file: string): string => readFileSync(resolve(process.cwd(), file), 'utf8');

  it('times public database reads, R2 page reads, and reports both on every response', () => {
    expect(source('lib/supabase/admin.ts')).toContain(
      "timedFetch('db', fetchWithTimeout(PUBLIC_READ_TIMEOUT_MS))",
    );
    expect(source('lib/next-cache/r2CacheHandler.mjs')).toContain(
      "timedStage('r2', () => remote.readEntry(remoteKey))",
    );
    expect(source('proxy.ts')).toContain(
      'withDependencyTiming(withLoopTiming(await routeRequest(request)))',
    );
  });
});
