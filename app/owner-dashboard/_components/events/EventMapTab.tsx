'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Map,
  Popup,
  NavigationControl,
  GeolocateControl,
  Source,
  Layer,
  type MapRef,
} from 'react-map-gl/mapbox';
import { Loader2, AlertCircle, X, Search, Bookmark, EyeOff, MapPin, Navigation, ExternalLink, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Drawer } from 'vaul';
import { EventFilters } from '@/components/map/EventFilters';
import { TRAFFIC_TILESET_URL, TRAFFIC_SOURCE_LAYER } from '@/components/map/TrafficVolumeLayerVT';
import { EventDetailModal } from './EventDetailModal';
import { EventBadges } from './EventBadges';
import { useSaveLead } from '@/hooks/useSaveLead';
import { ClusteredEventMarkers } from './ClusteredEventMarkers';
import { useFilteredEvents } from './useFilteredEvents';
import { formatRadius, filterByRadius, haversineMiles } from '@/lib/events/radiusFilter';
import { buildEventsUrl } from '@/lib/events/buildEventsUrl';
import { getCachedEvents, setCachedEvents } from '@/lib/events/eventCache';
import { computeEventCounters, formatCounterText, type LocationStatus } from '@/lib/events/eventCounters';
import { AUGUSTA_CENTER, resolveRadiusOrigin, type RadiusOrigin } from '@/lib/events/mapCenter';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import type { MapEvent } from '@/components/map/eventMapTypes';

type SourceFilter = 'all' | 'official' | 'platform' | 'community';

const DEFAULT_RADIUS_MILES = 50;

interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
}

interface EventMapTabProps {
  truckId?: string;
  initialViewState?: MapViewState;
  selectedEventId?: string | null;
  onSelectEvent?: (event: MapEvent) => void;
  onClosePopup?: () => void;
  userTier?: string;
}

const getMapboxAccessToken = (): string | undefined => {
  if (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
    return process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  }
  return undefined;
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts.map(Number);
  if ([year, month, day].some((n) => !Number.isFinite(n))) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getRecommendationTier(score: number | null | undefined): { label: string; color: string } {
  if (score == null) return { label: 'Unvetted', color: 'text-gray-400' };
  if (score >= 80) return { label: 'Highly Recommended', color: 'text-green-600' };
  if (score >= 60) return { label: 'Recommended', color: 'text-blue-600' };
  if (score >= 40) return { label: 'Neutral', color: 'text-yellow-600' };
  if (score >= 20) return { label: 'Caution', color: 'text-orange-600' };
  return { label: 'Not Recommended', color: 'text-red-600' };
}

const DEFAULT_VIEW: MapViewState = {
  longitude: AUGUSTA_CENTER.longitude,
  latitude: AUGUSTA_CENTER.latitude,
  zoom: AUGUSTA_CENTER.zoom,
  bearing: 0,
  pitch: 0,
};

function PopupBookmarkButton({ eventId, truckId }: { eventId: string; truckId: string }) {
  const { saving, saved, saveLead } = useSaveLead({ eventId, truckId });
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!saved) saveLead();
      }}
      className={`p-1 transition-colors ${saved ? 'text-amber-400' : 'text-zinc-400 hover:text-amber-400'}`}
      title={saved ? 'Saved' : 'Save lead'}
      disabled={saving || saved}
    >
      <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-amber-400' : ''}`} />
    </button>
  );
}

function MobileSaveLeadButton({ eventId, truckId }: { eventId: string; truckId: string }) {
  const { saving, saved, saveLead } = useSaveLead({ eventId, truckId });
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!saving && !saved) saveLead();
      }}
      className={`p-1 transition-colors ${saved ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400'}`}
      title={saving ? 'Saving...' : saved ? 'Saved' : 'Save lead'}
      aria-label={saving ? 'Saving...' : saved ? 'Saved' : 'Save lead'}
    >
      <Bookmark className={`w-4 h-4 ${saved ? 'fill-amber-400' : ''}`} />
    </button>
  );
}

