'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Eye, MousePointer, Heart } from 'lucide-react';

interface AnalyticsData {
  totalViews: number;
  totalClicks: number;
  totalFavorites: number;
  clickThroughRate: number;
}

interface BasicAnalyticsProps {
  readonly data?: AnalyticsData;
}

export function BasicAnalytics({ data }: BasicAnalyticsProps) {
  // Mock data for now (will be replaced with real data from analytics tables)
  const analytics: AnalyticsData = data ?? {
    totalViews: 1234,
    totalClicks: 89,
    totalFavorites: 42,
    clickThroughRate: 7.2,
  };

  const stats = [
    {
      name: 'Total Views',
      value: analytics.totalViews.toLocaleString('en-US'),
      description: 'Last 30 days',
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Total Clicks',
      value: analytics.totalClicks.toLocaleString('en-US'),
      description: 'Website, phone, directions',
      icon: MousePointer,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      name: 'Favorites',
      value: analytics.totalFavorites.toLocaleString('en-US'),
      description: 'Users who saved your truck',
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      name: 'Click-Through Rate',
      value: `${analytics.clickThroughRate}%`,
      description: 'Clicks / Views',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <p className="text-muted-foreground">Track your truck's performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Views Over Time</CardTitle>
          <CardDescription>Daily views for the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Chart visualization coming soon</p>
              <p className="text-xs mt-1">Integrating with Recharts library</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
