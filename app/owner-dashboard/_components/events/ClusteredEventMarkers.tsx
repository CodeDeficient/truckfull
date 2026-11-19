'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { EventMarker, EventClusterMarker, validateEventCoordinates } from './EventMarker';
import { useEventClustering } from './useEventClustering';
import type { EventClusterFeature, EventPointFeature } from './useEventClustering';
import type { MapEvent } from '@/components/map/eventMapTypes';

interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

interface ClusteredEventMarkersProps {
  events: MapEvent[];
  viewState: MapViewState;
  selectedEventId?: string | null;
  onSelectEvent?: (event: MapEvent) => void;
  onHoverEvent?: (_event: MapEvent | null) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ClusteredEventMarkers({
  events,
  viewState,
  selectedEventId: _selectedEventId,
  onSelectEvent,
  onHoverEvent: _onHoverEvent,
}: ClusteredEventMarkersProps) {
  const { clusteredFeatures } = useEventClustering(events, viewState);

  const [clusterEvents, setClusterEvents] = useState<MapEvent[]>([]);
  const [clusterDialogOpen, setClusterDialogOpen] = useState(false);

  const handleClusterClick = useCallback(
    (cluster: EventClusterFeature) => {
      const allEvents = events.filter((e) => validateEventCoordinates(e));
      const clusterEventList = allEvents.filter((e) => cluster.properties.eventIds.includes(e.id));
      setClusterEvents(clusterEventList);
      setClusterDialogOpen(true);
    },
    [events],
  );

  return (
    <>
      {clusteredFeatures.map((feature) => {
        const isCluster = feature.properties.cluster;
        if (isCluster) {
          const cluster = feature as EventClusterFeature;
          return (
            <EventClusterMarker
              key={`cluster-${cluster.id}`}
              cluster={cluster}
              onClick={() => handleClusterClick(cluster)}
            />
          );
        }

        const point = feature as EventPointFeature;
        const event = point.properties.event;
        return <EventMarker key={event.id} event={event} onClick={() => onSelectEvent?.(event)} />;
      })}

      <Dialog open={clusterDialogOpen} onOpenChange={setClusterDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{clusterEvents.length} Events in Cluster</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setClusterDialogOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Event details for {clusterEvents.map((e) => e.name).join(', ')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {clusterEvents.map((event) => (
              <Card
                key={event.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  onSelectEvent?.(event);
                  setClusterDialogOpen(false);
                }}
              >
                <CardHeader className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm line-clamp-1">{event.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.location_data.city
                          ? `${event.location_data.city}, ${event.location_data.state}`
                          : event.location_data.address}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(event.start_date)}
                      </p>
                    </div>
                    {event.vendor_fee != null && (
                    <Badge
                      variant={event.vendor_fee > 0 ? 'default' : 'secondary'}
                      className="shrink-0"
                    >
                      {event.vendor_fee > 0 ? `$${event.vendor_fee}` : 'Free'}
                    </Badge>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
