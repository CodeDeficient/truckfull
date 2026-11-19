import { jest } from '@jest/globals';

export const useFavorites = jest.fn(() => ({
  favoriteIds: new Set(),
  toggleFavorite: jest.fn().mockResolvedValue({ success: true }),
  isFavorited: jest.fn(() => false),
  loading: false,
  error: undefined,
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
  refreshFavorites: jest.fn(),
  isAuthenticated: true,
}));

export default useFavorites;
