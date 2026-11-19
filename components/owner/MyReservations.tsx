'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { getSupabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/UseToast';
import { logError } from '@/lib/logging';
import type { Database } from '@/lib/database.remote.types';

type HotspotReservationRow = Database['public']['Tables']['hotspot_reservations']['Row'];

function openMapForLocation(lat: number, lng: number): void {
  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  window.open(mapUrl, '_blank');
}

interface ReservationQueryResult extends HotspotReservationRow {
  hotspots: {
    description: string | null;
    lat: number;
    lng: number;
  };
  food_trucks: {
    name: string;
  };
}

type ReservationStatus = 'active' | 'released' | 'completed' | 'cancelled';

interface Reservation {
  id: string;
  hotspot_id: string;
  hotspot_name: string;
  hotspot_lat: number;
  hotspot_lng: number;
  truck_id: string;
  truck_name: string;
  reserved_at: string;
  reserved_until: string;
  status: ReservationStatus;
  released_at: string | null;
}

interface MyReservationsProps {
  readonly ownerId: string;
}

type FilterType = 'active' | 'past' | 'all';

function getStatusBadgeVariant(
  status: ReservationStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active': {
      return 'default';
    }
    case 'released': {
      return 'secondary';
    }
    case 'completed': {
      return 'default';
    }
    case 'cancelled': {
      return 'destructive';
    }
    default: {
      return 'outline';
    }
  }
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function EmptyState({ onFindHotspots }: Readonly<{ onFindHotspots: () => void }>) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📍</div>
      <h3 className="text-xl font-semibold mb-2">No reservations yet</h3>
      <p className="text-muted-foreground mb-6">
        Start exploring hotspots and reserve your spot today!
      </p>
      <Button onClick={onFindHotspots} variant="default">
        Find Hotspots
      </Button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/4 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ReservationCard({
  reservation,
  onReleaseEarly,
  onViewMap,
  isReleasing,
}: Readonly<{
  reservation: Reservation;
  onReleaseEarly: (id: string) => void;
  onViewMap: (lat: number, lng: number) => void;
  isReleasing: Set<string>;
}>) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{reservation.hotspot_name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Truck: {reservation.truck_name}</p>
          </div>
          <Badge variant={getStatusBadgeVariant(reservation.status)}>{reservation.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Reserved at:</span>
            <span className="font-medium">{formatTime(reservation.reserved_at)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Reserved until:</span>
            <span className="font-medium">{formatTime(reservation.reserved_until)}</span>
          </div>
          {reservation.released_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Released at:</span>
              <span className="font-medium">{formatTime(reservation.released_at)}</span>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            {reservation.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReleaseEarly(reservation.id)}
                disabled={isReleasing.has(reservation.id)}
              >
                Release Early
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewMap(reservation.hotspot_lat, reservation.hotspot_lng)}
            >
              View on Map
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyReservations({ ownerId }: MyReservationsProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterType>('active');
  const [isReleasing, setIsReleasing] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    void fetchReservations();
  }, [ownerId]);

  async function fetchReservations() {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = getSupabase();
      const { data, error: fetchError } = await supabase
        .from('hotspot_reservations')
        .select(
          `
          id,
          hotspot_id,
          truck_id,
          reserved_at,
          reserved_until,
          status,
          released_at,
          hotspots (
            description,
            lat,
            lng
          ),
          food_trucks!inner (
            name
          )
        `,
        )
        .eq('truck_id', ownerId)
        .order('reserved_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const transformedData: Reservation[] = (data ?? []).map(
        (item: ReservationQueryResult): Reservation => ({
          id: item.id,
          hotspot_id: item.hotspot_id,
          hotspot_name: item.hotspots?.description || `Hotspot ${item.hotspot_id}`,
          hotspot_lat: item.hotspots?.lat || 0,
          hotspot_lng: item.hotspots?.lng || 0,
          truck_id: item.truck_id,
          truck_name: item.food_trucks?.name || 'Unknown Truck',
          reserved_at: item.reserved_at,
          reserved_until: item.reserved_until,
          status:
            item.status === 'active' ||
            item.status === 'released' ||
            item.status === 'completed' ||
            item.status === 'cancelled'
              ? item.status
              : 'active',
          released_at: item.released_at,
        }),
      );

      setReservations(transformedData);
    } catch (error_) {
      logError('Error fetching reservations:', error_);
      setError(error_ instanceof Error ? error_.message : 'Failed to load reservations');
      toast({
        title: 'Error',
        description: 'Failed to load reservations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReleaseEarly(reservationId: string) {
    try {
      setIsReleasing((prev) => new Set(prev).add(reservationId));

      const supabase = getSupabase();
      const { error: updateError } = await supabase
        .from('hotspot_reservations')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
        })
        .eq('id', reservationId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      toast({
        title: 'Success',
        description: 'Reservation released successfully',
      });

      await fetchReservations();
    } catch (error_) {
      logError('Error releasing reservation:', error_);
      toast({
        title: 'Error',
        description: error_ instanceof Error ? error_.message : 'Failed to release reservation',
        variant: 'destructive',
      });
    } finally {
      setIsReleasing((prev) => {
        const next = new Set(prev);
        next.delete(reservationId);
        return next;
      });
    }
  }

  function getFilteredReservations(): Reservation[] {
    const now = new Date();

    switch (activeTab) {
      case 'active': {
        return reservations.filter(
          (r) => r.status === 'active' && new Date(r.reserved_until) > now,
        );
      }
      case 'past': {
        return reservations.filter(
          (r) => r.status !== 'active' || new Date(r.reserved_until) <= now,
        );
      }
      default: {
        return reservations;
      }
    }
  }

  const filteredReservations = getFilteredReservations();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Reservations</h2>
        <p className="text-muted-foreground">Manage your hotspot reservations</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FilterType)}>
        <TabsList>
          <TabsTrigger value="active">
            Active ({filteredReservations.filter((r) => r.status === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({filteredReservations.filter((r) => r.status !== 'active').length})
          </TabsTrigger>
          <TabsTrigger value="all">All ({filteredReservations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-destructive text-center">{error}</p>
              </CardContent>
            </Card>
          ) : filteredReservations.length === 0 ? (
            <EmptyState onFindHotspots={() => {}} />
          ) : (
            <div className="space-y-4">
              {filteredReservations.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  onReleaseEarly={handleReleaseEarly}
                  onViewMap={openMapForLocation}
                  isReleasing={isReleasing}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
