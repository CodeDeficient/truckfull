import { describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';

interface AuthState {
  user: { id: string } | null;
  loading: boolean;
}

let auth: AuthState = { user: null, loading: true };
const calls: string[] = [];

jest.unstable_mockModule('@/app/auth/AuthProvider', () => ({
  useAuth: () => auth,
}));

jest.unstable_mockModule('@/lib/services/cachingService', () => ({
  cachingService: { canMakeRequest: () => true },
}));

jest.unstable_mockModule('@/lib/services/favorites', () => ({
  FavoritesService: {
    getFavoritedTrucks: (userId: string) => {
      calls.push(userId);
      return Promise.resolve({ data: [], error: undefined });
    },
  },
}));

const { useFavoritesData } = await import('@/hooks/useFavoritesData');

describe('useFavoritesData', () => {
  it('loads the list once when the same user arrives as a new object', async () => {
    const { rerender, result } = renderHook(() => useFavoritesData());
    auth = { user: { id: 'u1' }, loading: false };
    rerender();
    auth = { user: { id: 'u1' }, loading: false };
    rerender();
    auth = { user: { id: 'u1' }, loading: false };
    rerender();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(calls).toEqual(['u1']);
  });
});
