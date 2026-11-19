'use client';

/**
 * Event Discovery Component
 * WBS: 6.2.2
 *
 * Browse and filter events available for food trucks to apply to.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Calendar as CalendarIcon,
  Users,
  Star,
  Search,
  RefreshCw,
  Loader2,
  SlidersHorizontal,
  X,
  ChevronDown,
  Bookmark,
} from 'lucide-react';
import { EventDetailModal } from './EventDetailModal';
import { EventBadges } from './EventBadges';
import { filterEvents } from './eventFilterLogic';
import { SOURCE_FILTER_OPTIONS } from '@/lib/events/sourceDisplay';
import {
  dismissEvent,
  undismissEvent,
} from '@/lib/events/dismissedEvents';

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const miles = R * c;
  return miles < 1 ? `${Math.round(miles * 5280)} ft` : `${miles.toFixed(1)} mi`;
}

interface Event {
  id: string;
  name: string;
  description: string;
  location_data: {
    lat: number;
    lng: number;
    address?: string;
    city?: string;
    state?: string;
  };
  start_date: string | null;
  end_date: string | null;
  status: string;
  vendor_fee: number | null;
  max_vendors: number | null;
  organizer: {
    business_name: string;
    rating_avg: number | null;
    rating_count: number;
    verification_status: string;
  };
  applications_count?: number;
  event_source: 'platform' | 'external';
  source?: string;
  source_type?: string | null;
  source_url?: string | null;
  vetting_score?: number | null;
  relevance_score?: number | null;
  verification_badge?: string | null;
  traffic_level?: 'high' | 'medium' | 'low' | 'none';
}

type SourceFilter = 'all' | 'official' | 'platform' | 'community';

interface EventDiscoveryProps {
  truckId?: string;
  userTier?: string;
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

function formatFee(fee: number | null): string | null {
  if (fee === null) return null;
  if (fee === 0) return 'Free';
  return `$${fee}`;
}

export function EventDiscovery({ truckId, userTier }: EventDiscoveryProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minVettingScore: 0,
    minRelevanceScore: 0,
    sourceFilter: 'all' as SourceFilter,
    showUnvetted: true,
    researchedOnly: false,
    relevantOnly: false,
  });
  const [sortBy, setSortBy] = useState<
    'date_asc' | 'date_desc' | 'relevance' | 'research' | 'name'
  >('date_asc');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [savedLeadIds, setSavedLeadIds] = useState<Set<string>>(new Set());
  const [lastDismissed, setLastDismissed] = useState<{ id: string; event: Event } | null>(null);

  const fetchEvents = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/events?status=published&period=future&page=${pageNum}&limit=20`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch events (${response.status})`);
      }
      const data = await response.json();
      if (pageNum === 1) {
        setEvents(data.events ?? []);
      } else {
        setEvents((prev) => [...prev, ...(data.events ?? [])]);
      }
      setHasMore(data.hasMore ?? false);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(1);
  }, [fetchEvents]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    // eslint-disable-next-line sonarjs/no-intrusive-permissions
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {},
    );
  }, []);

  const filteredEvents = filterEvents(events, filters, searchQuery) as Event[];

  const sortedEvents = useMemo(() => {
    const sorted = [...filteredEvents].filter((e) => !dismissedIds.has(e.id));
    switch (sortBy) {
      case 'date_asc': {
        return sorted.sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? ''));
      }
      case 'date_desc': {
        return sorted.sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''));
      }
      case 'relevance': {
        return sorted.sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));
      }
      case 'research': {
        return sorted.sort((a, b) => (b.vetting_score ?? 0) - (a.vetting_score ?? 0));
      }
      case 'name': {
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      }
      default: {
        return sorted;
      }
    }
  }, [filteredEvents, sortBy, dismissedIds]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const handleSaveLead = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedLeadIds.has(eventId) || !truckId) return;
    try {
      const res = await fetch('/api/events/saved-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, truck_id: truckId }),
      });
      if (res.ok) setSavedLeadIds((prev) => new Set([...prev, eventId]));
    } catch {}
  };

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="py-4">
          <p className="text-red-600">Error: {error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPage(1);
              fetchEvents(1);
            }}
            className="mt-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search bar + Filter button */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={filtersOpen ? 'default' : 'outline'}
          size="icon"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          {filtersOpen ? <X className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
        </Button>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-10 rounded-md border border-input bg-background px-3 pr-8 text-sm appearance-none cursor-pointer"
            data-testid="sort-select"
          >
            <option value="date_asc">Date (Soonest)</option>
            <option value="date_desc">Date (Latest)</option>
            <option value="relevance">Relevance ↓</option>
            <option value="research">Research ↓</option>
            <option value="name">Name A→Z</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setPage(1);
            fetchEvents(1);
          }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="rounded-lg border bg-background p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              <Badge variant="secondary" className="text-xs">
                {filteredEvents.length} events
              </Badge>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="filter-start-date" className="text-xs font-medium text-muted-foreground">Start Date</label>
              <input
                id="filter-start-date"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="filter-end-date" className="text-xs font-medium text-muted-foreground">End Date</label>
              <input
                id="filter-end-date"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Source</span>
            <div className="flex gap-1">
              {SOURCE_FILTER_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={filters.sourceFilter === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters({ ...filters, sourceFilter: option.value })}
                  className="text-xs h-7"
                >
                  {option.icon && <span className="mr-1">{option.icon}</span>}
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={filters.researchedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                userTier !== 'free' &&
                setFilters({ ...filters, researchedOnly: !filters.researchedOnly })
              }
              className={`text-xs h-7 w-[76px] shrink-0 ${userTier === 'free' ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={userTier === 'free'}
              title={userTier === 'free' ? 'Upgrade to Pro to filter by research' : ''}
            >
              Research
            </Button>
            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={filters.minVettingScore}
              onChange={(e) => setFilters({ ...filters, minVettingScore: Number(e.target.value) })}
              className={`w-24 ${userTier === 'free' ? 'opacity-50 pointer-events-none' : ''}`}
              disabled={userTier === 'free'}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              ≥ {filters.minVettingScore}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={filters.relevantOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                userTier !== 'free' &&
                setFilters({ ...filters, relevantOnly: !filters.relevantOnly })
              }
              className={`text-xs h-7 w-[76px] shrink-0 ${userTier === 'free' ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={userTier === 'free'}
              title={userTier === 'free' ? 'Upgrade to Pro to filter by relevance' : ''}
            >
              Relevant
            </Button>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={filters.minRelevanceScore}
              onChange={(e) =>
                setFilters({ ...filters, minRelevanceScore: Number(e.target.value) })
              }
              className={`w-24 ${userTier === 'free' ? 'opacity-50 pointer-events-none' : ''}`}
              disabled={userTier === 'free'}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              ≥ {filters.minRelevanceScore}
            </span>
          </div>
        </div>
      )}

      {/* Events Grid */}
      {loading && events.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : sortedEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No events found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check back later for new opportunities
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedEvents.map((event) => (
            <Card
              key={event.id}
              className="cursor-pointer hover:shadow-md transition-shadow flex flex-col h-full group"
              onClick={() => setSelectedEventId(event.id)}
            >
              <CardHeader className="pb-2 flex-shrink-0 relative">
                <div className="absolute top-2 right-2 flex items-center gap-0.5 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 hover:bg-muted/50 ${savedLeadIds.has(event.id) ? 'text-amber-400' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={(e) => handleSaveLead(event.id, e)}
                    title={savedLeadIds.has(event.id) ? 'Saved' : 'Save lead'}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${savedLeadIds.has(event.id) ? 'fill-amber-400 text-amber-400' : ''}`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissEvent(event.id);
                      setDismissedIds((prev) => new Set([...prev, event.id]));
                      setLastDismissed({ id: event.id, event });
                      setTimeout(() => setLastDismissed(null), 5000);
                    }}
                    title="Dismiss event"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex items-start justify-between pr-8">
                  <CardTitle className="text-lg line-clamp-1">{event.name}</CardTitle>
                  {event.vendor_fee != null && (
                    <Badge variant={event.vendor_fee > 0 ? 'default' : 'secondary'}>
                      {formatFee(event.vendor_fee)}
                    </Badge>
                  )}
                </div>
                <CardDescription className="line-clamp-2">{event.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 flex-1 flex flex-col justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarIcon className="w-4 h-4 mr-2 shrink-0" />
                  {event.start_date
                    ? event.end_date && event.end_date !== event.start_date
                      ? `${formatDate(event.start_date)} – ${formatDate(event.end_date)}`
                      : formatDate(event.start_date)
                    : 'TBD'}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">
                    {event.location_data.city}, {event.location_data.state}
                  </span>
                  {userLocation && event.location_data.lat && event.location_data.lng && (
                    <span className="ml-auto text-xs shrink-0">
                      ~
                      {getDistance(
                        userLocation.lat,
                        userLocation.lng,
                        event.location_data.lat,
                        event.location_data.lng,
                      )}
                    </span>
                  )}
                </div>
                {(event.max_vendors || event.event_source === 'platform') && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Users className="w-4 h-4 mr-2" />
                      {event.max_vendors
                        ? `${event.applications_count ?? 0}/${event.max_vendors} vendors`
                        : 'Unlimited'}
                    </div>
                    {event.organizer?.rating_avg && (
                      <div className="flex items-center text-amber-500">
                        <Star className="w-4 h-4 mr-1 fill-current" />
                        {event.organizer.rating_avg.toFixed(1)}
                      </div>
                    )}
                  </div>
                )}

                {/* Organizer badge */}
                {event.organizer?.business_name && event.organizer.business_name !== 'Unknown' && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <span className="text-sm text-muted-foreground">by</span>
                    <span className="text-sm font-medium">{event.organizer.business_name}</span>
                    {event.organizer.verification_status === 'verified' && (
                      <Badge variant="outline" className="text-xs">
                        Verified
                      </Badge>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t mt-auto">
                  <EventBadges
                    event={{
                      source: event.source,
                      source_type: event.source_type,
                      vetting_score: event.vetting_score,
                      relevance_score: event.relevance_score,
                      verification_badge: event.verification_badge,
                      traffic_level: event.traffic_level,
                      vendor_fee: event.vendor_fee,
                      event_source: event.event_source,
                      name: event.name,
                      description: event.description,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchEvents(nextPage);
            }}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Load More Events
          </Button>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          truckId={truckId}
          open={!!selectedEventId}
          onClose={() => setSelectedEventId(null)}
          userTier={userTier}
        />
      )}

      {lastDismissed && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 shadow-lg">
          <span className="text-sm text-zinc-300">Event hidden</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              undismissEvent(lastDismissed.id);
              setLastDismissed(null);
            }}
          >
            Undo
          </Button>
        </div>
      )}
    </div>
  );
}
