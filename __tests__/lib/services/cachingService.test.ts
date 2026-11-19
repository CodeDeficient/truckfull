import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

const { CachingService, cachingService } = await import('@/lib/services/cachingService');
import type { FoodTruckDomain } from '@/lib/types';

describe('CachingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    localStorageMock.removeItem.mockReset();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = CachingService.getInstance();
      const instance2 = CachingService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('canMakeRequest', () => {
    it('should allow request when counter is empty', () => {
      const service = CachingService.getInstance();

      const result = service.canMakeRequest('user-new-123');

      expect(result).toBe(true);
    });

    it('should allow authenticated user up to 120 requests per minute', () => {
      const service = CachingService.getInstance();
      const userId = 'user-auth-123';

      for (let i = 0; i < 119; i++) {
        expect(service.canMakeRequest(userId)).toBe(true);
      }
      expect(service.canMakeRequest(userId)).toBe(true);
    });

    it('should allow anonymous user up to 30 requests per minute', () => {
      const service = CachingService.getInstance();

      for (let i = 0; i < 29; i++) {
        expect(service.canMakeRequest()).toBe(true);
      }
      expect(service.canMakeRequest()).toBe(true);
    });

    it('should block anonymous user after 30 requests', () => {
      const service = CachingService.getInstance();

      for (let i = 0; i < 30; i++) {
        service.canMakeRequest();
      }

      const result = service.canMakeRequest();

      expect(result).toBe(false);
    });
  });

  describe('getCachedFoodTrucks', () => {
    it('should return null when cache is empty', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const service = CachingService.getInstance();
      const result = await service.getCachedFoodTrucks();

      expect(result).toBeNull();
    });

    it('should return cached data when valid', async () => {
      const cachedData: FoodTruckDomain[] = [
        { id: '1', name: 'Truck 1' } as FoodTruckDomain,
        { id: '2', name: 'Truck 2' } as FoodTruckDomain,
      ];

      const cacheEntry = {
        data: cachedData,
        timestamp: Date.now(),
        version: '1.0',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cacheEntry));

      const service = CachingService.getInstance();
      const result = await service.getCachedFoodTrucks();

      expect(result).toEqual(cachedData);
    });

    it('should return null and remove cache when expired', async () => {
      const cacheEntry = {
        data: [],
        timestamp: Date.now() - 5 * 60 * 60 * 1000,
        version: '1.0',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cacheEntry));

      const service = CachingService.getInstance();
      const result = await service.getCachedFoodTrucks();

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    it('should return null and remove cache when version mismatch', async () => {
      const cacheEntry = {
        data: [],
        timestamp: Date.now(),
        version: '0.9',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cacheEntry));

      const service = CachingService.getInstance();
      const result = await service.getCachedFoodTrucks();

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    it('should handle JSON parse errors', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      localStorageMock.getItem.mockReturnValue('invalid json');

      const service = CachingService.getInstance();
      const result = await service.getCachedFoodTrucks();

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('setCachedFoodTrucks', () => {
    it('should store data in localStorage', async () => {
      const trucks: FoodTruckDomain[] = [
        { id: '1', name: 'Truck 1' } as FoodTruckDomain,
      ];

      const service = CachingService.getInstance();
      await service.setCachedFoodTrucks(trucks);

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const storedValue = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(storedValue.data).toEqual(trucks);
      expect(storedValue.version).toBe('1.0');
    });

    it('should handle storage errors', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const service = CachingService.getInstance();
      await service.setCachedFoodTrucks([]);

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('getCachedFeaturedContent', () => {
    it('should return null when cache is empty', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const service = CachingService.getInstance();
      const result = await service.getCachedFeaturedContent();

      expect(result).toBeNull();
    });

    it('should return cached content when valid', async () => {
      const content = { featured: true, items: ['item1', 'item2'] };

      const cacheEntry = {
        data: content,
        timestamp: Date.now(),
        version: '1.0',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cacheEntry));

      const service = CachingService.getInstance();
      const result = await service.getCachedFeaturedContent();

      expect(result).toEqual(content);
    });
  });

  describe('setCachedFeaturedContent', () => {
    it('should store content in localStorage', async () => {
      const content = { featured: true };

      const service = CachingService.getInstance();
      await service.setCachedFeaturedContent(content);

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cached data', async () => {
      const service = CachingService.getInstance();
      await service.clearAllCache();

      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const service = CachingService.getInstance();
      const stats = service.getCacheStats();

      expect(stats).toHaveProperty('foodTrucksSize');
      expect(stats).toHaveProperty('featuredContentSize');
      expect(stats).toHaveProperty('requestCounts');
    });

    it('should calculate size of cached data', () => {
      const cacheEntry = {
        data: { test: 'data' },
        timestamp: Date.now(),
        version: '1.0',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cacheEntry));

      const service = CachingService.getInstance();
      const stats = service.getCacheStats();

      expect(stats.foodTrucksSize).toBeGreaterThan(0);
    });
  });
});

describe('cachingService singleton', () => {
  it('should export a singleton instance', () => {
    expect(cachingService).toBeInstanceOf(CachingService);
  });
});