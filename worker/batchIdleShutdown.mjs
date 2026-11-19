const SHUTDOWN_GRACE_MS = 60_000;
export const BATCH_SHUTDOWN_STATE_KEY = 'batch-idle-shutdown';

async function signalBounded(container, storage, state, signal) {
  const attempts = state.attempts ?? 0;
  if (attempts >= 3) {
    container.renewActivityTimeout();
    return;
  }
  await storage.put(BATCH_SHUTDOWN_STATE_KEY, { ...state, attempts: attempts + 1 });
  try {
    await container.stop(signal);
    if (signal === 'SIGKILL') await storage.delete(BATCH_SHUTDOWN_STATE_KEY);
  } catch {
    console.error(
      '[batch-idle-shutdown] stop failed; manual recovery required after three attempts',
    );
    container.renewActivityTimeout();
  }
}

export async function expireBatchContainer(container, maxRunMs, now = Date.now()) {
  const storage = container.ctx.storage;
  const stored = await storage.get(BATCH_SHUTDOWN_STATE_KEY);
  const state = stored ?? { deadline: now + maxRunMs };
  let status;
  try {
    const response = await container.containerFetch('https://container/status', {
      headers: { authorization: `Bearer ${container.envVars.CRON_SECRET}` },
      signal: AbortSignal.timeout(10_000),
    });
    const result = response.ok ? await response.json() : null;
    status = result?.status;
  } catch {
    console.error('[batch-idle-shutdown] status request failed');
  }
  if (['idle', 'completed', 'failed', 'skipped', 'interrupted'].includes(status)) {
    await signalBounded(container, storage, state, 'SIGKILL');
    return;
  }
  if (status === 'running' && now < state.deadline && state.stopAt === undefined) {
    if (stored === undefined) await storage.put(BATCH_SHUTDOWN_STATE_KEY, state);
    container.renewActivityTimeout();
    return;
  }
  if (state.stopAt === undefined) {
    await signalBounded(
      container,
      storage,
      { ...state, stopAt: now + SHUTDOWN_GRACE_MS },
      'SIGTERM',
    );
    container.renewActivityTimeout();
    return;
  }
  if (now >= state.stopAt) {
    await signalBounded(container, storage, state, 'SIGKILL');
    return;
  }
  container.renewActivityTimeout();
}
