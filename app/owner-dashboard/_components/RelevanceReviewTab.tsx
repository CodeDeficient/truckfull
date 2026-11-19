'use client';

import { useState, useEffect } from 'react';
import { FileSearch, ShieldAlert, Loader2 } from 'lucide-react';
import { logError } from '@/lib/logging';

interface RelevanceStats {
  totalClassified: number;
  relevant: number;
  notRelevant: number;
  reviewNeeded: number;
  avgConfidence: number;
  tier1Classified: number;
  tier2Classified: number;
  pendingClassification: number;
  bySource: Record<string, { total: number; relevant: number }>;
}

function StatCard({
  title,
  value,
  subtext,
  highlight,
}: {
  readonly title: string;
  readonly value: string | number;
  readonly subtext?: string;
  readonly highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${highlight ? 'border-amber-500/50 bg-amber-500/5' : 'bg-card'}`}
    >
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className={`text-2xl font-bold mt-1 ${highlight ? 'text-amber-400' : ''}`}>{value}</div>
      {subtext && <div className="text-xs text-muted-foreground mt-1">{subtext}</div>}
    </div>
  );
}

export function RelevanceReviewTab() {
  const [stats, setStats] = useState<RelevanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const response = await fetch('/api/relevance-stats');
        if (response.status === 401) {
          if (!cancelled) {
            setAuthError(true);
            setLoading(false);
          }
          return;
        }
        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.status}`);
        }
        const body = (await response.json()) as { success: boolean; data: RelevanceStats };
        if (!cancelled) {
          setStats(body.data);
        }
      } catch (error) {
        logError('Failed to load relevance stats:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Only admin users can access the Relevance Review dashboard.
        </p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p>Failed to load relevance statistics.</p>
      </div>
    );
  }

  const sourceEntries = Object.entries(stats.bySource).sort(([, a], [, b]) => b.total - a.total);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FileSearch className="h-6 w-6" />
          Relevance Classification Stats
        </h2>
        <p className="mt-1 text-muted-foreground">
          Overview of the food truck relevance classification pipeline.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Classified" value={stats.totalClassified} />
        <StatCard title="Relevant" value={stats.relevant} subtext="is_food_truck_relevant = true" />
        <StatCard
          title="Not Relevant"
          value={stats.notRelevant}
          subtext="is_food_truck_relevant = false"
        />
        <StatCard
          title="Needs Review"
          value={stats.reviewNeeded}
          subtext="relevance_review_needed = true"
          highlight
        />
        <StatCard
          title="Avg Confidence"
          value={`${(stats.avgConfidence * 100).toFixed(1)}%`}
        />
        <StatCard
          title="Tier 1 (Keyword)"
          value={stats.tier1Classified}
        />
        <StatCard
          title="Tier 2 (LLM)"
          value={stats.tier2Classified}
        />
        <StatCard
          title="Pending"
          value={stats.pendingClassification}
          subtext="unclassified high-score events"
        />
      </div>

      {sourceEntries.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold">By Source</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Source</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2 text-right font-medium">Relevant</th>
                  <th className="px-4 py-2 text-right font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {sourceEntries.map(([source, data]) => (
                  <tr key={source} className="border-b last:border-0">
                    <td className="px-4 py-2">{source || '(unknown)'}</td>
                    <td className="px-4 py-2 text-right">{data.total}</td>
                    <td className="px-4 py-2 text-right">{data.relevant}</td>
                    <td className="px-4 py-2 text-right">
                      {data.total > 0
                        ? `${((data.relevant / data.total) * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
