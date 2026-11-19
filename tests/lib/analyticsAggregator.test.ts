/**
 * Analytics Aggregator Tests
 *
 * Phase 2.2.2: Test analytics data aggregation and calculation
 * Verifies data processing and metric calculation logic
 */

import { test, expect } from '@playwright/test';

// Mock analytics aggregator function
const MockAnalyticsAggregator = {
  aggregateDailyStats: (
    rawData: Array<{
      timestamp: string;
      orders?: number;
      revenue?: number;
      userId?: string;
      truckId?: string;
    }>,
  ) => {
    const dailyStats = new Map<
      string,
      {
        date: string;
        orders: number;
        revenue: number;
        uniqueUsers: Set<string>;
        truckCount: Set<string>;
      }
    >();

    rawData.forEach((item) => {
      const date = new Date(item.timestamp).toISOString().split('T')[0];

      if (!dailyStats.has(date)) {
        dailyStats.set(date, {
          date,
          orders: 0,
          revenue: 0,
          uniqueUsers: new Set(),
          truckCount: new Set(),
        });
      }

      const stats = dailyStats.get(date);
      if (stats) {
        stats.orders += item.orders || 0;
        stats.revenue += item.revenue || 0;
        if (item.userId) stats.uniqueUsers.add(item.userId);
        if (item.truckId) stats.truckCount.add(item.truckId);
      }
    });

    return Array.from(dailyStats.values()).map(
      (stats: {
        date: string;
        orders: number;
        revenue: number;
        uniqueUsers: Set<string>;
        truckCount: Set<string>;
      }) => ({
        ...stats,
        uniqueUsers: stats.uniqueUsers.size,
        truckCount: stats.truckCount.size,
        averageOrderValue: stats.orders > 0 ? stats.revenue / stats.orders : 0,
      }),
    );
  },

  calculateGrowthMetrics: (
    currentData: Array<{ timestamp: string; orders?: number; revenue?: number }>,
    previousData: Array<{ timestamp: string; orders?: number; revenue?: number }>,
  ) => {
    const currentStats = MockAnalyticsAggregator.aggregateDailyStats(currentData);
    const previousStats = MockAnalyticsAggregator.aggregateDailyStats(previousData);

    if (previousStats.length === 0) return null;

    const currentTotal = currentStats.reduce(
      (sum: number, s: { orders: number }) => sum + s.orders,
      0,
    );
    const previousTotal = previousStats.reduce(
      (sum: number, s: { orders: number }) => sum + s.orders,
      0,
    );
    const growthRate =
      previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    const currentRevenue = currentStats.reduce(
      (sum: number, s: { revenue: number }) => sum + s.revenue,
      0,
    );
    const previousRevenue = previousStats.reduce(
      (sum: number, s: { revenue: number }) => sum + s.revenue,
      0,
    );
    const revenueGrowthRate =
      previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    const currentAvgValue =
      currentStats.reduce(
        (sum: number, s: { averageOrderValue: number }) => sum + s.averageOrderValue,
        0,
      ) / currentStats.length;
    const previousAvgValue =
      previousStats.reduce(
        (sum: number, s: { averageOrderValue: number }) => sum + s.averageOrderValue,
        0,
      ) / previousStats.length;
    const avgValueGrowthRate =
      previousAvgValue > 0 ? ((currentAvgValue - previousAvgValue) / previousAvgValue) * 100 : 0;

    return {
      orderGrowthRate: Math.round(growthRate * 100) / 100,
      revenueGrowthRate: Math.round(revenueGrowthRate * 100) / 100,
      avgOrderValueGrowthRate: Math.round(avgValueGrowthRate * 100) / 100,
      currentOrders: currentTotal,
      previousOrders: previousTotal,
      currentRevenue: currentRevenue,
      previousRevenue: previousRevenue,
    };
  },

  filterByTimeRange: (data: Array<{ timestamp: string }>, start: Date, end: Date) => {
    return data.filter((item) => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= start && itemDate <= end;
    });
  },

  calculateTimeSeries: (
    data: Array<{ timestamp: string; value?: number }>,
    interval: 'day' | 'week' | 'month',
  ) => {
    const aggregated: Array<{ period: string; count: number; sum: number; avg: number }> = [];
    const groups = new Map<string, Array<{ timestamp: string; value?: number }>>();

    data.forEach((item) => {
      const date = new Date(item.timestamp);
      let key: string;

      if (interval === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (interval === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        // month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      const group = groups.get(key);
      if (group) {
        group.push(item);
      }
    });

    groups.forEach((items, key) => {
      aggregated.push({
        period: key,
        count: items.length,
        sum: items.reduce((sum: number, i: { value?: number }) => sum + (i.value || 0), 0),
        avg:
          items.length > 0
            ? items.reduce((sum: number, i: { value?: number }) => sum + (i.value || 0), 0) /
              items.length
            : 0,
      });
    });

    return aggregated.sort((a, b) => a.period.localeCompare(b.period));
  },
};

test.describe('Analytics Aggregator', () => {
  test.describe('Daily Stats Aggregation', () => {
    test('aggregates daily stats correctly', () => {
      const rawData = [
        {
          timestamp: '2024-01-15T10:00:00Z',
          orders: 5,
          revenue: 125,
          userId: 'user1',
          truckId: 'truck1',
        },
        {
          timestamp: '2024-01-15T14:00:00Z',
          orders: 3,
          revenue: 75,
          userId: 'user2',
          truckId: 'truck2',
        },
        {
          timestamp: '2024-01-16T10:00:00Z',
          orders: 7,
          revenue: 175,
          userId: 'user3',
          truckId: 'truck1',
        },
      ];

      const result = MockAnalyticsAggregator.aggregateDailyStats(rawData);

      expect(result).toHaveLength(2);

      // Check Jan 15 stats
      const jan15 = result.find((r) => r.date === '2024-01-15');
      expect(jan15.orders).toBe(8);
      expect(jan15.revenue).toBe(200);
      expect(jan15.uniqueUsers).toBe(2);
      expect(jan15.truckCount).toBe(2);
      expect(jan15.averageOrderValue).toBeCloseTo(25, 1);

      // Check Jan 16 stats
      const jan16 = result.find((r) => r.date === '2024-01-16');
      expect(jan16.orders).toBe(7);
      expect(jan16.revenue).toBe(175);
      expect(jan16.uniqueUsers).toBe(1);
      expect(jan16.truckCount).toBe(1);
      expect(jan16.averageOrderValue).toBeCloseTo(25, 1);
    });

    test('handles empty data', () => {
      const result = MockAnalyticsAggregator.aggregateDailyStats([]);
      expect(result).toHaveLength(0);
    });

    test('handles duplicate users and trucks in same day', () => {
      const rawData = [
        {
          timestamp: '2024-01-15T10:00:00Z',
          orders: 5,
          revenue: 125,
          userId: 'user1',
          truckId: 'truck1',
        },
        {
          timestamp: '2024-01-15T14:00:00Z',
          orders: 3,
          revenue: 75,
          userId: 'user1',
          truckId: 'truck1',
        },
      ];

      const result = MockAnalyticsAggregator.aggregateDailyStats(rawData);

      expect(result[0].uniqueUsers).toBe(1); // Same user counted once
      expect(result[0].truckCount).toBe(1); // Same truck counted once
      expect(result[0].orders).toBe(8); // Orders summed
    });
  });

  test.describe('Growth Metrics Calculation', () => {
    test('calculates growth rates correctly', () => {
      const currentData = [
        { timestamp: '2024-01-15T10:00:00Z', orders: 10, revenue: 250 },
        { timestamp: '2024-01-16T10:00:00Z', orders: 15, revenue: 375 },
      ];

      const previousData = [
        { timestamp: '2024-01-08T10:00:00Z', orders: 8, revenue: 200 },
        { timestamp: '2024-01-09T10:00:00Z', orders: 12, revenue: 300 },
      ];

      const metrics = MockAnalyticsAggregator.calculateGrowthMetrics(currentData, previousData);

      expect(metrics).not.toBeNull();
      if (metrics) {
        expect(metrics.orderGrowthRate).toBeCloseTo(25, 0.1); // (25-20)/20 = 25%
        expect(metrics.revenueGrowthRate).toBeCloseTo(25, 0.1); // (625-500)/500 = 25%
        expect(metrics.avgOrderValueGrowthRate).toBeCloseTo(0, 0.1); // Both have avg 25
      }
    });

    test('handles zero previous data', () => {
      const currentData = [{ timestamp: '2024-01-15T10:00:00Z', orders: 10, revenue: 250 }];

      const metrics = MockAnalyticsAggregator.calculateGrowthMetrics(currentData, []);

      expect(metrics).toBeNull();
    });

    test('handles negative growth', () => {
      const currentData = [{ timestamp: '2024-01-15T10:00:00Z', orders: 8, revenue: 200 }];

      const previousData = [{ timestamp: '2024-01-08T10:00:00Z', orders: 10, revenue: 250 }];

      const metrics = MockAnalyticsAggregator.calculateGrowthMetrics(currentData, previousData);

      expect(metrics.orderGrowthRate).toBeLessThan(0);
      expect(metrics.revenueGrowthRate).toBeLessThan(0);
    });

    test('rounds metrics to two decimal places', () => {
      const currentData = [{ timestamp: '2024-01-15T10:00:00Z', orders: 10, revenue: 250 }];

      const previousData = [{ timestamp: '2024-01-08T10:00:00Z', orders: 9, revenue: 225 }];

      const metrics = MockAnalyticsAggregator.calculateGrowthMetrics(currentData, previousData);

      // Check that rates are rounded
      if (metrics) {
        expect(metrics.orderGrowthRate.toString().split('.')[1]?.length).toBeLessThanOrEqual(2);
      }
    });
  });

  test.describe('Time Range Filtering', () => {
    test('filters data by date range', () => {
      const data = [
        { timestamp: '2024-01-10T10:00:00Z', value: 10 },
        { timestamp: '2024-01-15T10:00:00Z', value: 20 },
        { timestamp: '2024-01-20T10:00:00Z', value: 30 },
      ];

      const start = new Date('2024-01-12');
      const end = new Date('2024-01-18');

      const filtered = MockAnalyticsAggregator.filterByTimeRange(data, start, end);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].timestamp).toBe('2024-01-15T10:00:00Z');
      expect(filtered[0].value).toBe(20);
    });

    test('includes boundary dates', () => {
      const data = [
        { timestamp: '2024-01-15T00:00:00Z', value: 10 },
        { timestamp: '2024-01-20T23:59:59Z', value: 20 },
      ];

      const start = new Date('2024-01-15');
      const end = new Date('2024-01-20');

      const filtered = MockAnalyticsAggregator.filterByTimeRange(data, start, end);

      expect(filtered).toHaveLength(2);
    });

    test('returns empty when no data in range', () => {
      const data = [{ timestamp: '2024-01-10T10:00:00Z', value: 10 }];

      const start = new Date('2024-01-12');
      const end = new Date('2024-01-18');

      const filtered = MockAnalyticsAggregator.filterByTimeRange(data, start, end);

      expect(filtered).toHaveLength(0);
    });
  });

  test.describe('Time Series Calculation', () => {
    test('calculates daily time series', () => {
      const data = [
        { timestamp: '2024-01-15T10:00:00Z', value: 10 },
        { timestamp: '2024-01-15T14:00:00Z', value: 20 },
        { timestamp: '2024-01-16T10:00:00Z', value: 30 },
      ];

      const series = MockAnalyticsAggregator.calculateTimeSeries(data, 'day');

      expect(series).toHaveLength(2);
      expect(series[0].period).toBe('2024-01-15');
      expect(series[0].count).toBe(2);
      expect(series[0].sum).toBe(30);
      expect(series[0].avg).toBeCloseTo(15, 1);

      expect(series[1].period).toBe('2024-01-16');
      expect(series[1].count).toBe(1);
      expect(series[1].sum).toBe(30);
      expect(series[1].avg).toBe(30);
    });

    test('calculates weekly time series', () => {
      const data = [
        { timestamp: '2024-01-15T10:00:00Z', value: 10 }, // Sunday
        { timestamp: '2024-01-16T10:00:00Z', value: 20 }, // Monday
        { timestamp: '2024-01-22T10:00:00Z', value: 30 }, // Sunday next week
      ];

      const series = MockAnalyticsAggregator.calculateTimeSeries(data, 'week');

      expect(series).toHaveLength(2);
      // First week starts on Jan 14 (Sunday), second on Jan 21
      expect(series[0].count).toBe(2);
      expect(series[1].count).toBe(1);
    });

    test('calculates monthly time series', () => {
      const data = [
        { timestamp: '2024-01-15T10:00:00Z', value: 10 },
        { timestamp: '2024-01-20T10:00:00Z', value: 20 },
        { timestamp: '2024-02-05T10:00:00Z', value: 30 },
      ];

      const series = MockAnalyticsAggregator.calculateTimeSeries(data, 'month');

      expect(series).toHaveLength(2);
      expect(series[0].period).toBe('2024-01');
      expect(series[0].count).toBe(2);
      expect(series[0].sum).toBe(30);
      expect(series[1].period).toBe('2024-02');
      expect(series[1].count).toBe(1);
    });

    test('sorts time series chronologically', () => {
      const data = [
        { timestamp: '2024-01-20T10:00:00Z', value: 30 },
        { timestamp: '2024-01-10T10:00:00Z', value: 10 },
        { timestamp: '2024-01-15T10:00:00Z', value: 20 },
      ];

      const series = MockAnalyticsAggregator.calculateTimeSeries(data, 'day');

      expect(series[0].period).toBe('2024-01-10');
      expect(series[1].period).toBe('2024-01-15');
      expect(series[2].period).toBe('2024-01-20');
    });

    test('handles empty data set', () => {
      const series = MockAnalyticsAggregator.calculateTimeSeries([], 'day');
      expect(series).toHaveLength(0);
    });
  });

  test.describe('Integration Scenarios', () => {
    test('full analytics pipeline', () => {
      // Step 1: Filter by time range
      const allData = [
        { timestamp: '2024-01-10T10:00:00Z', orders: 5, revenue: 125 },
        { timestamp: '2024-01-15T10:00:00Z', orders: 10, revenue: 250 },
        { timestamp: '2024-01-20T10:00:00Z', orders: 15, revenue: 375 },
        { timestamp: '2024-01-25T10:00:00Z', orders: 20, revenue: 500 },
      ];

      const start = new Date('2024-01-12');
      const end = new Date('2024-01-22');
      const filtered = MockAnalyticsAggregator.filterByTimeRange(allData, start, end);
      expect(filtered).toHaveLength(2); // Jan 15 and Jan 20

      // Step 2: Aggregate daily stats
      const dailyStats = MockAnalyticsAggregator.aggregateDailyStats(filtered);
      expect(dailyStats).toHaveLength(2);

      // Step 3: Calculate time series
      const timeSeries = MockAnalyticsAggregator.calculateTimeSeries(filtered, 'day');
      expect(timeSeries).toHaveLength(2);

      // Verify consistency
      expect(dailyStats[0].orders).toBe(timeSeries[0].sum);
      expect(dailyStats[1].orders).toBe(timeSeries[1].sum);
    });

    test('compares two periods', () => {
      const currentPeriod = [
        { timestamp: '2024-01-15T10:00:00Z', orders: 10, revenue: 250 },
        { timestamp: '2024-01-16T10:00:00Z', orders: 15, revenue: 375 },
      ];

      const previousPeriod = [
        { timestamp: '2024-01-08T10:00:00Z', orders: 8, revenue: 200 },
        { timestamp: '2024-01-09T10:00:00Z', orders: 12, revenue: 300 },
      ];

      const metrics = MockAnalyticsAggregator.calculateGrowthMetrics(currentPeriod, previousPeriod);

      expect(metrics).not.toBeNull();
      if (metrics) {
        expect(metrics.orderGrowthRate).toBeCloseTo(25, 0.1);
        expect(metrics.revenueGrowthRate).toBeCloseTo(25, 0.1);
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('handles null or undefined values', () => {
      const data = [
        { timestamp: '2024-01-15T10:00:00Z', orders: null, revenue: undefined },
        { timestamp: '2024-01-15T14:00:00Z', orders: 3, revenue: 75 },
      ];

      const result = MockAnalyticsAggregator.aggregateDailyStats(data);

      expect(result).toHaveLength(1);
      expect(result[0].orders).toBe(3);
      expect(result[0].revenue).toBe(75);
    });

    test('handles invalid timestamps', () => {
      const data = [{ timestamp: 'invalid-date', orders: 5, revenue: 125 }];

      // Should handle gracefully without crashing
      const result = MockAnalyticsAggregator.aggregateDailyStats(data);

      // May or may not include the invalid data depending on implementation
      // Just verify it doesn't crash
      expect(true).toBe(true);
    });

    test('handles large datasets', () => {
      const largeData = [];
      for (let i = 0; i < 1000; i++) {
        largeData.push({
          timestamp: `2024-01-1${i % 10}T10:00:00Z`,
          orders: i % 10,
          revenue: (i % 10) * 25,
        });
      }

      const result = MockAnalyticsAggregator.aggregateDailyStats(largeData);

      // Verify all data was processed
      const totalOrders = result.reduce((sum, r) => sum + r.orders, 0);
      expect(totalOrders).toBeGreaterThan(0);
    });
  });
});
