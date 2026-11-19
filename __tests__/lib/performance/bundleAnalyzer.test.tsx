/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import {
  getBundleOptimizationRecommendations,
  checkPerformanceBudget,
  PERFORMANCE_BUDGETS,
  BundlePerformanceMonitor,
  createLazyComponent,
  getProjectSpecificRecommendations,
} from '@/lib/performance/bundleAnalyzer';

describe('bundleAnalyzer', () => {
  describe('getBundleOptimizationRecommendations', () => {
    it('should return an array of recommendations', () => {
      const recommendations = getBundleOptimizationRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should include code splitting recommendations', () => {
      const recommendations = getBundleOptimizationRecommendations();
      expect(recommendations.some(r => r.toLowerCase().includes('code splitting') || r.toLowerCase().includes('dynamic imports'))).toBe(true);
    });

    it('should include tree shaking recommendations', () => {
      const recommendations = getBundleOptimizationRecommendations();
      expect(recommendations.some(r => r.toLowerCase().includes('named imports'))).toBe(true);
    });
  });

  describe('PERFORMANCE_BUDGETS', () => {
    it('should have correct structure', () => {
      expect(PERFORMANCE_BUDGETS).toHaveProperty('maxBundleSize');
      expect(PERFORMANCE_BUDGETS).toHaveProperty('maxChunkSize');
      expect(PERFORMANCE_BUDGETS).toHaveProperty('maxInitialLoad');
      expect(PERFORMANCE_BUDGETS).toHaveProperty('maxAssetSize');
    });

    it('should have numeric values', () => {
      expect(typeof PERFORMANCE_BUDGETS.maxBundleSize).toBe('number');
      expect(typeof PERFORMANCE_BUDGETS.maxChunkSize).toBe('number');
      expect(typeof PERFORMANCE_BUDGETS.maxInitialLoad).toBe('number');
      expect(typeof PERFORMANCE_BUDGETS.maxAssetSize).toBe('number');
    });
  });

  describe('checkPerformanceBudget', () => {
    it('should pass when no analysis data provided', () => {
      const result = checkPerformanceBudget({});
      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should pass when total size is within budget', () => {
      const analysis = { totalSize: 400 * 1024 }; // 400KB
      const result = checkPerformanceBudget(analysis);
      expect(result.passed).toBe(true);
    });

    it('should fail when total size exceeds budget', () => {
      const analysis = { totalSize: 600 * 1024 }; // 600KB
      const result = checkPerformanceBudget(analysis);
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].metric).toBe('Total Bundle Size');
    });

    it('should check chunk sizes', () => {
      const analysis = {
        chunks: [
          { name: 'chunk1', size: 250 * 1024, modules: [] },
          { name: 'chunk2', size: 100 * 1024, modules: [] },
        ],
      };
      const result = checkPerformanceBudget(analysis);
      expect(result.violations.some(v => v.metric.includes('chunk1'))).toBe(true);
    });

    it('should handle undefined totalSize', () => {
      const analysis = { chunks: [] };
      const result = checkPerformanceBudget(analysis);
      expect(result.passed).toBe(true);
    });
  });

  describe('BundlePerformanceMonitor', () => {
    it('should track chunk load time', () => {
      const startTime = performance.now() - 100;
      BundlePerformanceMonitor.trackChunkLoad('test-chunk-' + Date.now(), startTime);
      const stats = BundlePerformanceMonitor.getLoadStats();
      expect(stats.length).toBeGreaterThan(0);
    });

    it('should get load stats as array', () => {
      const startTime = performance.now() - 100;
      BundlePerformanceMonitor.trackChunkLoad('test-chunk-' + Date.now(), startTime);
      const stats = BundlePerformanceMonitor.getLoadStats();
      expect(Array.isArray(stats)).toBe(true);
      expect(stats[0]).toHaveProperty('chunk');
      expect(stats[0]).toHaveProperty('loadTime');
    });

    it('should calculate average load time', () => {
      const startTime1 = performance.now() - 100;
      const startTime2 = performance.now() - 200;
      BundlePerformanceMonitor.trackChunkLoad('chunk1-' + Date.now(), startTime1);
      BundlePerformanceMonitor.trackChunkLoad('chunk2-' + Date.now(), startTime2);
      const avg = BundlePerformanceMonitor.getAverageLoadTime();
      expect(typeof avg).toBe('number');
      expect(avg).toBeGreaterThan(0);
    });
  });

  describe('createLazyComponent', () => {
    it('should create a lazy component wrapper', () => {
      const importFn = () => Promise.resolve({ default: () => null });
      const wrapper = createLazyComponent(importFn);
      expect(typeof wrapper).toBe('function');
    });

    it('should handle fallback component', () => {
      const importFn = () => Promise.resolve({ default: () => null });
      const Fallback = () => null;
      const wrapper = createLazyComponent(importFn, Fallback);
      expect(typeof wrapper).toBe('function');
    });
  });

  describe('getProjectSpecificRecommendations', () => {
    it('should return recommendations grouped by category', () => {
      const recommendations = getProjectSpecificRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should have priority levels', () => {
      const recommendations = getProjectSpecificRecommendations();
      recommendations.forEach(rec => {
        expect(['high', 'medium', 'low']).toContain(rec.priority);
      });
    });

    it('should have category and recommendations array', () => {
      const recommendations = getProjectSpecificRecommendations();
      recommendations.forEach(rec => {
        expect(typeof rec.category).toBe('string');
        expect(Array.isArray(rec.recommendations)).toBe(true);
      });
    });
  });

  describe('OptimizedImports', () => {
    it('should have lucide icons', async () => {
      const { OptimizedImports } = await import('@/lib/performance/bundleAnalyzer');
      expect(OptimizedImports).toHaveProperty('icons');
      expect(OptimizedImports.icons).toHaveProperty('Menu');
      expect(OptimizedImports.icons).toHaveProperty('Search');
    });

    it('should have ui components', async () => {
      const { OptimizedImports } = await import('@/lib/performance/bundleAnalyzer');
      expect(OptimizedImports).toHaveProperty('ui');
      expect(OptimizedImports.ui).toHaveProperty('Dialog');
    });
  });
});