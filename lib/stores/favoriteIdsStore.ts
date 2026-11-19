import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { FavoritesResult } from '@/lib/services/favorites';

export type FavoriteIdsLoader = (userId: string) => Promise<FavoritesResult<string[]>>;

interface FavoriteIdsState {
  readonly userId: string | undefined;
  readonly favoriteIds: Set<string>;
  readonly loading: boolean;
  readonly error: string | undefined;
}

interface FavoriteIdsActions {
  readonly ensureLoaded: (userId: string | undefined) => Promise<void>;
  readonly reload: (userId: string) => Promise<void>;
  readonly markFavorite: (userId: string, truckId: string, favorited: boolean) => void;
}

export type FavoriteIdsStore = FavoriteIdsState & FavoriteIdsActions;

interface PendingLoad {
  readonly userId: string;
  readonly generation: number;
  readonly promise: Promise<void>;
}

const EMPTY_STATE: FavoriteIdsState = {
  userId: undefined,
  favoriteIds: new Set<string>(),
  loading: false,
  error: undefined,
};

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to fetch favorites';
}

function withMarks(ids: readonly string[], marks: ReadonlyMap<string, boolean>): Set<string> {
  const next = new Set(ids);
  for (const [truckId, favorited] of marks) {
    if (favorited) next.add(truckId);
    else next.delete(truckId);
  }
  return next;
}

export function createFavoriteIdsStore(
  load: FavoriteIdsLoader,
): UseBoundStore<StoreApi<FavoriteIdsStore>> {
  let generation = 0;
  let pending: PendingLoad | undefined;
  let loadedUserId: string | undefined;
  const marksDuringLoad = new Map<string, boolean>();

  return create<FavoriteIdsStore>((set, get) => {
    const isCurrent = (userId: string, gen: number): boolean =>
      gen === generation && get().userId === userId;

    const applyResult = (userId: string, gen: number, result: FavoritesResult<string[]>): void => {
      if (!isCurrent(userId, gen)) return;
      if (result.error == undefined || result.error === '') {
        loadedUserId = userId;
        set({ favoriteIds: withMarks(result.data ?? [], marksDuringLoad), loading: false });
      } else {
        set({ error: result.error, loading: false });
      }
      marksDuringLoad.clear();
    };

    const fetchFor = (userId: string): Promise<void> => {
      generation += 1;
      const gen = generation;
      marksDuringLoad.clear();
      set({ loading: true, error: undefined });
      const promise = load(userId)
        .then((result) => applyResult(userId, gen, result))
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
      marksDuringLoad.clear();
      set({ ...EMPTY_STATE, userId });
    };

    return {
      ...EMPTY_STATE,
      ensureLoaded: (userId) => {
        if (get().userId !== userId) switchUser(userId);
        if (userId == undefined || loadedUserId === userId) return Promise.resolve();
        if (pending?.userId === userId) return pending.promise;
        return fetchFor(userId);
      },
      reload: (userId) => (get().userId === userId ? fetchFor(userId) : Promise.resolve()),
      markFavorite: (userId, truckId, favorited) => {
        if (get().userId !== userId) return;
        if (pending) marksDuringLoad.set(truckId, favorited);
        const next = new Set(get().favoriteIds);
        if (favorited) next.add(truckId);
        else next.delete(truckId);
        set({ favoriteIds: next });
      },
    };
  });
}
