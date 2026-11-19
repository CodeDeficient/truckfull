const FALLBACK_DELAY_MS = 200;
const IDLE_TIMEOUT_MS = 3000;

export function runWhenIdle(task: () => void): () => void {
  if (typeof globalThis.requestIdleCallback === 'function') {
    const handle = globalThis.requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS });
    return () => globalThis.cancelIdleCallback(handle);
  }
  const handle = globalThis.setTimeout(task, FALLBACK_DELAY_MS);
  return () => globalThis.clearTimeout(handle);
}