export function EventMapTab({
  truckId: _truckId,
  initialViewState,
  selectedEventId,
  onSelectEvent,
  onClosePopup,
  userTier = 'free',
}: EventMapTabProps) {
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<MapEvent | null>(null);
  const [viewState, setViewState] = useState<MapViewState>(initialViewState ?? DEFAULT_VIEW);
  const [isMobile, setIsMobile] = useState(false);
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
  const [period, setPeriod] = useState<'future' | 'past'>('future');
  const [detailEvent, setDetailEvent] = useState<MapEvent | null>(null);
  const [hiddenEventIds, setHiddenEventIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [radiusMiles, setRadiusMiles] = useState(DEFAULT_RADIUS_MILES);
  const [radiusCap, setRadiusCap] = useState(100);
  const [radiusOrigin, setRadiusOrigin] = useState<RadiusOrigin | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<MapRef | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const periodRef = useRef(period);
  const userTierRef = useRef(userTier);

  periodRef.current = period;
  userTierRef.current = userTier;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!_truckId) return;
    let cancelled = false;
    fetch(`/api/events/saved-leads?truck_id=${_truckId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.leads) return;
        const ids = new Set<string>(data.leads.map((l: { event_id: string }) => l.event_id));
        setSavedEventIds(ids);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [_truckId]);

  useEffect(() => {
    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, []);

  const handleMapLoad = useCallback(() => {
    setMapReady(true);
    const container = mapRef.current?.getContainer();
    if (!container) return;
    if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
    resizeObserverRef.current = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    resizeObserverRef.current.observe(container);
  }, []);

  useEffect(() => {
    const mql = globalThis.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const effectiveHiddenIds = showHidden ? new Set<string>() : hiddenEventIds;

  const eventsWithLocation = useFilteredEvents(
    events,
    filters,
    '',
    searchQuery,
    effectiveHiddenIds,
  );

  const isFallback = radiusOrigin?.isFallback ?? false;
  const isResolving = radiusOrigin === null;
  const locationStatus: LocationStatus = isResolving ? 'detecting' : isFallback ? 'fallback' : 'available';
  const effectiveRadiusMiles = isFallback ? radiusCap : Math.min(radiusMiles, radiusCap);

  const eventsInView = useMemo(() => {
    let result = eventsWithLocation;
    if (showSavedOnly) {
      result = result.filter((e) => savedEventIds.has(e.id));
    }
    const origin = radiusOrigin;
    if (origin && effectiveRadiusMiles > 0) {
      result = filterByRadius(result, origin.lat, origin.lng, effectiveRadiusMiles);
    }
    return result;
  }, [eventsWithLocation, showSavedOnly, savedEventIds, effectiveRadiusMiles, radiusOrigin]);

  const eventCounters = useMemo(
    () =>
      computeEventCounters(eventsWithLocation, {
        origin: radiusOrigin ? { lat: radiusOrigin.lat, lng: radiusOrigin.lng } : null,
        tierMaxRadius: radiusCap,
        userRadiusMiles: effectiveRadiusMiles,
        showSavedOnly,
        savedEventIds,
      }),
    [eventsWithLocation, radiusOrigin, radiusCap, effectiveRadiusMiles, showSavedOnly, savedEventIds],
  );

  const radiusCircleGeoJson = useMemo(() => {
    const origin = radiusOrigin;
    if (!origin || effectiveRadiusMiles <= 0) return null;

    const segments = 64;
    const coordinates: [number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (2 * Math.PI * i) / segments;
      const dLat = Math.cos(angle) * effectiveRadiusMiles / 69;
      const dLng =
        (Math.sin(angle) * effectiveRadiusMiles) /
        (69 * Math.cos((origin.lat * Math.PI) / 180));
      coordinates.push([origin.lng + dLng, origin.lat + dLat]);
    }

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [coordinates],
      },
    };
  }, [effectiveRadiusMiles, radiusOrigin]);


  const fetchEvents = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);

        const cacheKey = `${periodRef.current}:${userTierRef.current}`;
        const cached = getCachedEvents<MapEvent>(cacheKey);
        if (cached) {
          setEvents(cached.events);
          if (typeof cached.radiusCap === 'number') {
            setRadiusCap(cached.radiusCap);
          }
          if (showLoading) setLoading(false);
          return;
        }

        const url = buildEventsUrl(periodRef.current);

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch events (${response.status})`);
        }
        const data = await response.json();
        const fetchedEvents: MapEvent[] = data.events ?? [];
        const fetchedRadiusCap = typeof data.radiusCap === 'number' ? data.radiusCap : undefined;
        setEvents(fetchedEvents);
        setCachedEvents(cacheKey, fetchedEvents, fetchedRadiusCap);

        if (fetchedRadiusCap !== undefined) {
          setRadiusCap(fetchedRadiusCap);
        }
      } catch (error_) {
        setError(error_ instanceof Error ? error_.message : 'Failed to load events');
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents, period]);

  const fetchIpLocation = useCallback(async (timeoutMs: number): Promise<{ lat: number; lng: number } | null> => {
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) return null;
      const data = await res.json();
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return { lat: data.latitude, lng: data.longitude };
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let resolved = false;

    const handleResolve = (gps: { lat: number; lng: number } | null, ip: { lat: number; lng: number } | null) => {
      if (resolved) return;
      resolved = true;
      const origin = resolveRadiusOrigin(gps, ip);
      setRadiusOrigin(origin);
    };

    if (!navigator.geolocation) {
      void (async () => {
        const ip = await fetchIpLocation(3000);
        handleResolve(null, ip);
      })();
      return;
    }

    // eslint-disable-next-line sonarjs/no-intrusive-permissions
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleResolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }, null);
      },
      async () => {
        const ip = await fetchIpLocation(1000);
        handleResolve(null, ip);
      },
      { timeout: 3000, enableHighAccuracy: true },
    );
  }, [fetchIpLocation]);

  useEffect(() => {
    if (!radiusOrigin || radiusOrigin.isFallback || !mapReady) return;
    const current = mapRef.current?.getCenter();
    if (!current) return;
    const dist = haversineMiles(current.lat, current.lng, radiusOrigin.lat, radiusOrigin.lng);
    if (dist > 50) {
      mapRef.current?.flyTo({
        center: [radiusOrigin.lng, radiusOrigin.lat],
        zoom: 9,
        duration: 1000,
      });
    }
  }, [radiusOrigin, mapReady]);

  const prevSelectedEventIdRef = useRef(selectedEventId);
  useEffect(() => {
    const prevId = prevSelectedEventIdRef.current;
    prevSelectedEventIdRef.current = selectedEventId;

    if (selectedEventId && events.length > 0) {
      const event = events.find((e) => e.id === selectedEventId);
      if (event) {
        setSelectedEvent(event);
      }
    } else if (prevId != null && selectedEventId == null) {
      setSelectedEvent(null);
    }
  }, [selectedEventId, events]);

  const handleSelectEvent = useCallback(
    (event: MapEvent) => {
      setSelectedEvent(event);
      onSelectEvent?.(event);
    },
    [onSelectEvent],
  );

  const handleClosePopup = useCallback(() => {
    setSelectedEvent(null);
    onClosePopup?.();
  }, [onClosePopup]);

  if (loading) {
    return (
      <div data-testid="event-map-loading" className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mr-3" />
        <span className="text-muted-foreground">Loading events...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-500" />
          <p className="text-red-600 font-medium">Error loading events</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchEvents()} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!mounted) {
    return <div className="flex-1 min-h-0 bg-muted/5 rounded-lg animate-pulse" />;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-0.5 shrink-0 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground tabular-nums text-right shrink-0">
            {formatCounterText(eventCounters, radiusCap, locationStatus)}
          </span>
          {locationStatus === 'available' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground/60 cursor-help shrink-0">ⓘ</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="border-0">
                {userTier === 'free'
                  ? 'Radius limited to 100mi. Need more room? Upgrade to Pro!'
                  : 'Radius limited to 300mi'}
              </TooltipContent>
            </Tooltip>
          )}
          {locationStatus === 'detecting' && (
            <span className="text-xs text-blue-500 shrink-0">Finding your location...</span>
          )}
          {locationStatus === 'fallback' && (
            <span className="text-xs text-amber-600 shrink-0">
              {userTier === 'free'
                ? 'Enable location to unlock nearby event discovery.'
                : 'Enable location to personalize your opportunity map.'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center text-xs shrink-0">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="range"
              min={5}
              max={radiusCap}
              step={5}
              value={isFallback ? radiusCap : radiusMiles}
              onChange={(e) => setRadiusMiles(Number(e.target.value))}
              disabled={isResolving || isFallback}
              className={`w-16 sm:w-20 h-1 accent-primary ${isResolving || isFallback ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              data-testid="radius-slider"
              title={`Radius: ${formatRadius(isFallback ? radiusCap : radiusMiles)}`}
            />
            <span className="text-muted-foreground tabular-nums select-none w-[44px] text-right shrink-0">
              {formatRadius(isFallback ? radiusCap : radiusMiles)}
            </span>
          </div>
          <div className="relative flex-1 min-w-0 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 py-1 text-sm"
              data-testid="map-search-input"
            />
          </div>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => {
            setViewState({
              longitude: evt.viewState.longitude,
              latitude: evt.viewState.latitude,
              zoom: evt.viewState.zoom,
              bearing: 0,
              pitch: 0,
              padding: evt.viewState.padding ?? { top: 0, left: 0, right: 0, bottom: 0 },
            });
          }}
          style={{ position: 'absolute', inset: 0 }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={getMapboxAccessToken()}
          projection={{ name: 'mercator' }}
          onLoad={handleMapLoad}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <GeolocateControl
            positionOptions={{ enableHighAccuracy: true }}
            trackUserLocation={false}
            position="top-right"
          />

          {radiusCircleGeoJson && (
            <Source id="radius-circle" type="geojson" data={radiusCircleGeoJson}>
              <Layer
                id="radius-circle-outline"
                type="line"
                paint={{
                  'line-color': '#ef4444',
                  'line-width': 2,
                  'line-dasharray': [2, 4],
                  'line-opacity': 0.6,
                }}
              />
            </Source>
          )}

          <EventFilters
            isPro={userTier === 'pro' || userTier === 'enterprise'}
            eventCount={eventsInView.length}
            hiddenCount={hiddenEventIds.size}
            filters={filters}
            onFiltersChange={setFilters}
            period={period}
            onPeriodChange={setPeriod}
            showTraffic={showTraffic}
            onToggleTraffic={() => setShowTraffic(!showTraffic)}
            showHidden={showHidden}
            onToggleShowHidden={() => setShowHidden(!showHidden)}
            savedCount={savedEventIds.size}
            showSavedOnly={showSavedOnly}
            onToggleShowSavedOnly={() => setShowSavedOnly(!showSavedOnly)}
          />

          <ClusteredEventMarkers
            events={eventsInView}
            viewState={viewState}
            selectedEventId={selectedEvent?.id}
            onSelectEvent={handleSelectEvent}
            onHoverEvent={setHoveredEvent}
          />

          {showTraffic && userTier && userTier !== 'free' && (
            <Source id="event-traffic-heatmap" type="vector" url={TRAFFIC_TILESET_URL}>
              <Layer
                id="event-traffic-heat"
                type="heatmap"
                source-layer={TRAFFIC_SOURCE_LAYER}
                paint={{
                  'heatmap-weight': ['interpolate', ['linear'], ['get', 'aadt'], 0, 0, 50_000, 1],
                  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
                  'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0,
                    'rgba(0,0,255,0)',
                    0.1,
                    'royalblue',
                    0.3,
                    'cyan',
                    0.5,
                    'lime',
                    0.7,
                    'yellow',
                    1,
                    'red',
                  ],
                  'heatmap-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0,
                    20,
                    9,
                    40,
                    12,
                    55,
                    15,
                    70,
                  ],
                  'heatmap-opacity': 0.5,
                }}
              />
            </Source>
          )}

          {hoveredEvent &&
            Number.isFinite(hoveredEvent.location_data?.lat) &&
            Number.isFinite(hoveredEvent.location_data?.lng) && (
              <Popup
                longitude={hoveredEvent.location_data.lng!}
                latitude={hoveredEvent.location_data.lat!}
                onClose={() => setHoveredEvent(null)}
                closeOnClick={false}
                anchor="bottom"
                offset={15}
              >
                <div className="text-xs">
                  <p className="font-medium">{hoveredEvent.name}</p>
                  <p className="text-gray-500">{formatDate(hoveredEvent.start_date)}</p>
                  {hoveredEvent.location_data.city && (
                    <p className="text-gray-400">
                      {hoveredEvent.location_data.city}, {hoveredEvent.location_data.state}
                    </p>
                  )}
                  {(() => {
                    const tier = getRecommendationTier(hoveredEvent.vetting_score);
                    return <p className={`mt-0.5 font-medium ${tier.color}`}>{tier.label}</p>;
                  })()}
                </div>
              </Popup>
            )}

          {!isMobile && selectedEvent &&
            Number.isFinite(selectedEvent.location_data?.lat) &&
            Number.isFinite(selectedEvent.location_data?.lng) && (
              <Popup
                longitude={selectedEvent.location_data.lng!}
                latitude={selectedEvent.location_data.lat!}
                onClose={handleClosePopup}
                closeButton={false}
                closeOnClick={false}
                anchor="bottom"
                offset={15}
                maxWidth="340px"
                className="enhanced-popup"
              >
                <div className="enhanced-popup-content">
                  <div className="popup-header">
                    <h3 className="truck-name min-w-0 flex-1" title={selectedEvent.name}>
                      {selectedEvent.name}
                    </h3>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {selectedEvent.event_source === 'external' && _truckId && (
                        <PopupBookmarkButton eventId={selectedEvent.id} truckId={_truckId} />
                      )}
                      <button
                        onClick={() => {
                          setHiddenEventIds((prev) => new Set([...prev, selectedEvent.id]));
                          handleClosePopup();
                        }}
                        className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
                        title="Hide from map"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="popup-close-button"
                        onClick={handleClosePopup}
                        aria-label="Close popup"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="popup-body">
                    {selectedEvent.start_date && (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(selectedEvent.start_date)}
                        {selectedEvent.end_date &&
                          selectedEvent.end_date !== selectedEvent.start_date &&
                          ` – ${formatDate(selectedEvent.end_date)}`}
                      </p>
                    )}
                    {selectedEvent.location_data.address && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedEvent.location_data.address}
                      </p>
                    )}
                    {selectedEvent.location_data.city && (
                      <p className="text-xs text-muted-foreground">
                        {selectedEvent.location_data.city}, {selectedEvent.location_data.state}
                      </p>
                    )}
                    {selectedEvent.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {selectedEvent.description}
                      </p>
                    )}
                    <div className="flex items-center flex-wrap gap-1 mt-2">
                      <EventBadges
                        event={{
                          source: selectedEvent.source,
                          source_type: selectedEvent.source_type,
                          vetting_score: selectedEvent.vetting_score,
                          relevance_score: selectedEvent.relevance_score,
                          verification_badge: selectedEvent.verification_badge,
                          vendor_fee: selectedEvent.vendor_fee,
                          event_source: selectedEvent.event_source,
                          name: selectedEvent.name,
                          description: selectedEvent.description,
                        }}
                        compact
                      />
                      {selectedEvent.source_url && (
                        <a
                          href={selectedEvent.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        >
                          Source
                        </a>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailEvent(selectedEvent);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-colors"
                      >
                        Research
                      </button>
                    </div>
                  </div>
                </div>
              </Popup>
            )}
        </Map>

        {detailEvent && (
          <EventDetailModal
            event={detailEvent as unknown as import('./EventDetailModal').Event}
            truckId={_truckId}
            open={!!detailEvent}
            onClose={() => setDetailEvent(null)}
            userTier={userTier}
          />
        )}
      </div>

      {isMobile && selectedEvent && (
        <Drawer.Root
          open={!!selectedEvent}
          onOpenChange={(open) => {
            if (!open) handleClosePopup();
          }}
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-transparent pointer-events-none" />
            <Drawer.Content className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t rounded-t-xl flex flex-col max-h-[40vh] overflow-hidden">
              <div className="w-10 h-1.5 bg-muted mx-auto rounded-full mt-2 mb-1" data-testid="drawer-handle" />
              <Drawer.Title className="sr-only">{selectedEvent.name}</Drawer.Title>
              <Drawer.Description className="sr-only">
                Event details for {selectedEvent.name}
              </Drawer.Description>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-base min-w-0 flex-1">{selectedEvent.name}</h3>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {selectedEvent.event_source === 'external' && _truckId && (
                      <MobileSaveLeadButton eventId={selectedEvent.id} truckId={_truckId} />
                    )}
                    <button
                      onClick={() => {
                        setHiddenEventIds((prev) => new Set([...prev, selectedEvent.id]));
                        handleClosePopup();
                      }}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="Hide"
                      aria-label="Hide event"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleClosePopup}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="mobile-drawer-close"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selectedEvent.start_date && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(selectedEvent.start_date)}
                    {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.start_date &&
                      ` – ${formatDate(selectedEvent.end_date)}`}
                  </p>
                )}

                {selectedEvent.location_data.address && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {selectedEvent.location_data.address}
                  </p>
                )}
                {selectedEvent.location_data.city && (
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.location_data.city}, {selectedEvent.location_data.state}
                  </p>
                )}

                <div className="mt-2">
                  <EventBadges
                    event={{
                      source: selectedEvent.source,
                      source_type: selectedEvent.source_type,
                      vetting_score: selectedEvent.vetting_score,
                      relevance_score: selectedEvent.relevance_score,
                      verification_badge: selectedEvent.verification_badge,
                      vendor_fee: selectedEvent.vendor_fee,
                      event_source: selectedEvent.event_source,
                      name: selectedEvent.name,
                      description: selectedEvent.description,
                    }}
                    compact
                  />
                </div>

                <div className="flex items-center gap-2 mt-3">
                  {Number.isFinite(selectedEvent.location_data?.lat) &&
                    Number.isFinite(selectedEvent.location_data?.lng) && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedEvent.location_data.lat},${selectedEvent.location_data.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        <Navigation className="w-4 h-4" />
                        Navigate
                      </a>
                    )}
                  {selectedEvent.source_url && (
                    <a
                      href={selectedEvent.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-background text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      data-testid="mobile-drawer-source"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Source
                    </a>
                  )}
                  <button
                    onClick={() => setDetailEvent(selectedEvent)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-background text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    data-testid="mobile-drawer-research"
                  >
                    <Shield className="w-4 h-4" />
                    Research
                  </button>
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
      </div>
    </TooltipProvider>
  );
}
