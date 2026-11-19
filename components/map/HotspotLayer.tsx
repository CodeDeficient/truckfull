'use client';

/**
 * Hotspot Map Layer Component
 * WBS: 4.4.1
 *
 * Displays traffic hotspots as a heatmap overlay on the map.
 * Only visible to Pro tier truck owners.
 */

import { useEffect, useState } from 'react';
import { Marker } from 'react-map-gl';
import { Flame } from 'lucide-react';
import { HotspotDetail } from '@/components/map/HotspotDetail';

interface Hotspot {
  id: string;
  lat: number;
  lng: number;
  traffic_score: number;
  expires_at: string;
  is_reserved: boolean;
  reserved_by_me?: boolean;
}

interface HotspotLayerProps {
  visible: boolean;
  userTier: 'free' | 'pro';
}

function getHotspotColor(score: number): string {
  if (score >= 90) return '#ef4444'; // red-500
  if (score >= 80) return '#f97316'; // orange-500
  if (score >= 70) return '#eab308'; // yellow-500
  return '#22c55e'; // green-500
}

export function HotspotLayer({ visible, userTier }: HotspotLayerProps) {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [selectedHotspotOpen, setSelectedHotspotOpen] = useState(false);

  useEffect(() => {
    if (!visible || userTier !== 'pro') return;

    async function fetchHotspots() {
      setLoading(true);
      try {
        const response = await fetch('/api/hotspots');
        if (response.ok) {
          const data = await response.json();
          setHotspots(data.hotspots ?? []);
        }
      } catch (error) {
        console.error('Failed to fetch hotspots:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchHotspots();

    // Refresh every 5 minutes
    const interval = setInterval(fetchHotspots, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [visible, userTier]);

  // Don't render for non-Pro users
  if (userTier !== 'pro' || !visible) {
    return null;
  }

  if (loading && hotspots.length === 0) {
    return null; // Don't show loading state on map
  }

  return (
    <>
      {hotspots.map((hotspot) => {
        // Don't show hotspots reserved by others
        if (hotspot.is_reserved && !hotspot.reserved_by_me) {
          return null;
        }

        const color = getHotspotColor(hotspot.traffic_score);
        const isSelected = selectedHotspot?.id === hotspot.id;

        return (
          <Marker key={hotspot.id} longitude={hotspot.lng} latitude={hotspot.lat}>
            {/* Hotspot pulse animation */}
            <div
              role="button"
              tabIndex={0}
              className="relative cursor-pointer group"
              onClick={() => {
                setSelectedHotspot(isSelected ? null : hotspot);
                setSelectedHotspotOpen(!isSelected);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedHotspot(isSelected ? null : hotspot);
                  setSelectedHotspotOpen(!isSelected);
                }
              }}
            >
              {/* Pulse ring */}
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-75"
                style={{
                  backgroundColor: color,
                  width: 40,
                  height: 40,
                  marginLeft: -20,
                  marginTop: -20,
                }}
              />

              {/* Core marker */}
              <div
                className="relative flex items-center justify-center rounded-full shadow-lg"
                style={{
                  backgroundColor: color,
                  width: 32,
                  height: 32,
                }}
              >
                <Flame className="w-4 h-4 text-white" />
              </div>

              {/* Score badge */}
              <div
                className="absolute -top-2 -right-2 bg-white rounded-full px-1.5 py-0.5 text-xs font-bold shadow"
                style={{ color }}
              >
                {hotspot.traffic_score}
              </div>
            </div>
          </Marker>
        );
      })}

      {selectedHotspot && (
        <HotspotDetail
          hotspot={{
            id: selectedHotspot.id,
            name: `Hotspot ${selectedHotspot.id}`,
            latitude: selectedHotspot.lat,
            longitude: selectedHotspot.lng,
          }}
          isOpen={selectedHotspotOpen}
          onClose={() => {
            setSelectedHotspotOpen(false);
            setSelectedHotspot(null);
          }}
          userTier={userTier}
        />
      )}
    </>
  );
}
