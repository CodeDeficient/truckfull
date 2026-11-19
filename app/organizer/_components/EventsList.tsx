'use client';

/**
 * Events List Component
 * WBS: 6.3.6
 *
 * List of organizer's events with stats.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MapPin,
  DollarSign,
  MoreVertical,
  Eye,
  Edit,
  Trash,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Event {
  id: string;
  name: string;
  description: string;
  location_data: {
    city?: string;
    state?: string;
  };
  start_date: string;
  end_date: string;
  status: string;
  vendor_fee: number;
  max_vendors: number | null;
  applications: {
    pending: number;
    accepted: number;
    total: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface EventsListProps {
  onEdit?: (event: Event) => void;
  onView?: (event: Event) => void;
}

export function EventsList({ onEdit, onView }: EventsListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/organizer/events');
      if (!response.ok) throw new Error('Failed to fetch events');

      const data = await response.json();
      setEvents(data.events ?? []);
      setError(null);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handlePublish = async (eventId: string) => {
    try {
      const response = await fetch(`/api/organizer/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to publish');
        return;
      }

      fetchEvents();
    } catch {
      alert('Failed to publish event');
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this draft event?')) return;

    try {
      const response = await fetch(`/api/organizer/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to delete');
        return;
      }

      fetchEvents();
    } catch {
      alert('Failed to delete event');
    }
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
          <Button variant="outline" size="sm" onClick={fetchEvents} className="mt-2">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center space-y-4">
          <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">No events yet</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
              Ready to host? Create your first event to start accepting vendor applications.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Your Events</h3>
        <Button variant="ghost" size="sm" onClick={fetchEvents} className="hover:bg-muted">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {events.map((event) => (
          <Card
            key={event.id}
            className="group hover:border-primary/50 transition-all duration-300 hover:shadow-md"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-semibold group-hover:text-primary transition-colors">
                      {event.name}
                    </h4>
                    <Badge variant="outline" className={`${STATUS_COLORS[event.status]} border-0`}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(event.start_date)}
                    </span>
                    <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                      <MapPin className="w-3.5 h-3.5" />
                      {event.location_data.city}, {event.location_data.state}
                    </span>
                    <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                      <DollarSign className="w-3.5 h-3.5" />
                      {event.vendor_fee ? `$${event.vendor_fee}` : 'Free'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Stats Block */}
                  <div className="flex items-center gap-6 p-3 bg-muted/20 rounded-lg border border-border/50">
                    <div className="text-center min-w-[3rem]">
                      <div className="text-lg font-bold text-primary">
                        {event.applications.pending}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        Pending
                      </div>
                    </div>
                    <div className="w-px h-8 bg-border/50" />
                    <div className="text-center min-w-[3rem]">
                      <div className="text-lg font-bold text-green-600">
                        {event.applications.accepted}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        Accepted
                      </div>
                    </div>
                    {event.max_vendors && (
                      <>
                        <div className="w-px h-8 bg-border/50" />
                        <div className="text-center min-w-[3rem]">
                          <div className="text-lg font-bold text-muted-foreground">
                            {event.max_vendors - event.applications.accepted}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                            Left
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onView?.(event)}>
                        <Eye className="w-4 h-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      {event.status === 'draft' && (
                        <>
                          <DropdownMenuItem onClick={() => onEdit?.(event)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit Event
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePublish(event.id)}>
                            <Calendar className="w-4 h-4 mr-2" /> Publish Now
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => handleDelete(event.id)}
                          >
                            <Trash className="w-4 h-4 mr-2" /> Delete Draft
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
