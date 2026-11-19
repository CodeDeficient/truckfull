import { describe, expect, it } from '@jest/globals';
import { createUserResourceStore, isUserResourceLoading } from '@/lib/stores/userResourceStore';

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (error: Error) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('userResourceStore', () => {
  it('loads once for many callers of the same user', async () => {
    const calls: string[] = [];
    const store = createUserResourceStore((userId) => {
      calls.push(userId);
      return Promise.resolve(`tier-of-${userId}`);
    });
    await Promise.all([
      store.getState().ensureLoaded('u1'),
      store.getState().ensureLoaded('u1'),
      store.getState().ensureLoaded('u1'),
    ]);
    await store.getState().ensureLoaded('u1');
    expect(calls).toEqual(['u1']);
    expect(store.getState().data).toBe('tier-of-u1');
    expect(store.getState().loading).toBe(false);
  });

  it('clears data on sign-out and loads again for the next user', async () => {
    const calls: string[] = [];
    const store = createUserResourceStore((userId) => {
      calls.push(userId);
      return Promise.resolve(userId);
    });
    await store.getState().ensureLoaded('u1');
    await store.getState().ensureLoaded(undefined);
    expect(store.getState().data).toBeUndefined();
    expect(store.getState().loading).toBe(false);
    await store.getState().ensureLoaded('u2');
    expect(calls).toEqual(['u1', 'u2']);
    expect(store.getState().data).toBe('u2');
  });

  it('ignores a late answer for a user who is no longer signed in', async () => {
    const first = deferred<string>();
    const store = createUserResourceStore((userId) =>
      userId === 'u1' ? first.promise : Promise.resolve('second'),
    );
    const pending = store.getState().ensureLoaded('u1');
    await store.getState().ensureLoaded('u2');
    first.resolve('first');
    await pending;
    expect(store.getState().data).toBe('second');
  });

  it('keeps the error and retries on the next call after a failed load', async () => {
    let attempt = 0;
    const store = createUserResourceStore(() => {
      attempt += 1;
      return attempt === 1 ? Promise.reject(new Error('boom')) : Promise.resolve('ok');
    });
    await store.getState().ensureLoaded('u1');
    expect(store.getState().error).toBe('boom');
    expect(store.getState().loading).toBe(false);
    await store.getState().ensureLoaded('u1');
    expect(store.getState().error).toBeUndefined();
    expect(store.getState().data).toBe('ok');
  });

  it('fetches again when a reload is asked for during a load', async () => {
    const answers = [deferred<string>(), deferred<string>()];
    let call = 0;
    const store = createUserResourceStore(() => answers[call++].promise);
    const firstLoad = store.getState().ensureLoaded('u1');
    const secondLoad = store.getState().reload('u1');
    answers[1].resolve('fresh');
    answers[0].resolve('stale');
    await Promise.all([firstLoad, secondLoad]);
    expect(call).toBe(2);
    expect(store.getState().data).toBe('fresh');
  });

  it('reloads quietly without flipping loading when asked to', async () => {
    const second = deferred<string>();
    let call = 0;
    const store = createUserResourceStore(() =>
      call++ === 0 ? Promise.resolve('first') : second.promise,
    );
    await store.getState().ensureLoaded('u1');
    const reload = store.getState().reload('u1', false);
    expect(store.getState().loading).toBe(false);
    expect(store.getState().data).toBe('first');
    second.resolve('second');
    await reload;
    expect(store.getState().data).toBe('second');
  });

  it('counts as loading before the first load for a signed-in user starts', () => {
    const store = createUserResourceStore(() => Promise.resolve('paid'));
    expect(isUserResourceLoading(store.getState(), 'u1', false)).toBe(true);
    expect(isUserResourceLoading(store.getState(), undefined, false)).toBe(false);
    expect(isUserResourceLoading(store.getState(), undefined, true)).toBe(true);
  });

  it('stops counting as loading once the user data has arrived', async () => {
    const store = createUserResourceStore(() => Promise.resolve('paid'));
    await store.getState().ensureLoaded('u1');
    expect(isUserResourceLoading(store.getState(), 'u1', false)).toBe(false);
    expect(isUserResourceLoading(store.getState(), 'u2', false)).toBe(true);
  });

  it('reuses fresh data and quietly refetches once it is older than the limit', async () => {
    let clock = 1_000;
    let call = 0;
    const store = createUserResourceStore(() => Promise.resolve(`v${++call}`), {
      maxAgeMs: 30_000,
      now: () => clock,
    });
    await store.getState().ensureLoaded('u1');
    clock += 29_000;
    await store.getState().ensureLoaded('u1');
    expect(call).toBe(1);
    clock += 2_000;
    const refetch = store.getState().ensureLoaded('u1');
    expect(store.getState().loading).toBe(false);
    expect(store.getState().data).toBe('v1');
    await refetch;
    expect(call).toBe(2);
    expect(store.getState().data).toBe('v2');
  });
});
