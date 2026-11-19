import React from 'react';

export function ClusteredEventMarkers({ events, onSelectEvent }: any) {
  const validEvents = events?.filter(
    (e: any) => e.location_data?.lat != null && e.location_data?.lng != null,
  ) ?? [];

  return (
    <>
      {validEvents.map((event: any) => (
        <div
          key={event.id}
          data-testid="marker"
          onClick={() => onSelectEvent?.(event)}
        />
      ))}
    </>
  );
}
