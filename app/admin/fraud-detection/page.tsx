'use client';

/**
 * Fraud Detection Dashboard
 * WBS: 6.7.1
 *
 * Admin page for monitoring and acting on suspicious activity.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  ShieldAlert,
  Users,
  DollarSign,
  Star,
  Ban,
  CheckCircle,
  Eye,
  RefreshCw,
  Loader2,
  UserX,
  Shield,
  Flag,
  XCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Organizer {
  id: string;
  business_name: string;
  contact_email?: string;
  verification_status: string;
  average_rating?: number;
  review_count?: number;
  created_at?: string;
  suspended_at?: string;
  suspension_reason?: string;
  user?: { full_name?: string; email?: string };
  events?: Array<{ id: string; name: string; vendor_fee?: number; status?: string }>;
}

interface FlaggedEvent {
  id: string;
  name: string;
  vendor_fee?: number;
  status?: string;
  fraud_flags?: string[];
  refund_requested_at?: string;
  refund_request_notes?: string;
  organizer?: { business_name: string; verification_status: string };
}

interface FraudData {
  indicators: {
    new_organizers: { count: number; data: Organizer[] };
    unverified_paid_events: { count: number; data: Organizer[] };
    low_rated: { count: number; data: Organizer[] };
    restricted: { count: number; data: Organizer[] };
    flagged_events: { count: number; data: FlaggedEvent[] };
    refund_requests: { count: number; data: FlaggedEvent[] };
  };
  summary: { total_alerts: number };
}

export default function FraudDetectionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FraudData | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/fraud-detection');
      if (!response.ok) throw new Error('Failed to load data');
      const result = await response.json();
      setData(result);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (
    action: 'shadowban' | 'suspend' | 'require_verification' | 'flag_refund' | 'clear_flag',
    entityType: 'organizer' | 'event' | 'application',
    entityId: string,
    notes?: string,
  ) => {
    try {
      setActionPending(entityId);
      const response = await fetch('/api/admin/fraud-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, entity_type: entityType, entity_id: entityId, notes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Action failed');
      }

      // Refresh data
      await fetchData();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Action failed');
    } finally {
      setActionPending(null);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'verified': {
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" /> Verified
          </Badge>
        );
      }
      case 'unverified': {
        return (
          <Badge className="bg-amber-100 text-amber-700">
            <AlertTriangle className="w-3 h-3 mr-1" /> Unverified
          </Badge>
        );
      }
      case 'shadowbanned': {
        return (
          <Badge className="bg-gray-100 text-gray-700">
            <Ban className="w-3 h-3 mr-1" /> Shadowbanned
          </Badge>
        );
      }
      case 'suspended': {
        return (
          <Badge className="bg-red-100 text-red-700">
            <XCircle className="w-3 h-3 mr-1" /> Suspended
          </Badge>
        );
      }
      default: {
        return <Badge variant="outline">{status}</Badge>;
      }
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-red-600" />
            Fraud Detection
          </h1>
          <p className="text-muted-foreground mt-1">Monitor suspicious activity and take action</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={data?.summary.total_alerts ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
                <p className="text-3xl font-bold">{data?.summary.total_alerts ?? 0}</p>
              </div>
              <AlertTriangle
                className={`w-8 h-8 ${data?.summary.total_alerts ? 'text-red-600' : 'text-muted-foreground'}`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Organizers (7d)</p>
                <p className="text-3xl font-bold">{data?.indicators.new_organizers.count ?? 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            data?.indicators.unverified_paid_events.count ? 'border-amber-200 bg-amber-50' : ''
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unverified + Paid</p>
                <p className="text-3xl font-bold">
                  {data?.indicators.unverified_paid_events.count ?? 0}
                </p>
              </div>
              <DollarSign
                className={`w-8 h-8 ${data?.indicators.unverified_paid_events.count ? 'text-amber-600' : 'text-muted-foreground'}`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Rated</p>
                <p className="text-3xl font-bold">{data?.indicators.low_rated.count ?? 0}</p>
              </div>
              <Star className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="suspicious">
        <TabsList>
          <TabsTrigger value="suspicious" className="flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Suspicious ({data?.indicators.unverified_paid_events.count ?? 0})
          </TabsTrigger>
          <TabsTrigger value="low-rated" className="flex items-center gap-1">
            <Star className="w-4 h-4" />
            Low Rated ({data?.indicators.low_rated.count ?? 0})
          </TabsTrigger>
          <TabsTrigger value="restricted" className="flex items-center gap-1">
            <Ban className="w-4 h-4" />
            Restricted ({data?.indicators.restricted.count ?? 0})
          </TabsTrigger>
          <TabsTrigger value="refunds" className="flex items-center gap-1">
            <Flag className="w-4 h-4" />
            Refund Requests ({data?.indicators.refund_requests.count ?? 0})
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            New ({data?.indicators.new_organizers.count ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Suspicious - Unverified with Paid Events */}
        <TabsContent value="suspicious">
          <Card>
            <CardHeader>
              <CardTitle>Unverified Organizers with Paid Events</CardTitle>
              <CardDescription>
                These organizers have published paid events without identity verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.indicators.unverified_paid_events.data.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No suspicious organizers found
                </p>
              ) : (
                <div className="space-y-3">
                  {data?.indicators.unverified_paid_events.data.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{org.business_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {(org.events as Array<{ vendor_fee?: number }> | undefined)?.filter(
                            (e) => e.vendor_fee && e.vendor_fee > 0,
                          ).length ?? 0}{' '}
                          paid event(s)
                        </div>
                        {renderStatusBadge(org.verification_status)}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" disabled={actionPending === org.id}>
                            {actionPending === org.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Actions'
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() =>
                              handleAction(
                                'require_verification',
                                'organizer',
                                org.id,
                                'Paid events require verification',
                              )
                            }
                          >
                            <Shield className="w-4 h-4 mr-2" /> Require Verification
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAction('shadowban', 'organizer', org.id)}
                          >
                            <UserX className="w-4 h-4 mr-2" /> Shadowban
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAction('suspend', 'organizer', org.id)}
                            className="text-red-600"
                          >
                            <Ban className="w-4 h-4 mr-2" /> Suspend Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low Rated */}
        <TabsContent value="low-rated">
          <Card>
            <CardHeader>
              <CardTitle>Low Rated Organizers</CardTitle>
              <CardDescription>Organizers with average rating below 2.5 stars</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.indicators.low_rated.data.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No low-rated organizers</p>
              ) : (
                <div className="space-y-3">
                  {data?.indicators.low_rated.data.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{org.business_name}</div>
                        <div className="flex items-center gap-2 text-sm">
                          <Star className="w-4 h-4 text-amber-500" />
                          <span>{org.average_rating?.toFixed(1) ?? 'N/A'}</span>
                          <span className="text-muted-foreground">
                            ({org.review_count ?? 0} reviews)
                          </span>
                        </div>
                        {renderStatusBadge(org.verification_status)}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" disabled={actionPending === org.id}>
                            {actionPending === org.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Actions'
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() =>
                              handleAction('shadowban', 'organizer', org.id, 'Low ratings')
                            }
                          >
                            <UserX className="w-4 h-4 mr-2" /> Shadowban (Free Events Only)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAction('clear_flag', 'organizer', org.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> Clear Flags
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restricted */}
        <TabsContent value="restricted">
          <Card>
            <CardHeader>
              <CardTitle>Restricted Organizers</CardTitle>
              <CardDescription>Shadowbanned or suspended accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.indicators.restricted.data.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No restricted organizers</p>
              ) : (
                <div className="space-y-3">
                  {data?.indicators.restricted.data.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{org.business_name}</div>
                        {org.suspension_reason && (
                          <div className="text-sm text-muted-foreground">
                            {org.suspension_reason}
                          </div>
                        )}
                        {renderStatusBadge(org.verification_status)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction('clear_flag', 'organizer', org.id)}
                        disabled={actionPending === org.id}
                      >
                        {actionPending === org.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" /> Restore
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Refund Requests */}
        <TabsContent value="refunds">
          <Card>
            <CardHeader>
              <CardTitle>Refund Requests</CardTitle>
              <CardDescription>Events flagged for manual refund processing</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.indicators.refund_requests.data.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No refund requests</p>
              ) : (
                <div className="space-y-3">
                  {data?.indicators.refund_requests.data.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{event.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Organizer:{' '}
                          {(event.organizer as { business_name?: string })?.business_name ??
                            'Unknown'}
                        </div>
                        {event.refund_request_notes && (
                          <div className="text-sm text-amber-700 mt-1">
                            {event.refund_request_notes}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction('clear_flag', 'event', event.id)}
                        disabled={actionPending === event.id}
                      >
                        {actionPending === event.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Mark Resolved'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* New Organizers */}
        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>New Organizers (Last 7 Days)</CardTitle>
              <CardDescription>Recently registered organizers for review</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.indicators.new_organizers.data.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No new organizers</p>
              ) : (
                <div className="space-y-3">
                  {data?.indicators.new_organizers.data.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{org.business_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {org.contact_email ??
                            (org.user as { email?: string })?.email ??
                            'No email'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Joined{' '}
                          {org.created_at
                            ? new Date(org.created_at).toLocaleDateString()
                            : 'recently'}
                        </div>
                        {renderStatusBadge(org.verification_status)}
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-2" /> View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
