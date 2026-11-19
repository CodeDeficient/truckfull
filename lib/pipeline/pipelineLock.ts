import { randomId } from './secureRandom';

export interface PipelineLockStore {
  set(
    key: string,
    value: string,
    options: { nx: true; ex: number },
  ): Promise<'OK' | null | unknown>;
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
}

export interface PipelineLockOptions {
  store: PipelineLockStore;
  key: string;
  ttlSeconds: number;
  now?: () => number;
  token?: string;
}

export interface PipelineLock {
  readonly key: string;
  readonly token: string;
  readonly acquiredAt: number;
  release(): Promise<boolean>;
  renew(ttlSeconds?: number): Promise<boolean>;
  isHeld(): boolean;
}

const RELEASE_SCRIPT = [
  "if redis.call('get', KEYS[1]) == ARGV[1] then",
  "  redis.call('del', KEYS[1])",
  '  return 1',
  'end',
  'return 0',
].join('\n');

const RENEW_SCRIPT = [
  "if redis.call('get', KEYS[1]) == ARGV[1] then",
  "  redis.call('expire', KEYS[1], ARGV[2])",
  '  return 1',
  'end',
  'return 0',
].join('\n');

export function createPipelineLockToken(): string {
  return randomId();
}

export async function acquirePipelineLock(
  options: PipelineLockOptions,
): Promise<PipelineLock | null> {
  const { store, key, ttlSeconds } = options;
  const now = options.now ?? (() => Date.now());
  const token = options.token ?? createPipelineLockToken();

  const result = await store.set(key, token, { nx: true, ex: ttlSeconds });
  if (result !== 'OK') {
    return null;
  }

  let held = true;
  let heartbeat: ReturnType<typeof setTimeout>;
  const lock: PipelineLock = {
    key,
    token,
    acquiredAt: now(),
    isHeld(): boolean {
      return held;
    },
    async release(): Promise<boolean> {
      if (!held) return false;
      held = false;
      clearTimeout(heartbeat);
      const released = await store.eval(RELEASE_SCRIPT, [key], [token]);
      return released !== 0 && released !== null;
    },
    async renew(nextTtlSeconds?: number): Promise<boolean> {
      if (!held) return false;
      const ttl = nextTtlSeconds ?? ttlSeconds;
      const renewed = await store.eval(RENEW_SCRIPT, [key], [token, String(ttl)]);
      if (renewed === 0 || renewed === null) {
        held = false;
        clearTimeout(heartbeat);
        return false;
      }
      return true;
    },
  };

  function scheduleRenewal(): void {
    heartbeat = setTimeout(async () => {
      try {
        if (!(await lock.renew())) return;
      } catch {
        held = false;
        return;
      }
      if (held) scheduleRenewal();
    }, Math.max(1, Math.floor((ttlSeconds * 1000) / 3)));
    heartbeat.unref?.();
  }

  scheduleRenewal();
  return lock;
}
