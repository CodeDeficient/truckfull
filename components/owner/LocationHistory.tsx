'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Facebook, Edit2, Clock, Search } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { logError } from '@/lib/logging';
import type { Database } from '@/lib/database.remote.types';

type LocationHistoryRow = Database['public']['Tables']['location_history']['Row'];

interface LocationData {
  lat?: number;
  lng?: number;
  address?: string;
}

export interface ExtractedLocation {
  address?: string;
  city?: string;
  state?: string;
  fuzzy?: boolean;
  confidence: number;
  sourcePostId: string;
  raw_text?: string;
}

export interface Location {
  lat?: number;
  lng?: number;
  address?: string;
}

export interface LocationHistoryEntry {
  id: string;
  version: number;
  location: Location;
  createdAt: string;
  source: 'facebook' | 'manual';
  sourcePostId?: string;
  confidence?: number;
  status: 'active' | 'inactive';
}

interface LocationHistoryProps {
  readonly truckId: string;
}

export function LocationHistory({ truckId }: LocationHistoryProps) {
  const [history, setHistory] = useState<LocationHistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<LocationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchLocationHistory();
  }, [truckId]);

  useEffect(() => {
    filterHistory();
  }, [history, searchQuery, startDate, endDate]);

  async function fetchLocationHistory() {
    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabase();
      const { data, error: fetchError } = await supabase
        .from('location_history')
        .select('*')
        .eq('truck_id', truckId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const formattedHistory = (data || []).map(
        (entry: LocationHistoryRow): LocationHistoryEntry => {
          const locData = entry.location_data as LocationData | null;
          const source =
            entry.source === 'facebook' || entry.source === 'manual' ? entry.source : 'manual';
          const status =
            entry.status === 'active' || entry.status === 'inactive' ? entry.status : 'inactive';

          return {
            id: entry.id,
            version: entry.version,
            location: {
              lat: locData?.lat,
              lng: locData?.lng,
              address: locData?.address,
            },
            createdAt: entry.created_at || '',
            source,
            sourcePostId: entry.source_post_id || undefined,
            confidence: entry.confidence || undefined,
            status,
          };
        },
      );

      setHistory(formattedHistory);
    } catch (error_) {
      logError('Failed to fetch location history:', error_);
      setError('Failed to load location history. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function filterHistory() {
    let filtered = [...history];

    if (searchQuery) {
      filtered = filtered.filter((entry) =>
        entry.location.address?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (startDate) {
      filtered = filtered.filter((entry) => new Date(entry.createdAt) >= new Date(startDate));
    }

    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59);
      filtered = filtered.filter((entry) => new Date(entry.createdAt) <= endOfDay);
    }

    setFilteredHistory(filtered);
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading location history...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Location History
        </CardTitle>
        <CardDescription>
          View history of auto-created locations from Facebook posts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by location name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No locations found matching your criteria.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{entry.location.address || 'Unknown location'}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {entry.source === 'facebook' && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Facebook className="h-3 w-3" />
                            Facebook
                          </Badge>
                        )}
                        {entry.source === 'manual' && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Edit2 className="h-3 w-3" />
                            Manual
                          </Badge>
                        )}
                        {entry.confidence !== undefined && (
                          <Badge
                            variant={
                              entry.confidence >= 0.9
                                ? 'default'
                                : entry.confidence >= 0.7
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {Math.round(entry.confidence * 100)}% confidence
                          </Badge>
                        )}
                        <Badge
                          variant={entry.status === 'active' ? 'default' : 'outline'}
                          className={
                            entry.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''
                          }
                        >
                          {entry.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Version {entry.version} • {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
