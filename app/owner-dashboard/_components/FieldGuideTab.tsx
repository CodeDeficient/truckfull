'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layers } from 'lucide-react';
import { UpgradeModal } from '@/components/owner/UpgradeModal';
import { useTierAccess } from '@/hooks/useTierAccess';
import { FieldGuideSheetContent, type AreaStats } from '@/components/owner/FieldGuideSheetContent';
import { FieldGuideBottomSheet, FIELD_GUIDE_PEEK_HEIGHT_PX } from '@/components/owner/FieldGuideBottomSheet';
import MapboxMapComponent from '@/components/map/MapboxMapComponent';
import { TrafficVolumeLayer } from '@/components/map/TrafficVolumeLayer';
import { TrafficVolumeLayerVT } from '@/components/map/TrafficVolumeLayerVT';
import { MapboxTrafficLayer } from '@/components/map/MapboxTrafficLayer';
import { getIpLocation } from '@/lib/location/ipLocation';
import { FieldGuideLegend } from './FieldGuideLegend';
import { FieldGuideTeaser } from './FieldGuideTeaser';
import { useIsMobile } from '@/hooks/UseMobile';
import type { FoodTruckDomain, FoodTruck } from '@/lib/types';
import type { Database } from '@/lib/database.types.consolidated';

type TransportTruck = Database['public']['Tables']['food_trucks']['Row'];

interface FieldGuideTabProps {
  trucks: FoodTruckDomain[];
}

const DEFAULT_LOCATION = { lat: 33.4725, lng: -82.0105 };
const USE_VECTOR_TILES = true;

interface TrafficNode {
  id: string;
  station_id: string;
  aadt: number;
  lat: number;
  lng: number;
  location_description: string | null;
  score_percentile: number;
  distance_miles: number;
}

