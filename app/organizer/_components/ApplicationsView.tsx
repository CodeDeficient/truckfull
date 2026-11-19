'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TRUCK_FALLBACK_IMAGE } from '@/lib/utils/photoTransform';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  MoreVertical,
  CheckCircle,
  XCircle,
  Calendar,
  Truck,
  FileText,
  AlertCircle,
  RefreshCw,
  Clock,
  Ban,
} from 'lucide-react';
import { ApplicationDetailModal, ApplicationWithDetails } from './ApplicationDetailModal';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color:
      'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900',
    icon: Clock,
  },
  accepted: {
    label: 'Accepted',
    color:
      'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900',
    icon: Ban,
  },
  withdrawn: {
    label: 'Withdrawn',
    color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800',
    icon: XCircle,
  },
  waitlisted: {
    label: 'Waitlisted',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900',
    icon: AlertCircle,
  },
};

export function ApplicationsView() {
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(
    null,
  );

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/organizer/applications');

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(data.applications ?? []);
    } catch (error_) {
      console.error('Error fetching applications:', error_);
      setError(error_ instanceof Error ? error_.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleStatusUpdate = async (applicationId: string, newStatus: 'accepted' | 'rejected') => {
    try {
      setProcessingId(applicationId);
      const response = await fetch(`/api/organizer/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      // Update local state
      setApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? { ...app, status: newStatus } : app)),
      );
    } catch {
      alert('Failed to update application status');
    } finally {
      setProcessingId(null);
    }
  };

  const openApplication = (app: ApplicationWithDetails) => {
    setSelectedApplication(app);
  };

  // Compute stats
  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    accepted: applications.filter((a) => a.status === 'accepted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  const filteredApplications =
    statusFilter === 'all'
      ? applications
      : applications.filter((app) => app.status === statusFilter);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div>
          <h3 className="text-lg font-semibold">Error Loading Applications</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" onClick={fetchApplications}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Vendor Applications</CardTitle>
          <CardDescription>Review and manage incoming applications.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-6">
              <Truck className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">No applications yet</h3>
            <p className="text-muted-foreground max-w-sm mt-2 mb-6">
              When vendors apply to your events, they will appear here. Make sure your events are
              published and visible!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Vendor Applications</h2>
          <p className="text-muted-foreground mt-1">Manage and review requests from food trucks.</p>
        </div>
        <div className="flex gap-2">{/* Add export or other actions here later */}</div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card/50 hover:bg-card transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time received</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/5 hover:bg-yellow-500/10 border-yellow-200 dark:border-yellow-900 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-500">
              Pending Review
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-500">
              {stats.pending}
            </div>
            <p className="text-xs text-yellow-600/80 dark:text-yellow-500/80">Requires action</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 hover:bg-green-500/10 border-green-200 dark:border-green-900 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-500">
              Accepted
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-500">
              {stats.accepted}
            </div>
            <p className="text-xs text-green-600/80 dark:text-green-500/80">Approved vendors</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 hover:bg-card transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Declined applications</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="overflow-hidden border shadow-lg bg-card/40 backdrop-blur-sm">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className="h-8 transition-all hover:scale-105"
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('pending')}
              className="h-8 transition-all hover:scale-105"
            >
              Pending
            </Button>
            <Button
              variant={statusFilter === 'accepted' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('accepted')}
              className="h-8 transition-all hover:scale-105"
            >
              Accepted
            </Button>
          </div>
          <div className="text-xs font-medium text-muted-foreground">
            SHOWING {filteredApplications.length} APPLICATION
            {filteredApplications.length === 1 ? '' : 'S'}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/50 border-b-primary/10">
              <TableHead className="w-[300px] h-11">Food Truck</TableHead>
              <TableHead className="h-11">Event</TableHead>
              <TableHead className="h-11">Status</TableHead>
              <TableHead className="h-11">Applied Date</TableHead>
              <TableHead className="text-right h-11">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplications.map((app) => {
              const StatusIcon = STATUS_CONFIG[app.status]?.icon || AlertCircle;
              return (
                <TableRow
                  key={app.id}
                  className="hover:bg-muted/40 transition-colors cursor-pointer group border-b-primary/5"
                >
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-background shadow-sm group-hover:scale-105 transition-transform">
                        <AvatarImage
                          src={app.truck.image_url || TRUCK_FALLBACK_IMAGE}
                          alt={app.truck.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-bold">
                          {app.truck.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {app.truck.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {Array.isArray(app.truck.cuisine_type)
                            ? app.truck.cuisine_type.join(', ')
                            : app.truck.cuisine_type}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground/80">
                      <Calendar className="h-4 w-4" />
                      <span>{app.event.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm ${STATUS_CONFIG[app.status]?.color || 'bg-gray-100 text-gray-800'}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span className="capitalize">
                        {STATUS_CONFIG[app.status]?.label || app.status}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground py-3">
                    {new Date(app.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={processingId === app.id}
                          className="h-8 w-8 hover:bg-muted"
                        >
                          {processingId === app.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreVertical className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                          onClick={() => openApplication(app)}
                          className="cursor-pointer"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View Application
                        </DropdownMenuItem>
                        {app.status === 'pending' && (
                          <>
                            <div className="h-px bg-muted my-1" />
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(app.id, 'accepted')}
                              className="text-green-600 focus:text-green-600 focus:bg-green-50 dark:focus:bg-green-900/20 cursor-pointer"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Accept
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(app.id, 'rejected')}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <ApplicationDetailModal
        application={selectedApplication}
        open={!!selectedApplication}
        onClose={() => setSelectedApplication(null)}
        onAccept={(id) => handleStatusUpdate(id, 'accepted')}
        onReject={(id) => handleStatusUpdate(id, 'rejected')}
      />
    </div>
  );
}
