'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, MapPin, Calendar as CalendarIcon, Loader2, X } from 'lucide-react';
import { getSourceDisplay } from '@/lib/events/sourceDisplay';
import { classifyEvent } from '@/lib/events/eventCategories';
import {
  dismissEvent as dismissEventStorage,
  getDismissedEventIds,
} from '@/lib/events/dismissedEvents';

interface SavedLead {
  id: string;
  event_id: string;
  created_at: string;
  external_events: {
    id: string;
    title: string;
    description: string | null;
    event_start_date: string | null;
    event_end_date: string | null;
    city: string | null;
    state: string | null;
    location_address: string | null;
    source_type: string | null;
    source_url: string | null;
    vetting_score: number | null;
  } | null;
}

interface SavedLeadsProps {
  truckId?: string;
  userTier?: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function SavedLeads({ truckId }: SavedLeadsProps) {
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const fetchLeads = useCallback(async () => {
    if (!truckId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/events/saved-leads?truck_id=${truckId}`);
      if (!response.ok) throw new Error('Failed to fetch saved leads');
      const data = await response.json();
      setLeads(data.leads ?? []);
      setError(null);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [truckId]);

  useEffect(() => {
    fetchLeads();
    setDismissedIds(getDismissedEventIds());
  }, [fetchLeads]);

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
          <Button variant="outline" size="sm" onClick={fetchLeads} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Bookmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No saved leads yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Save events from Discover or the Map to find them here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {leads
        .filter((lead) => lead.external_events && !dismissedIds.has(lead.external_events.id))
        .map((lead) => {
          const event = lead.external_events;
          if (!event) return null;
          const sourceInfo = getSourceDisplay(null, event.source_type);
          const cat = classifyEvent(event.title, event.description);
          return (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 space-y-2 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 absolute top-2 right-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissEventStorage(event.id);
                    setDismissedIds((prev) => new Set([...prev, event.id]));
                  }}
                  title="Dismiss event"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
                <div className="flex items-start justify-between pr-8">
                  <h3 className="font-medium text-sm line-clamp-2 flex-1">{event.title}</h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${cat.color}`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </span>
                <div className="flex items-center text-xs text-muted-foreground">
                  <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                  {formatDate(event.event_start_date)}
                  {event.event_end_date && event.event_end_date !== event.event_start_date && (
                    <> - {formatDate(event.event_end_date)}</>
                  )}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 mr-1.5" />
                  {event.city && event.state ? `${event.city}, ${event.state}` : 'Location TBD'}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className="text-xs">
                    {sourceInfo.icon} {sourceInfo.label}
                  </Badge>
                  {event.vetting_score != null && event.vetting_score > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Research: {event.vetting_score}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}
