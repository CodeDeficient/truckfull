import { describe, expect, it } from '@jest/globals';
import { createFavoriteIdsStore } from '@/lib/stores/favoriteIdsStore';
import type { FavoriteIdsLoader } from '@/lib/stores/favoriteIdsStore';
import type { FavoritesResult } from '@/lib/services/favorites';

interface Deferred {
  readonly promise: Promise<FavoritesResult<string[]>>;
  readonly resolve: (value: FavoritesResult<string[]>) => void;
}

function deferred(): Deferred {
  let resolve: (value: FavoritesResult<string[]>) => void = () => undefined;
  const promise = new Promise<FavoritesResult<string[]>>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function countingLoader(results: Record<string, string[]>): {
  readonly load: FavoriteIdsLoader;
  readonly calls: string[];
} {
  const calls: string[] = [];
  const load: FavoriteIdsLoader = (userId) => {
    calls.push(userId);
    return Promise.resolve({ data: results[userId] ?? [], error: undefined });
  };
  return { load, calls };
}

describe('favoriteIdsStore', () => {
  it('loads favorites once for many callers of the same user', async () => {
    const { load, calls } = countingLoader({ u1: ['a', 'b'] });
    const store = createFavoriteIdsStore(load);
    await Promise.all([
      store.getState().ensureLoaded('u1'),
      store.getState().ensureLoaded('u1'),
      store.getState().ensureLoaded('u1'),
    ]);
    await store.getState().ensureLoaded('u1');
    expect(calls).toEqual(['u1']);
    expect([...store.getState().favoriteIds]).toEqual(['a', 'b']);
    expect(store.getState().loading).toBe(false);
  });

  it('clears favorites when the user signs out', async () => {
    const { load } = countingLoader({ u1: ['a'] });
    const store = createFavoriteIdsStore(load);
    await store.getState().ensureLoaded('u1');
    await store.getState().ensureLoaded(undefined);
    expect(store.getState().favoriteIds.size).toBe(0);
    expect(store.getState().userId).toBeUndefined();
  });

  it('loads again for a different user', async () => {
    const { load, calls } = countingLoader({ u1: ['a'], u2: ['z'] });
    const store = createFavoriteIdsStore(load);
    await store.getState().ensureLoaded('u1');
    await store.getState().ensureLoaded('u2');
    expect(calls).toEqual(['u1', 'u2']);
    expect([...store.getState().favoriteIds]).toEqual(['z']);
  });

  it('ignores a late answer for a user who is no longer signed in', async () => {
    const first = deferred();
    const store = createFavoriteIdsStore((userId) =>
      userId === 'u1' ? first.promise : Promise.resolve({ data: ['z'], error: undefined }),
    );
    const pending = store.getState().ensureLoaded('u1');
    await store.getState().ensureLoaded('u2');
    first.resolve({ data: ['a'], error: undefined });
    await pending;
    expect(store.getState().userId).toBe('u2');
    expect([...store.getState().favoriteIds]).toEqual(['z']);
  });

  it('shares a toggled favorite with every caller', async () => {
    const { load } = countingLoader({ u1: ['a'] });
    const store = createFavoriteIdsStore(load);
    await store.getState().ensureLoaded('u1');
    store.getState().markFavorite('u1', 'b', true);
    store.getState().markFavorite('u1', 'a', false);
    store.getState().markFavorite('other', 'c', true);
    expect([...store.getState().favoriteIds]).toEqual(['b']);
  });

  it('keeps the error and retries on the next call after a failed load', async () => {
    let attempt = 0;
    const store = createFavoriteIdsStore(() => {
      attempt += 1;
      return Promise.resolve(
        attempt === 1 ? { data: undefined, error: 'boom' } : { data: ['a'], error: undefined },
      );
    });
    await store.getState().ensureLoaded('u1');
    expect(store.getState().error).toBe('boom');
    await store.getState().ensureLoaded('u1');
    expect(store.getState().error).toBeUndefined();
    expect([...store.getState().favoriteIds]).toEqual(['a']);
  });

  it('keeps a heart tapped while the first load is still running', async () => {
    const first = deferred();
    const store = createFavoriteIdsStore(() => first.promise);
    const pending = store.getState().ensureLoaded('u1');
    store.getState().markFavorite('u1', 'new', true);
    store.getState().markFavorite('u1', 'old', false);
    first.resolve({ data: ['old', 'kept'], error: undefined });
    await pending;
    expect([...store.getState().favoriteIds].sort()).toEqual(['kept', 'new']);
  });

  it('fetches again when a reload is asked for during a load', async () => {
    const answers = [deferred(), deferred()];
    let call = 0;
    const store = createFavoriteIdsStore(() => answers[call++].promise);
    const firstLoad = store.getState().ensureLoaded('u1');
    const secondLoad = store.getState().reload('u1');
    answers[1].resolve({ data: ['fresh'], error: undefined });
    answers[0].resolve({ data: ['stale'], error: undefined });
    await Promise.all([firstLoad, secondLoad]);
    expect(call).toBe(2);
    expect([...store.getState().favoriteIds]).toEqual(['fresh']);
  });

  it('reloads from the server on request', async () => {
    const { load, calls } = countingLoader({ u1: ['a'] });
    const store = createFavoriteIdsStore(load);
    await store.getState().ensureLoaded('u1');
    await store.getState().reload('u1');
    expect(calls).toEqual(['u1', 'u1']);
  });
});
