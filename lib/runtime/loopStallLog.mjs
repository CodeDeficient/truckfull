export const STALL_LOG_MS = 500;
export const WATCH_INTERVAL_MS = 100;
export const RECENT_WINDOW_MS = 5000;
export const MAX_RECENT = 64;
export const MAX_LOGGED_PATHS = 12;
export const MAX_LOGS_PER_MINUTE = 6;
const PROCESS_WATCHDOG = Symbol.for('truckfull.loopStallLog');

export function createStallWatchdog({ now = Date.now, log = console.log } = {}) {
  const recent = [];
  let lastTick = now();
  let minuteStart = lastTick;
  let loggedThisMinute = 0;

  const note = (path) => {
    recent.push({ path, at: now() });
    if (recent.length > MAX_RECENT) recent.shift();
  };

  const recentPaths = (until) => {
    const since = until - RECENT_WINDOW_MS;
    const paths = recent.filter((entry) => entry.at >= since).map((entry) => entry.path);
    return [...new Set(paths)].slice(-MAX_LOGGED_PATHS);
  };

  const allowed = (at) => {
    if (at - minuteStart >= 60_000) {
      minuteStart = at;
      loggedThisMinute = 0;
    }
    loggedThisMinute += 1;
    return loggedThisMinute <= MAX_LOGS_PER_MINUTE;
  };

  const tick = () => {
    const at = now();
    const stalledMs = at - lastTick - WATCH_INTERVAL_MS;
    lastTick = at;
    if (stalledMs < STALL_LOG_MS || !allowed(at)) return;
    log(
      JSON.stringify({
        event: 'loop_stall',
        stalledMs: Math.round(stalledMs),
        recentPaths: recentPaths(at - stalledMs),
      }),
    );
  };

  return { note, tick };
}

export function noteRequestPath(path) {
  if (globalThis[PROCESS_WATCHDOG] === undefined) {
    const watchdog = createStallWatchdog();
    const timer = setInterval(watchdog.tick, WATCH_INTERVAL_MS);
    if (typeof timer.unref === 'function') timer.unref();
    globalThis[PROCESS_WATCHDOG] = watchdog;
  }
  globalThis[PROCESS_WATCHDOG].note(path);
}
