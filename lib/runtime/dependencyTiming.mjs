export const STAGE_WINDOW_MS = 10_000;
const PROCESS_RECORDER = Symbol.for('truckfull.dependencyTiming');

export function createStageRecorder(now = Date.now) {
  const stages = new Map();
  const windowFor = (name) => {
    const at = now();
    let stage = stages.get(name);
    if (!stage) {
      stage = { start: at, current: 0, previous: 0 };
      stages.set(name, stage);
    }
    const elapsed = at - stage.start;
    if (elapsed >= STAGE_WINDOW_MS) {
      stage.previous = elapsed >= 2 * STAGE_WINDOW_MS ? 0 : stage.current;
      stage.current = 0;
      stage.start = at;
    }
    return stage;
  };
  return {
    record(name, ms) {
      const stage = windowFor(name);
      stage.current = Math.max(stage.current, Math.max(0, Math.round(ms)));
    },
    slowest(name) {
      const stage = windowFor(name);
      return Math.max(stage.current, stage.previous);
    },
  };
}

function processRecorder() {
  globalThis[PROCESS_RECORDER] ??= createStageRecorder();
  return globalThis[PROCESS_RECORDER];
}

export function recordStage(name, ms) {
  processRecorder().record(name, ms);
}

export function slowestStage(name) {
  return processRecorder().slowest(name);
}

export async function timedStage(name, task) {
  const started = Date.now();
  try {
    return await task();
  } finally {
    recordStage(name, Date.now() - started);
  }
}

export function timedFetch(name, fetchImpl) {
  return (input, init) => timedStage(name, () => fetchImpl(input, init));
}

export function withDependencyTiming(response, readSlowest = slowestStage) {
  try {
    response.headers.append('server-timing', `db-max;dur=${readSlowest('db')}`);
    response.headers.append('server-timing', `r2-max;dur=${readSlowest('r2')}`);
  } catch {
    return response;
  }
  return response;
}
