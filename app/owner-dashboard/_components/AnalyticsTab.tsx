'use client';

import {
  BarChart3,
  Eye,
  MousePointerClick,
  Navigation,
  Globe,
  Heart,
  Share2,
  Truck,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { logError } from '@/lib/logging';
import type { FoodTruckDomain } from '@/lib/types';

interface AnalyticsData {
  truckId: string;
  period: { days: number; startDate: string };
  totals: {
    views: number;
    menuClicks: number;
    directionsClicks: number;
    favorites: number;
    websiteClicks: number;
    shares: number;
    calls?: number;
    uniqueViews?: number;
    uniqueMenuClicks?: number;
    uniqueDirectionsClicks?: number;
    uniqueWebsiteClicks?: number;
    uniqueShares?: number;
  };
  daily: Array<{
    event_date: string;
    total_views: number;
    menu_clicks: number;
    directions_clicks: number;
    favorites: number;
    website_clicks: number;
    shares: number;
    unique_views?: number;
    unique_menu_clicks?: number;
    unique_directions_clicks?: number;
    unique_website_clicks?: number;
    unique_shares?: number;
  }>;
}

interface MetricCardProps {
  title: string;
  value: number;
  unique?: number;
  icon: React.ReactNode;
}

function MetricCard({ title, value, unique, icon }: MetricCardProps) {
  const repeats = unique != null && value > unique ? ` (${value - unique} repeats)` : '';
  const uniqueLabel = unique != null && unique > 0 ? `${unique} unique${repeats}` : undefined;

  return (
    <div className="bg-card rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
          {uniqueLabel && <p className="text-xs text-primary mt-1">{uniqueLabel}</p>}
        </div>
      </div>
    </div>
  );
}

export function AnalyticsTab({ trucks }: { trucks?: FoodTruckDomain[] }) {
  const [selectedTruckId, setSelectedTruckId] = useState<string | undefined>(trucks?.[0]?.id);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const url = new URL('/api/analytics/summary', globalThis.location.origin);
        url.searchParams.set('days', days.toString());
        if (selectedTruckId) {
          url.searchParams.set('truckId', selectedTruckId);
        }
        url.searchParams.set('_t', Date.now().toString());

        const response = await fetch(url.toString());

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to fetch analytics');
        }

        const data = await response.json();
        setAnalytics(data);
        setError(null);
      } catch (error_) {
        setError('Failed to load analytics data. Please try again later.');
        logError('Error loading analytics data', error_);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [days, selectedTruckId]);

  if (error) {
    return (
      <div className="bg-card rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold">Analytics</span>
        </div>
        <div className="p-8 text-center">
          <p className="text-destructive mb-2">Error Loading Analytics</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold">Analytics</span>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const totals = analytics?.totals || {
    views: 0,
    menuClicks: 0,
    directionsClicks: 0,
    favorites: 0,
    websiteClicks: 0,
    shares: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                days === d
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              aria-pressed={days === d}
            >
              {d === 7 ? '7d' : d === 30 ? '30d' : '90d'}
            </button>
          ))}
        </div>
      </div>

      {trucks && trucks.length > 1 && (
        <div className="flex items-center gap-3 bg-card rounded-lg p-3">
          <Truck className="w-4 h-4 text-muted-foreground" />
          <select
            className="flex-1 rounded-md bg-background px-3 py-1.5 text-sm border-0 focus:ring-0"
            value={selectedTruckId || ''}
            onChange={(e) => setSelectedTruckId(e.target.value || undefined)}
          >
            <option value="">All Trucks</option>
            {trucks.map((truck) => (
              <option key={truck.id} value={truck.id}>
                {truck.name || 'Unnamed Truck'}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Views"
          value={totals.views}
          unique={totals.uniqueViews}
          icon={<Eye className="w-5 h-5 text-primary" />}
        />
        <MetricCard
          title="Menu Clicks"
          value={totals.menuClicks}
          unique={totals.uniqueMenuClicks}
          icon={<MousePointerClick className="w-5 h-5 text-primary" />}
        />
        <MetricCard
          title="Directions"
          value={totals.directionsClicks}
          unique={totals.uniqueDirectionsClicks}
          icon={<Navigation className="w-5 h-5 text-primary" />}
        />
        <MetricCard
          title="Favorites"
          value={totals.favorites}
          icon={<Heart className="w-5 h-5 text-primary" />}
        />
        <MetricCard
          title="Website"
          value={totals.websiteClicks}
          unique={totals.uniqueWebsiteClicks}
          icon={<Globe className="w-5 h-5 text-primary" />}
        />
        <MetricCard
          title="Shares"
          value={totals.shares}
          unique={totals.uniqueShares}
          icon={<Share2 className="w-5 h-5 text-primary" />}
        />
      </div>

      <div className="bg-card rounded-lg p-4 md:p-6">
        <div className="mb-4">
          <span className="text-sm font-medium">Engagement Summary</span>
          <span className="text-xs text-muted-foreground ml-2">Last {days} days</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Top Actions</h4>
            <div className="space-y-2">
              {[
                { label: 'Profile Views', value: totals.views, color: 'bg-primary' },
                { label: 'Menu Views', value: totals.menuClicks, color: 'bg-primary/70' },
                { label: 'Directions', value: totals.directionsClicks, color: 'bg-primary/40' },
              ]
                .sort((a, b) => b.value - a.value)
                .map((item) => {
                  const maxValue = Math.max(
                    totals.views,
                    totals.menuClicks,
                    totals.directionsClicks,
                    1,
                  );
                  const percentage = (item.value / maxValue) * 100;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.label}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Conversion</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">View → Menu</span>
                <span className="font-medium">
                  {totals.views > 0 ? ((totals.menuClicks / totals.views) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">View → Directions</span>
                <span className="font-medium">
                  {totals.views > 0
                    ? ((totals.directionsClicks / totals.views) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">View → Favorite</span>
                <span className="font-medium">
                  {totals.views > 0 ? ((totals.favorites / totals.views) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
