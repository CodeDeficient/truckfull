'use client';

/**
 * Pending Updates Queue Component
 * WBS: 3.4.3
 *
 * Displays pending AI-detected updates for owner approval/rejection.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Utensils,
  Calendar,
  Loader2,
  RefreshCw,
} from 'lucide-react';

const WORD_STARTS = /\b\w/g;

interface PendingUpdate {
  id: string;
  truck_id: string;
  truck_name: string;
  update_type: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown>;
  confidence_score: number;
  risk_level: string;
  source_post_url: string | null;
  status: string;
  created_at: string;
}

const UPDATE_TYPE_ICONS: Record<string, React.ReactNode> = {
  location_update: <MapPin className="w-4 h-4" />,
  hours_update: <Calendar className="w-4 h-4" />,
  menu_update: <Utensils className="w-4 h-4" />,
  cuisine_change: <Utensils className="w-4 h-4" />,
};

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800',
};

function formatUpdateType(type: string): string {
  return type.replaceAll('_', ' ').replaceAll(WORD_STARTS, (l) => l.toUpperCase());
}

function formatConfidence(score: number): string {
  return `${(score * 100).toFixed(0)}%`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface PendingUpdatesQueueProps {
  truckId?: string; // Optional: filter to specific truck
}

export function PendingUpdatesQueue({ truckId }: PendingUpdatesQueueProps) {
  const [updates, setUpdates] = useState<PendingUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const fetchUpdates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/owner/pending-updates');
      if (!response.ok) throw new Error('Failed to fetch updates');

      const data = await response.json();
      let filtered = data.updates ?? [];

      // Filter by truck if specified
      if (truckId) {
        filtered = filtered.filter((u: PendingUpdate) => u.truck_id === truckId);
      }

      // Only show pending updates
      filtered = filtered.filter((u: PendingUpdate) => u.status === 'pending');

      setUpdates(filtered);
      setError(null);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [truckId]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  const handleAction = async (updateId: string, action: 'approve' | 'reject') => {
    try {
      setProcessingId(updateId);

      const response = await fetch(`/api/owner/pending-updates/${updateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: action === 'reject' ? rejectReason[updateId] : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process update');
      }

      // Remove from list
      setUpdates((prev) => prev.filter((u) => u.id !== updateId));
    } catch (error_) {
      alert(error_ instanceof Error ? error_.message : 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="py-4">
          <p className="text-red-600">Error: {error}</p>
          <Button variant="outline" size="sm" onClick={fetchUpdates} className="mt-2">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (updates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pending Updates</CardTitle>
          <CardDescription>AI-detected changes requiring your approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p>All caught up! No pending updates.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Pending Updates</CardTitle>
            <CardDescription>
              {updates.length} update{updates.length === 1 ? '' : 's'} awaiting review
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchUpdates}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {updates.map((update) => (
          <div key={update.id} className="border rounded-lg p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {UPDATE_TYPE_ICONS[update.update_type] || <Clock className="w-4 h-4" />}
                <span className="font-medium">{formatUpdateType(update.update_type)}</span>
                <span className="text-sm text-muted-foreground">• {update.truck_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={RISK_COLORS[update.risk_level] || 'bg-gray-100'}>
                  {update.risk_level} Risk
                </Badge>
                <Badge variant="outline">
                  {formatConfidence(update.confidence_score)} confident
                </Badge>
              </div>
            </div>

            {/* Change Details */}
            <div className="bg-muted/50 rounded p-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Current Value</p>
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(update.old_value, null, 2) || 'N/A'}
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Proposed Change</p>
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(update.new_value, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Source & Time */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Detected: {formatDate(update.created_at)}</span>
              {update.source_post_url && (
                <a
                  href={update.source_post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View Source Post →
                </a>
              )}
            </div>

            {/* Reject Reason (only show if high risk) */}
            {update.risk_level === 'HIGH' && (
              <Textarea
                placeholder="Reason for rejection (optional)"
                value={rejectReason[update.id] || ''}
                onChange={(e) =>
                  setRejectReason((prev) => ({ ...prev, [update.id]: e.target.value }))
                }
                className="text-sm"
                rows={2}
              />
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => handleAction(update.id, 'approve')}
                disabled={processingId === update.id}
                className="bg-green-600 hover:bg-green-700"
              >
                {processingId === update.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleAction(update.id, 'reject')}
                disabled={processingId === update.id}
              >
                {processingId === update.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </>
                )}
              </Button>

              {update.risk_level === 'HIGH' && (
                <span className="flex items-center text-xs text-amber-600 ml-auto">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  High-risk updates require careful review
                </span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
