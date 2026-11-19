'use client';

import React from 'react';
import { Marker } from 'react-map-gl/mapbox';
import { getTrafficLight } from '@/lib/events/trafficLightBadge';
import { getSourceCategory } from '@/lib/events/sourceDisplay';
import type { MapEvent } from '@/components/map/eventMapTypes';

export interface EventMarkerProps {
  event: MapEvent;
  onClick: () => void;
  isSelected?: boolean;
  isHovered?: boolean;
}

function isValidCoord(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

export const EventMarker = React.memo(({ event, onClick, isSelected, isHovered }: EventMarkerProps) => {
  const lat = event.location_data.lat;
  const lng = event.location_data.lng;

  if (!isValidCoord(lat) || !isValidCoord(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }

  const trafficLight = getTrafficLight({
    vettingScore: event.vetting_score,
    relevanceScore: event.relevance_score,
    verificationBadge: event.verification_badge,
    sourceCategory: getSourceCategory(event.source_type ?? null),
  });

  const headerColor =
    trafficLight.level === 'green'
      ? '#16a34a'
      : trafficLight.level === 'yellow'
        ? '#eab308'
        : trafficLight.level === 'red'
          ? '#dc2626'
          : '#6b7280';

  const date = event.start_date
    ? (() => {
        const [y, m, d] = event.start_date.split('-').map(Number);
        return new Date(y, m - 1, d);
      })()
    : null;
  const dayOfWeek = date ? date.toLocaleString('en-US', { weekday: 'short' }).toUpperCase() : '';
  const month = date ? date.toLocaleString('en-US', { month: 'short' }).toUpperCase() : '';
  const day = date ? date.getDate() : '';
  const isLarge = isSelected || isHovered;

  return (
    <Marker latitude={lat} longitude={lng} onClick={onClick} style={{ cursor: 'pointer' }}>
      <div
        className={`event-marker ${isSelected ? 'event-marker-selected' : ''} ${isHovered ? 'event-marker-hovered' : ''}`}
        style={{
          width: isLarge ? '54px' : '46px',
          borderRadius: '8px',
          border: '2px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'transform 0.15s ease, width 0.15s ease',
          cursor: 'pointer',
          lineHeight: 1,
          position: 'relative',
        }}
      >
        <div
          style={{
            backgroundColor: headerColor,
            padding: '4px 2px',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              color: 'white',
              fontSize: isLarge ? '12px' : '10px',
              fontWeight: 800,
              letterSpacing: '1px',
            }}
          >
            {month}
          </span>
        </div>
        <div
          style={{
            backgroundColor: '#1a1a1a',
            padding: '5px 2px',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              color: 'white',
              fontSize: isLarge ? '11px' : '10px',
              fontWeight: 600,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
            }}
          >
            {dayOfWeek} {day}
          </span>
        </div>
      </div>
    </Marker>
  );
});

interface EventClusterMarkerProps {
  cluster: {
    id: number | string;
    geometry: { coordinates: number[] };
    properties: { point_count: number };
  };
  onClick: () => void;
}

export const EventClusterMarker = React.memo(({ cluster, onClick }: EventClusterMarkerProps) => {
  const [longitude, latitude] = cluster.geometry.coordinates;
  const { point_count } = cluster.properties;

  const size =
    point_count >= 10
      ? 'w-14 h-14 text-sm'
      : point_count >= 5
        ? 'w-12 h-12 text-xs'
        : 'w-10 h-10 text-xs';

  return (
    <Marker latitude={latitude} longitude={longitude}>
      <button
        type="button"
        className={`flex items-center justify-center rounded-full border-[3px] ${size} bg-black border-red-500 shadow-lg cursor-pointer transition-transform hover:scale-110`}
        onClick={onClick}
        aria-label={`Cluster with ${point_count} events`}
      >
        <span
          className="font-bold text-rose-200"
          style={{ textShadow: '0 0 6px #dc2626, 0 0 12px #dc2626' }}
        >
          {point_count}
        </span>
      </button>
    </Marker>
  );
});

export function validateEventCoordinates(event: MapEvent): boolean {
  const lat = event.location_data?.lat;
  const lng = event.location_data?.lng;
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}
