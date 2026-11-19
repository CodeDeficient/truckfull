'use client';

/**
 * My Applications Component
 * WBS: 6.2.5
 *
 * Displays user's event applications grouped by status.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Calendar as CalendarIcon,
  MapPin,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface Application {
  id: string;
  event: {
    id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
    location_data: {
      city?: string;
      state?: string;
    };
    organizer: {
      business_name: string;
    };
  };
  truck: {
    id: string;
    name: string;
  };
  status: 'pending' | 'accepted' | 'rejected' | 'waitlisted' | 'withdrawn';
  created_at: string;
}

interface MyApplicationsProps {
  truckId?: string;
}

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  accepted: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Accepted' },
  rejected: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Rejected' },
  waitlisted: { icon: Users, color: 'bg-blue-100 text-blue-800', label: 'Waitlisted' },
  withdrawn: { icon: Trash2, color: 'bg-gray-100 text-gray-800', label: 'Withdrawn' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function MyApplications({ truckId }: MyApplicationsProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (truckId) params.set('truck_id', truckId);

      const response = await fetch(`/api/events/applications?${params}`);
      if (!response.ok) throw new Error('Failed to fetch applications');

      const data = await response.json();
      setApplications(data.applications ?? []);
      setError(null);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [truckId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleWithdraw = async (applicationId: string) => {
    try {
      setWithdrawingId(applicationId);

      const response = await fetch(`/api/events/applications/${applicationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to withdraw application');
      }

      // Update local state
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: 'withdrawn' as const } : app,
        ),
      );
    } catch (error_) {
      alert(error_ instanceof Error ? error_.message : 'Withdrawal failed');
    } finally {
      setWithdrawingId(null);
    }
  };

  // Group by status
  const grouped = {
    pending: applications.filter((a) => a.status === 'pending'),
    accepted: applications.filter((a) => a.status === 'accepted'),
    waitlisted: applications.filter((a) => a.status === 'waitlisted'),
    rejected: applications.filter((a) => a.status === 'rejected' || a.status === 'withdrawn'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="py-4">
          <p className="text-red-600">Error: {error}</p>
          <Button variant="outline" size="sm" onClick={fetchApplications} className="mt-2">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No applications yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Browse events in the Discover tab to apply
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">My Applications</h3>
        <Button variant="ghost" size="sm" onClick={fetchApplications}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Status sections */}
      {(['pending', 'accepted', 'waitlisted', 'rejected'] as const).map((status) => {
        const apps = grouped[status];
        if (apps.length === 0) return null;

        const config = STATUS_CONFIG[status];
        const StatusIcon = config.icon;

        return (
          <div key={status} className="space-y-3">
            <div className="flex items-center gap-2">
              <StatusIcon className="w-4 h-4" />
              <h4 className="font-medium capitalize">{config.label}</h4>
              <Badge variant="secondary" className="text-xs">
                {apps.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {apps.map((app) => (
                <Card key={app.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{app.event.name}</span>
                        <Badge className={config.color}>{config.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <CalendarIcon className="w-3 h-3 mr-1" />
                          {formatDate(app.event.start_date)}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {app.event.location_data.city}, {app.event.location_data.state}
                        </span>
                        <span>by {app.event.organizer.business_name}</span>
                      </div>
                    </div>

                    {app.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleWithdraw(app.id)}
                        disabled={withdrawingId === app.id}
                      >
                        {withdrawingId === app.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Withdraw
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
