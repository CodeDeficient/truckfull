'use client';

import {
  Facebook,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logError } from '@/lib/logging';
import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';

interface FacebookStats {
  totalPosts: number;
  postsByStatus: Record<string, number>;
  connectedPages: number;
}

interface FacebookIntegrationClientProps {
  readonly initialStats: FacebookStats;
}

function StatCard({
  title,
  value,
  icon,
  trend,
}: {
  readonly title: string;
  readonly value: number;
  readonly icon: ReactNode;
  readonly trend?: 'up' | 'down' | 'neutral';
}): ReactNode {
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-500',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {trend && (
          <span className={`text-sm ${trendColors[trend]}`}>
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {trend === 'neutral' && '–'}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { readonly status: string }): ReactNode {
  switch (status) {
    case 'processed': {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
          <CheckCircle className="h-3 w-3" />
          Processed
        </span>
      );
    }
    case 'pending_review': {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs">
          <AlertTriangle className="h-3 w-3" />
          Needs Review
        </span>
      );
    }
    case 'rejected': {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">
          <XCircle className="h-3 w-3" />
          Rejected
        </span>
      );
    }
    case 'failed': {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">
          <XCircle className="h-3 w-3" />
          Failed
        </span>
      );
    }
    case 'pending': {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      );
    }
    default: {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
          {status}
        </span>
      );
    }
  }
}

export function FacebookIntegrationClient({
  initialStats,
}: FacebookIntegrationClientProps): ReactNode {
  const [stats, setStats] = useState<FacebookStats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const loadStats = async (): Promise<void> => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch('/api/admin/facebook/stats');
      if (!response.ok) {
        throw new Error('Failed to load statistics');
      }
      const data = await response.json();
      setStats(data);
    } catch (error_) {
      logError('Failed to load Facebook stats:', error_);
      setError(error_ instanceof Error ? error_.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  const totalProcessed =
    stats.postsByStatus.processed + stats.postsByStatus.rejected + stats.postsByStatus.failed;

  const successRate =
    stats.totalPosts > 0 ? Math.round((totalProcessed / stats.totalPosts) * 100) : 0;

  const getSuccessTrend = (): 'up' | 'down' | 'neutral' => {
    if (successRate >= 80) return 'up';
    if (successRate >= 50) return 'neutral';
    return 'down';
  };

  const getReviewTrend = (): 'up' | 'neutral' => {
    return (stats.postsByStatus.pending_review ?? 0) > 0 ? 'up' : 'neutral';
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Facebook Integration</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadStats()} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Posts"
              value={stats.totalPosts}
              icon={<Facebook className="h-4 w-4 text-blue-500" />}
            />
            <StatCard
              title="Connected Pages"
              value={stats.connectedPages}
              icon={<CheckCircle className="h-4 w-4 text-green-500" />}
            />
            <StatCard
              title="Success Rate"
              value={successRate}
              icon={<CheckCircle className="h-4 w-4 text-green-500" />}
              trend={getSuccessTrend()}
            />
            <StatCard
              title="Needs Review"
              value={stats.postsByStatus.pending_review ?? 0}
              icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />}
              trend={getReviewTrend()}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Posts by Status</CardTitle>
              <CardDescription>Distribution of processed Facebook posts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <StatusBadge status="pending" />
                  <span className="font-medium">{stats.postsByStatus.pending ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge status="processed" />
                  <span className="font-medium">{stats.postsByStatus.processed ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge status="pending_review" />
                  <span className="font-medium">{stats.postsByStatus.pending_review ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge status="rejected" />
                  <span className="font-medium">{stats.postsByStatus.rejected ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge status="failed" />
                  <span className="font-medium">{stats.postsByStatus.failed ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
