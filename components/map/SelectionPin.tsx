'use client';

import { Marker } from 'react-map-gl/mapbox';

interface SelectionPinProps {
  longitude: number;
  latitude: number;
}

export function SelectionPin({ longitude, latitude }: SelectionPinProps) {
  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="bottom"
    >
      <div
        className="traffic-selected-pin"
        role="img"
        aria-label="Selected traffic node"
        style={{
          animation: 'traffic-pin-bob 1.4s ease-in-out infinite',
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
          willChange: 'transform',
        }}
      >
        <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M17 2C8.164 2 1 8.716 1 17c0 11.25 16 24 16 24s16-12.75 16-24C33 8.716 25.836 2 17 2z"
            fill="#ef4444"
            stroke="#991b1b"
            strokeWidth="2"
          />
          <circle cx="17" cy="16" r="6" fill="white" opacity="0.85" />
        </svg>
      </div>
      <style>{`@keyframes traffic-pin-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
    </Marker>
  );
}