export function FieldGuideTab({ trucks }: FieldGuideTabProps) {
  const { tier } = useTierAccess();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | undefined>();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<TrafficNode | null>(null);
  const [radius, setRadius] = useState<number>(8047);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');
  const [viewMode] = useState<'heatmap' | 'points'>('heatmap');
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [ipLocation, setIpLocation] = useState<{ lat: number; lng: number } | null>(null);
  const isMobile = useIsMobile();

  const [nodes, setNodes] = useState<TrafficNode[]>([]);
  const [areaStats, setAreaStats] = useState<AreaStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  const currentLocation = ipLocation ?? DEFAULT_LOCATION;

  const selectedNodePosition: [number, number] | null = selectedNode
    ? [selectedNode.lng, selectedNode.lat]
    : null;

  // Dynamic map offset: pulls the center up above the sheet
  const mapOffset = useMemo<[number, number]>(() => {
    if (isSheetExpanded) {
      return [0, -250];
    }
    return [0, -(FIELD_GUIDE_PEEK_HEIGHT_PX / 1.5)];
  }, [isSheetExpanded]);

  // Auto-expand sheet when a node is selected from the map
  useEffect(() => {
    if (selectedNode) {
      setIsSheetExpanded(true);
    }
  }, [selectedNode]);

  // Fetch field guide data
  useEffect(() => {
    if (!currentLocation || !tier || tier === 'free') return;

    async function fetchData() {
      if (!currentLocation || !tier) return;

      setLoading(true);
      setError(null);

      try {
        const limit = '50';

        const params = new URLSearchParams({
          lat: currentLocation.lat.toString(),
          lng: currentLocation.lng.toString(),
          radius: radius.toString(),
          limit,
        });

        const response = await fetch(`/api/field-guide/nodes?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch');
        }

        const data = (await response.json()) as {
          nodes: Array<Omit<TrafficNode, 'distance_miles'> & { distance_meters: number }>;
          area_stats: AreaStats | null;
        };

        const nodesInMiles = (data.nodes ?? []).map((n) => ({
          ...n,
          distance_miles: n.distance_meters * 0.000_621_371,
        }));
        setNodes(nodesInMiles);
        setAreaStats(data.area_stats);
      } catch (error_) {
        console.error('Field guide fetch error:', error_);
        setError('Unable to load traffic data');
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [currentLocation, tier, radius]);

  useEffect(() => {
    getIpLocation().then(setIpLocation).catch(() => {});
  }, []);

  const isFreeUser = tier === 'free';

  const handleSheetToggle = useCallback(() => {
    setIsSheetExpanded((prev) => !prev);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedNode(null);
    setSelectedNodeId(null);
  }, []);

  if (isFreeUser) {
    return (
      <>
        <FieldGuideTeaser onUpgrade={() => setUpgradeModalOpen(true)} currentTier={tier} />
        <UpgradeModal
          isOpen={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          currentTier={tier}
        />
      </>
    );
  }

  const mapTrucks = trucks.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    cuisine_type: Array.isArray(t.cuisine_type) ? t.cuisine_type.join(', ') : 'Other',
    current_location: t.current_location as unknown,
    status: t.status ?? null,
    updated_at: t.updated_at ?? null,
    created_at: t.created_at ?? null,
    menu: t.menu_items ? { items: t.menu_items } : null,
    contact_info: t.contact_info,
    social_media: t.social_media,
    average_rating: t.average_rating ?? null,
    review_count: t.review_count ?? null,
    verification_status: t.verification_status ?? null,
    owner_id: t.owner_id ?? null,
    slug: null,
    is_claimed: t.is_claimed ?? false,
    header_image_url: null,
    profile_image_url: null,
    last_synced_at: t.last_synced_at ?? null,
    data_quality_score: t.data_quality_score ?? null,
    search_vector: null,
    subscription_tier: (t.subscription_tier === 'enterprise' ? 'pro' : t.subscription_tier) ?? null,
  })) as unknown as TransportTruck[];

  return (
    <>
      <div className="h-full min-h-0 flex flex-col overflow-hidden relative">
        {/* Map Area - fills entire space behind the bottom sheet */}
        <div className="flex-1 rounded-xl overflow-hidden border border-border relative">
          {/* Loading Overlay */}
          {trafficLoading && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-20 flex items-center justify-center">
              <div className="bg-white/95 rounded-xl shadow-lg p-6 max-w-sm text-center">
                <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="font-semibold text-gray-900 mb-1">Loading traffic data...</p>
                <p className="text-sm text-gray-500">
                  {radius > 100_000
                    ? "Large area selected. First load may take a moment, but it'll be faster next time!"
                    : 'Fetching traffic stations in your area...'}
                </p>
              </div>
            </div>
          )}

          {/* Controls Container */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            <div className="flex gap-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-1">
              <button
                onClick={() => setMapStyle('streets')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mapStyle === 'streets'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Streets
              </button>
              <button
                onClick={() => setMapStyle('satellite')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                  mapStyle === 'satellite'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Layers className="w-3 h-3" />
                Satellite
              </button>
            </div>
          </div>

          {/* Legend */}
          {!isFreeUser && (
            <div className="absolute top-[115px] right-[10px] z-10">
              <FieldGuideLegend />
            </div>
          )}

          <div className="h-full w-full relative">
            <MapboxMapComponent
              trucks={mapTrucks as unknown as FoodTruck[]}
              userLocation={currentLocation}
              externalCenter={selectedLocation}
              isMobile={isMobile}
              customOffset={mapOffset}
              customMapStyle={
                mapStyle === 'satellite'
                  ? 'mapbox://styles/mapbox/satellite-streets-v12'
                  : 'mapbox://styles/mapbox/streets-v12'
              }
              allowBottomNavOffset={false}
              hideGeolocate={true}
            >
              {/* Traffic Volume Layer */}
              {!isFreeUser &&
                (USE_VECTOR_TILES ? (
                  <TrafficVolumeLayerVT
                    visible={true}
                    userTier={tier === 'enterprise' ? 'pro' : tier === 'starter' ? 'free' : tier}
                    viewMode={viewMode}
                    beforeId="road-label"
                    onLoadingChange={(loading) => {
                      setTrafficLoading(loading);
                    }}
                    selectedNodeId={selectedNodeId}
                    selectedNodePosition={selectedNodePosition}
                    onClearSelection={handleClearSelection}
                    onNodeClick={(node) => {
                      setIsSheetExpanded(true);
                      setSelectedLocation([node.lng, node.lat]);
                      setSelectedNodeId(node.id);
                      setSelectedNode({
                        ...node,
                        location_description: `${node.state} Station ${node.station_id}`,
                        score_percentile: node.score_percentile,
                        distance_miles: 0,
                      });
                    }}
                  />
                ) : (
                  <TrafficVolumeLayer
                    visible={true}
                    userTier={tier === 'enterprise' ? 'pro' : tier === 'starter' ? 'free' : tier}
                    mapCenter={currentLocation}
                    radius={radius}
                    selectedNodeId={selectedNodeId}
                    selectedNodePosition={selectedNodePosition}
                    onClearSelection={handleClearSelection}
                    onNodeClick={(node) => {
                      setSelectedLocation([node.lng, node.lat]);
                      setSelectedNodeId(node.id);
                      setSelectedNode({
                        ...node,
                        distance_miles: (node.distance_meters ?? 0) * 0.000_621_371,
                      });
                    }}
                    onLoadingChange={(loading) => {
                      setTrafficLoading(loading);
                    }}
                    viewMode={viewMode}
                  />
                ))}

              {/* Live Traffic Layer */}
              <MapboxTrafficLayer visible={true} beforeId="traffic-circles" />
            </MapboxMapComponent>

            {/* Bottom Sheet - shared across breakpoints, overlays the map */}
            {!isFreeUser && (
              <FieldGuideBottomSheet
                expanded={isSheetExpanded}
                onToggle={handleSheetToggle}
              >
                <FieldGuideSheetContent
                  onNodeSelect={(node) => {
                    setIsSheetExpanded(true);
                    setSelectedLocation([node.lng, node.lat]);
                    setSelectedNodeId(node.id);
                    setSelectedNode(node);
                  }}
                  selectedNode={selectedNode}
                  onClearSelection={handleClearSelection}
                  radius={radius}
                  onRadiusChange={setRadius}
                  nodes={nodes}
                  areaStats={areaStats}
                  loading={loading}
                  error={error}
                />
              </FieldGuideBottomSheet>
            )}
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        currentTier={tier}
      />
    </>
  );
}
