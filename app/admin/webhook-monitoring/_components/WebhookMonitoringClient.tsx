'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getWebhookStats, type WebhookStats } from '@/lib/analytics/webhookStats';
import { getSupabase } from '@/lib/supabase/client';
import { Download, RefreshCw, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import type { Database } from '@/lib/database.remote.types';

type FacebookWebhookEventRow = Database['public']['Tables']['facebook_webhook_events']['Row'];

type WebhookEventForExport = Pick<
  FacebookWebhookEventRow,
  'id' | 'webhook_id' | 'event_type' | 'created_at'
> & {
  payload?: Record<string, unknown>;
};

interface WebhookMonitoringClientProps {
  readonly initialStats: WebhookStats;
}

export function WebhookMonitoringClient({ initialStats }: WebhookMonitoringClientProps) {
  const [stats, setStats] = useState<WebhookStats>(initialStats);
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    loadStats(timeRange);
  }, [timeRange]);

  const loadStats = async (range: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const newStats = await getWebhookStats(range);
      setStats(newStats);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    const supabase = getSupabase();
    const now = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case '24h': {
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      }
      case '7d': {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      }
      case '30d': {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      }
    }

    const { data, error: fetchError } = await supabase
      .from('facebook_webhook_events' as const)
      .select('id, webhook_id, event_type, created_at, payload')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (fetchError || !data) {
      console.error('Failed to export CSV', fetchError);
      return;
    }

    const events = data.map(
      (row): WebhookEventForExport => ({
        id: row.id,
        webhook_id: row.webhook_id,
        event_type: row.event_type,
        created_at: row.created_at,
        payload: row.payload as Record<string, unknown> | undefined,
      }),
    );

    const headers = ['ID', 'Event', 'Timestamp', 'Properties'];
    const rows = events.map((event) => [
      event.id,
      event.event_type,
      event.created_at,
      JSON.stringify(event.payload),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webhook-events-${timeRange}-${Date.now()}.csv`;
    a.click();
  };

  const successRate =
    stats.totalReceived > 0 ? (stats.parseSuccess / stats.totalReceived) * 100 : 0;

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Error
          </CardTitle>
          <CardDescription>Failed to load webhook statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => loadStats(timeRange)} variant="outline" className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button onClick={() => loadStats(timeRange)} variant="outline" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReceived}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.parseSuccess} successful / {stats.totalReceived} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Accuracy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.avgAccuracy * 100).toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.avgLatency)}ms</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Model Performance</CardTitle>
          <CardDescription>AI model success rates and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Avg Latency</TableHead>
                <TableHead>Avg Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.modelPerformance.map((model) => (
                <TableRow key={model.modelName}>
                  <TableCell className="font-medium">{model.modelName}</TableCell>
                  <TableCell>{(model.successRate * 100).toFixed(1)}%</TableCell>
                  <TableCell>{Math.round(model.avgLatency)}ms</TableCell>
                  <TableCell>{(model.avgConfidence * 100).toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Success Rate Over Time</CardTitle>
            <CardDescription>Parse success rate trend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Chart placeholder - Success Rate Over Time
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Latency</CardTitle>
            <CardDescription>AI model response times</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Chart placeholder - Model Latency
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Error Distribution</CardTitle>
          <CardDescription>Parse failure breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Chart placeholder - Error Distribution
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
