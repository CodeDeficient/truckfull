import React from 'react';
import Image from 'next/image';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Shared interfaces for truck card data
export interface BaseTruckCardSchedule {
  id: string;
  food_truck_id: string;
  day_of_week: number; // 0=Sun, 1=Mon, ...
  is_active: boolean;
}

export interface BaseTruckCardEvent {
  id: string;
  title: string;
  event_date: string;
  location_address?: string;
}

export interface BaseTruckCardData {
  id: string;
  name: string;
  description: string;
  cuisine_type?: string;
  schedule?: BaseTruckCardSchedule[];
  events?: BaseTruckCardEvent[];
  image_url?: string; // Add photo URL for the truck
  average_rating?: number; // Add rating for the truck
}

// Shared truck card content component
interface BaseTruckCardContentProps {
  truck: BaseTruckCardData;
  loadingSchedules?: boolean;
  loadingEvents?: boolean;
  renderCustomContent?: () => React.ReactNode;
}

export const BaseTruckCardContent: React.FC<BaseTruckCardContentProps> = ({
  truck,
  loadingSchedules = false,
  loadingEvents = false,
  renderCustomContent,
}) => {
  // Render truck photo if available
  const renderTruckPhoto = () => {
    if (truck.image_url) {
      return (
        <div className="mb-3 rounded-lg overflow-hidden">
          <Image
            src={truck.image_url}
            alt={`${truck.name} photo`}
            width={300}
            height={150}
            className="w-full h-32 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      );
    }
    return null;
  };

  // Render rating if available
  const renderRating = () => {
    if (typeof truck.average_rating === 'number' && truck.average_rating > 0) {
      // Generate star rating display
      const fullStars = Math.floor(truck.average_rating);
      const hasHalfStar = truck.average_rating % 1 >= 0.5;
      const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

      return (
        <div className="flex items-center mt-1">
          <div className="flex">
            {Array.from({ length: fullStars }, (_, i) => (
              <span key={`full-${i}`} className="text-yellow-400">
                ★
              </span>
            ))}
            {hasHalfStar && (
              <span key="half" className="text-yellow-400">
                ☆
              </span>
            )}
            {Array.from({ length: emptyStars }, (_, i) => (
              <span key={`empty-${i}`} className="text-gray-300">
                ★
              </span>
            ))}
          </div>
          <span className="ml-2 text-sm text-gray-600">({truck.average_rating.toFixed(1)})</span>
        </div>
      );
    }
    return null;
  };

  // Render loading skeleton for events section when events are loading
  const renderEventsSection = () => {
    if (loadingEvents) {
      return (
        <div className="mt-4" role="status" aria-live="polite">
          <h4 className="font-semibold mb-1">Upcoming Events</h4>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      );
    }

    if (truck.events && truck.events.length > 0) {
      return (
        <div className="mt-4">
          <h4 className="font-semibold mb-1" aria-label="Upcoming events">
            Upcoming Events
          </h4>
          <ul aria-label="List of upcoming events">
            {truck.events.slice(0, 3).map((event) => (
              <li key={event.id} className="mb-1">
                <span className="font-medium">{event.title}</span> &mdash; {event.event_date}
                {event.location_address?.trim() && (
                  <span className="ml-2 text-gray-500">@ {event.location_address}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return null;
  };

  // Render schedules section with loading state
  const renderSchedulesSection = (): React.JSX.Element | null => {
    if (loadingSchedules) {
      return (
        <div className="flex gap-1 mt-2" role="status" aria-live="polite">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      );
    }

    if (!truck.schedule || truck.schedule.length === 0) {
      return null;
    }

    return (
      <div className="flex gap-1 mt-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
          const isActive = truck.schedule?.some((s) => s.day_of_week === idx && s.is_active);
          return (
            <span
              key={day}
              className={isActive ? 'font-bold text-primary' : 'text-gray-400'}
              aria-label={`${day} ${isActive ? 'is active' : 'is not active'}`}
            >
              {day}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Truck photo */}
      {renderTruckPhoto()}

      <div className="flex justify-between">
        <h3 className="text-lg font-semibold">{truck.name}</h3>
        <span className="text-gray-500">{truck.cuisine_type}</span>
      </div>

      {/* Rating display */}
      {renderRating()}

      <p className="text-gray-700 mt-1">{truck.description}</p>

      {/* Display active days (grey out inactive) */}
      {renderSchedulesSection()}

      {/* Custom content section for specialized cards */}
      {renderCustomContent?.()}

      {/* Upcoming Events section with error boundary */}
      <ErrorBoundary
        fallback={
          <div className="mt-4 text-red-500" role="alert" aria-live="polite">
            <h4 className="font-semibold mb-1">Upcoming Events</h4>
            <p>Unable to load events. Please try again later.</p>
          </div>
        }
      >
        {renderEventsSection()}
      </ErrorBoundary>
    </>
  );
};

// Shared truck card wrapper component
interface BaseTruckCardProps {
  truck: BaseTruckCardData;
  loadingSchedules?: boolean;
  loadingEvents?: boolean;
  renderCustomContent?: () => React.ReactNode;
  className?: string;
}

export const BaseTruckCard: React.FC<BaseTruckCardProps> = ({
  truck,
  loadingSchedules = false,
  loadingEvents = false,
  renderCustomContent,
  className = 'border rounded-lg p-4',
}) => {
  return (
    <div className={className}>
      <BaseTruckCardContent
        truck={truck}
        loadingSchedules={loadingSchedules}
        loadingEvents={loadingEvents}
        renderCustomContent={renderCustomContent}
      />
    </div>
  );
};
