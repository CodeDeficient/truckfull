import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';

export type UserResourceLoader<T> = (userId: string) => Promise<T>;

export interface UserResourceOptions {
  readonly maxAgeMs?: number;
  readonly now?: () => number;
}

interface UserResourceState<T> {
  readonly userId: string | undefined;
  readonly data: T | undefined;
  readonly loading: boolean;
  readonly error: string | undefined;
}

interface UserResourceActions {
  readonly ensureLoaded: (userId: string | undefined) => Promise<void>;
  readonly reload: (userId: string, showLoading?: boolean) => Promise<void>;
}

export type UserResourceStore<T> = UserResourceState<T> & UserResourceActions;

interface PendingLoad {
  readonly userId: string;
  readonly generation: number;
  readonly promise: Promise<void>;
}

export function isUserResourceLoading(
  state: Pick<UserResourceState<unknown>, 'userId' | 'loading'>,
  userId: string | undefined,
  authLoading: boolean,
): boolean {
  if (authLoading) return true;
  if (userId == undefined) return false;
  return state.userId !== userId || state.loading;
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}

export function createUserResourceStore<T>(
  load: UserResourceLoader<T>,
  options: UserResourceOptions = {},
): UseBoundStore<StoreApi<UserResourceStore<T>>> {
  const maxAgeMs = options.maxAgeMs ?? Number.POSITIVE_INFINITY;
  const now = options.now ?? Date.now;
  let generation = 0;
  let pending: PendingLoad | undefined;
  let loadedUserId: string | undefined;
  let loadedAt = 0;

  return create<UserResourceStore<T>>((set, get) => {
    const isCurrent = (userId: string, gen: number): boolean =>
      gen === generation && get().userId === userId;

    const fetchFor = (userId: string, showLoading: boolean): Promise<void> => {
      generation += 1;
      const gen = generation;
      set(showLoading ? { loading: true, error: undefined } : { error: undefined });
      const promise = load(userId)
        .then((data) => {
          if (!isCurrent(userId, gen)) return;
          loadedUserId = userId;
          loadedAt = now();
          set({ data, loading: false });
        })
        .catch((error: unknown) => {
          if (isCurrent(userId, gen)) set({ error: messageFrom(error), loading: false });
        })
        .finally(() => {
          if (pending?.generation === gen) pending = undefined;
        });
      pending = { userId, generation: gen, promise };
      return promise;
    };

    const switchUser = (userId: string | undefined): void => {
      generation += 1;
      pending = undefined;
      loadedUserId = undefined;
      set({ userId, data: undefined, loading: userId != undefined, error: undefined });
    };

    return {
      userId: undefined,
      data: undefined,
      loading: false,
      error: undefined,
      ensureLoaded: (userId) => {
        if (get().userId !== userId) switchUser(userId);
        if (userId == undefined) return Promise.resolve();
        if (pending?.userId === userId) return pending.promise;
        if (loadedUserId !== userId) return fetchFor(userId, true);
        if (now() - loadedAt < maxAgeMs) return Promise.resolve();
        return fetchFor(userId, false);
      },
      reload: (userId, showLoading = true) =>
        get().userId === userId ? fetchFor(userId, showLoading) : Promise.resolve(),
    };
  });
}
