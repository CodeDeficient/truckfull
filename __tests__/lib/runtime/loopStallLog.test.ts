/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  MAX_LOGS_PER_MINUTE,
  RECENT_WINDOW_MS,
  STALL_LOG_MS,
  WATCH_INTERVAL_MS,
  createStallWatchdog,
} from '../../../lib/runtime/loopStallLog.mjs';

function setup(): {
  advance: (ms: number) => void;
  lines: Array<{ event: string; stalledMs: number; recentPaths: string[] }>;
  watchdog: ReturnType<typeof createStallWatchdog>;
} {
  let at = 1_000_000;
  const lines: Array<{ event: string; stalledMs: number; recentPaths: string[] }> = [];
  const watchdog = createStallWatchdog({
    now: () => at,
    log: (line: string) => lines.push(JSON.parse(line)),
  });
  return { advance: (ms: number) => (at += ms), lines, watchdog };
}

describe('createStallWatchdog', () => {
  it('stays quiet while the loop keeps time', () => {
    const { advance, lines, watchdog } = setup();
    for (let i = 0; i < 20; i += 1) {
      advance(WATCH_INTERVAL_MS + 40);
      watchdog.tick();
    }
    expect(lines).toEqual([]);
  });

  it('logs a stall with the pages that started shortly before it', () => {
    const { advance, lines, watchdog } = setup();
    watchdog.note('/old-page');
    for (let elapsed = 0; elapsed <= RECENT_WINDOW_MS + 1000; elapsed += WATCH_INTERVAL_MS) {
      advance(WATCH_INTERVAL_MS);
      watchdog.tick();
    }
    watchdog.note('/about');
    watchdog.note('/trucks');
    watchdog.note('/about');
    advance(WATCH_INTERVAL_MS + 1800);
    watchdog.tick();
    expect(lines).toEqual([
      { event: 'loop_stall', stalledMs: 1800, recentPaths: ['/about', '/trucks'] },
    ]);
  });

  it('ignores delays below the threshold', () => {
    const { advance, lines, watchdog } = setup();
    advance(WATCH_INTERVAL_MS + STALL_LOG_MS - 1);
    watchdog.tick();
    expect(lines).toEqual([]);
  });

  it('caps how often it logs', () => {
    const { advance, lines, watchdog } = setup();
    for (let i = 0; i < MAX_LOGS_PER_MINUTE + 3; i += 1) {
      advance(WATCH_INTERVAL_MS + STALL_LOG_MS);
      watchdog.tick();
    }
    expect(lines).toHaveLength(MAX_LOGS_PER_MINUTE);
    advance(60_000);
    watchdog.tick();
    expect(lines).toHaveLength(MAX_LOGS_PER_MINUTE + 1);
  });

  it('is fed every request path by the proxy', () => {
    const source = readFileSync(resolve(process.cwd(), 'proxy.ts'), 'utf8');
    expect(source).toContain('noteRequestPath(request.nextUrl.pathname);');
  });
});
