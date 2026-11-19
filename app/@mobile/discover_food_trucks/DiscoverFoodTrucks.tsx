'use client';

import React, { useState, useEffect } from 'react';
import Link from '@/components/navigation/IntentLink';
import { Button } from '@/components/ui/button';
import { MapPin, TrendingUp, Clock as ClockIcon, Search, Grid3X3, ChevronLeft } from 'lucide-react';

import type { FoodTruck, FoodTruckDomain } from '@/lib/types';
import { isViableTruck } from '@/lib/utils/foodTruckHelpers';
import { isTestTruckName } from '@/lib/api/client/trucks';
import { convertToDomain } from '@/lib/utils/foodTruckUtils';

import { useFoodTruckFinder } from '@/hooks/useFoodTruckFinder';
import { useFoodTruckNavigation } from '@/hooks/useFoodTruckNavigation';
import FoodTruckListLayout from '../components/FoodTruckListLayout';
import DiscoverTruckCard from '@/components/discover/DiscoverTruckCard';
import { CuisineExploration } from '@/components/cuisine/CuisineExploration';
import { useFiltersStore } from '@/lib/stores/useFiltersStore';
import { cachingService } from '@/lib/services/cachingService';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import { CUISINE_TYPES, type CuisineType } from '@/lib/filters/types';
import InfoTruckCardWithData from '@/components/info/InfoTruckCardWithData';
import { fetchEventsAndSpecials, type EventRecord } from '../events_and_specials/lib/data/events';
import { Event as EventType } from '@/lib/types';
import { logError } from '@/lib/logging';
import { generateSlug } from '@/lib/utils/slug';

interface DiscoverFoodTrucksProps {
  readonly onTruckSelect?: (truck: FoodTruck) => void;
  readonly onBack?: () => void;
}

const CategorySection = ({
  title,
  icon: Icon,
  trucks,
  onTruckSelect,
  gradientClass,
  overrideTitle,
}: Readonly<{
  title?: string;
  icon: React.ComponentType<{ className?: string }>;
  trucks: FoodTruck[];
  onTruckSelect: (truck: FoodTruck) => void;
  gradientClass?: string;
  overrideTitle?: React.ReactNode;
}>) => {
  if (trucks.length === 0) return null;

  const containerClass = gradientClass
    ? `space-y-2 rounded-2xl p-4 border border-white/10 bg-gradient-to-br ${gradientClass}`
    : 'space-y-2';

  return (
    <div className={containerClass}>
      {overrideTitle ||
        (title && (
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-[var(--primary-color)]" />
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
        ))}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {trucks.map((truck) => (
          <DiscoverTruckCard
            key={truck.id}
            truck={truck}
            onSelect={onTruckSelect}
            variant="discover"
          />
        ))}
      </div>
    </div>
  );
};

// Use shared isViableTruck from foodTruckHelpers with conversion to domain type
const checkViableTruck = (truck: FoodTruck): boolean => {
  return isViableTruck(convertToDomain(truck));
};

const getNewestTrucks = (trucks: FoodTruck[], limit = 10): FoodTruck[] => {
  return [...trucks]
    .sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, limit);
};

type CategoryFilterType = 'all' | 'new' | 'cuisines' | 'events';

export default function DiscoverFoodTrucks({ onTruckSelect, onBack }: DiscoverFoodTrucksProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilterType>('all');

  // Use the proper hook for fetching food truck data from Supabase
  // Use filteredTrucks instead of trucks to respect radius/distance filtering
  const { filteredTrucks, loading, loadNearbyTrucks } = useFoodTruckFinder();
  // Type assertion to avoid unsafe assignment errors
  const typedTrucks: FoodTruck[] = filteredTrucks;

  // Since the hook doesn't return error/refetch, we'll manage these ourselves
  const [error, setError] = useState<string | null>(null);

  // State for events data
  const [eventsData, setEventsData] = useState<EventType[]>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // Use filters store to manage cuisine selections
  const { cuisines, toggleCuisine } = useFiltersStore();

  // Get authentication state for rate limiting
  const { user } = useSafeAuth();

  // Function to refetch data with caching and rate limiting
  const refetch = async () => {
    // Check rate limits before making requests
    if (!cachingService.canMakeRequest(user?.id)) {
      setError('Rate limit exceeded. Please wait before trying again.');
      return;
    }

    setError(null);
    try {
      // Try to get cached data first
      const cachedTrucks = await cachingService.getCachedFoodTrucks();

      if (cachedTrucks && cachedTrucks.length > 0) {
        // Use cached data immediately for better UX
        // logDebug('Using cached food trucks data');  // Removed console log
        // Note: We can't directly set trucks from the hook, but this shows the pattern
      }

      // Trigger data reload by calling loadNearbyTrucks from the hook
      await loadNearbyTrucks();

      // Cache the new data after successful fetch
      if (typedTrucks.length > 0) {
        // Convert FoodTruck[] to FoodTruckDomain[] for caching
        const domainTrucks: FoodTruckDomain[] = typedTrucks.map((truck) => ({
          ...truck,
          description: truck.description ?? '',
          created_at: truck.created_at ?? undefined,
          updated_at: truck.updated_at ?? undefined,
          current_location: truck.current_location ?? null,
          operating_hours: truck.operating_hours ?? null,
          menu_items: truck.menu_items ?? [],
          cuisine_type: truck.cuisine_type ?? [],
          data_quality_score: truck.data_quality_score ?? undefined,
          verification_status: truck.verification_status ?? undefined,
          last_synced_at: truck.last_synced_at ?? undefined,
          average_rating: truck.average_rating ?? 0,
          review_count: truck.review_count ?? undefined,
        }));
        await cachingService.setCachedFoodTrucks(domainTrucks);
      }
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to reload food trucks');
    }
  };

  // Fetch events data when the component mounts or when events tab is selected
  const fetchEvents = () => {
    try {
      setEventsLoading(true);
      const fetchedEventRecords = fetchEventsAndSpecials('events');

      // Helper function to get event title from potentially undefined fields
      const getEventTitle = (record: EventRecord): string => {
        if (typeof record.name === 'string') return record.name;
        if (typeof record.title === 'string') return record.title;
        return 'Event';
      };

      // Convert EventRecord[] to EventType[] - currently returns empty array so no conversion needed
      const fetchedEvents: EventType[] = fetchedEventRecords.map((record: EventRecord) => {
        return {
          id: record.id ?? '',
          food_truck_id: record.food_truck_id ?? '',
          title: getEventTitle(record),
          description: record.description ?? 'Event description',
          date: record.start_time
            ? new Date(record.start_time).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          time: record.start_time
            ? (new Date(record.start_time).toISOString().split('T')[1]?.slice(0, 5) ?? '00:00')
            : '00:00',
          location: record.location ? { address: record.location } : { address: 'Location TBD' },
          created_at: record.created_at,
          updated_at: record.updated_at,
        };
      });
      setEventsData(fetchedEvents);
      setEventsError(null);
    } catch (error_) {
      setEventsError('Failed to fetch events');
      logError('Error fetching events:', error_); // Keep this error log for important errors
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCategory === 'events') {
      fetchEvents();
    }
  }, [selectedCategory]);

  // Filter viable trucks for category display
  const viableTrucks = typedTrucks
    .filter((truck) => checkViableTruck(truck))
    .filter((truck) => !isTestTruckName(truck.name));

  const { handleTruckSelect } = useFoodTruckNavigation({ onTruckSelect, onBack });

  // Filter trucks based on selected category
  const getFilteredTrucks = (): FoodTruck[] => {
    if (selectedCategory === 'new') {
      return viableTrucks.slice(0, 3);
    }
    return viableTrucks;
  };

  return (
    <DiscoverContent
      loading={loading}
      error={error}
      onRetry={() => {
        void refetch();
      }}
      loadingMessage="Discovering food trucks..."
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      viableTrucks={viableTrucks}
      handleTruckSelect={handleTruckSelect}
      eventsData={eventsData}
      eventsLoading={eventsLoading}
      eventsError={eventsError}
      fetchEvents={fetchEvents}
      cuisines={cuisines}
      _toggleCuisine={(cuisine: string) => {
        // Only allow valid cuisine types from the predefined list
        if (CUISINE_TYPES.includes(cuisine as CuisineType)) {
          toggleCuisine(cuisine as CuisineType); // Proper type assertion after validation
        }
      }}
      getFilteredTrucks={getFilteredTrucks}
    />
  );
}

const DiscoverContent = ({
  loading,
  error,
  onRetry,
  loadingMessage,
  selectedCategory,
  setSelectedCategory,
  viableTrucks,
  handleTruckSelect,
  eventsData,
  eventsLoading,
  eventsError,
  fetchEvents,
  _toggleCuisine,
  getFilteredTrucks,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  loadingMessage: string;
  selectedCategory: CategoryFilterType;
  setSelectedCategory: (category: CategoryFilterType) => void;
  viableTrucks: FoodTruck[];
  handleTruckSelect: (truck: FoodTruck) => void;
  eventsData: EventType[];
  eventsLoading: boolean;
  eventsError: string | null;
  fetchEvents: () => void;
  cuisines: string[];
  _toggleCuisine: (cuisine: string) => void;
  getFilteredTrucks: () => FoodTruck[];
}) => {
  const [viewCuisine, setViewCuisine] = useState<string | null>(null);
  const [cuisineSearchTerm, setCuisineSearchTerm] = useState('');

  useEffect(() => {
    setViewCuisine(null);
    setCuisineSearchTerm(''); // Reset search when category changes
  }, [selectedCategory]);

  // Render category sections based on selected category - moved this function inside the component
  const renderCategoryContent = () => {
    switch (selectedCategory) {
      case 'all': {
        return (
          <>
            <CategorySection
              title="All Trucks"
              icon={MapPin}
              trucks={viableTrucks}
              onTruckSelect={handleTruckSelect}
              overrideTitle={
                <div className="flex items-center gap-2 mb-1 pt-1">
                  <MapPin className="w-5 h-5 text-[var(--primary-color)]" />
                  <h2 className="text-xl font-bold text-white">
                    {viableTrucks.length} Trucks Nearby
                  </h2>
                </div>
              }
            />
          </>
        );
      }
      case 'new': {
        return (
          <CategorySection
            icon={ClockIcon}
            trucks={getNewestTrucks(viableTrucks)}
            onTruckSelect={handleTruckSelect}
          />
        );
      }
      case 'cuisines': {
        if (viewCuisine) {
          const cuisineTrucks = viableTrucks.filter((t) => {
            const cTypes = (t.cuisine_type || []).map((c) => c?.toLowerCase().trim());
            const target = viewCuisine.toLowerCase();

            return (
              cTypes.some((c) => {
                if (!c) return false;
                // Check for bidirectional inclusion to handle cases like "Coffee" matching "Coffee & Tea"
                // or "Asian Fusion" matching "Asian"
                return c === target || c.includes(target) || target.includes(c);
              }) ||
              (target === 'american' && cTypes.includes('burgers')) ||
              (target === 'mexican' && cTypes.includes('tacos'))
            );
          });

          return (
            <div className="space-y-2 pb-4">
              <Button
                variant="ghost"
                onClick={() => setViewCuisine(null)}
                className="pl-0 text-white hover:text-white/80 h-auto p-0 mb-2"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back to Cuisines
              </Button>
              <CategorySection
                title={`${viewCuisine} Trucks`}
                icon={Grid3X3}
                trucks={cuisineTrucks}
                onTruckSelect={handleTruckSelect}
              />
            </div>
          );
        }
        return null;
      }
      case 'events': {
        return (
          <div>
            {eventsLoading && (
              <div className="text-center py-12">
                <div className="text-white text-lg mb-2">Loading events...</div>
              </div>
            )}

            {eventsError && (
              <div className="text-center py-12">
                <div className="text-red-500 text-lg mb-2">{eventsError}</div>
                <Button onClick={fetchEvents}>Retry</Button>
              </div>
            )}

            {!eventsLoading && !eventsError && eventsData.length === 0 && (
              <div className="text-center py-12">
                <div className="text-white text-lg mb-2">No Upcoming Events</div>
                <div className="text-gray-400 text-sm">
                  Check back later for upcoming food truck events and specials
                </div>
                <Link
                  href="/events"
                  className="mt-4 inline-block text-sm text-white underline hover:text-white/80"
                >
                  Browse all events →
                </Link>
              </div>
            )}

            {!eventsLoading && !eventsError && eventsData.length > 0 && (
              <div className="grid grid-cols-1 gap-2">
                {eventsData.map((event) => {
                  // Find the corresponding truck for this event
                  const truckForEvent = viableTrucks.find((t) => t.id === event.food_truck_id);

                  if (truckForEvent) {
                    // Use our data-connected component that fetches schedules and events
                    return (
                      <div
                        key={event.id}
                        className="bg-white/5 border border-white/10 rounded-lg p-4"
                      >
                        <InfoTruckCardWithData truck={truckForEvent} />
                      </div>
                    );
                  }

                  // Fallback if we can't find the truck
                  const fallbackTruck: FoodTruck = {
                    id: event.food_truck_id,
                    name: event.title,
                    description: event.description ?? 'Special event from a food truck',
                    cuisine_type: ['Event'],
                    average_rating: 0,
                    review_count: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    data_quality_score: 0,
                    is_active: true,
                    last_synced_at: new Date().toISOString(),
                    verification_status: 'pending',
                    current_location: null,
                    operating_hours: null,
                    contact_info: {},
                    social_media: {},
                    menu_items: [],
                    source_urls: [],
                    source_url: '',
                    specialties: [],
                    price_range: '$',
                    // Add missing properties required by FoodTruck type
                    street_address: null,
                    city: null,
                    state: null,
                    zip: null,
                    default_lat: null,
                    default_lng: null,
                    live_gps_lat: null,
                    live_gps_lng: null,
                    live_gps_accuracy: null,
                    live_gps_timestamp: null,
                    status: 'offline',
                    live_location: null,
                    city_location: null,
                    exact_location: null,
                    last_updated_at: null,
                    user_id: null,
                    is_claimed: null,
                    claimed_at: null,
                    claimed_by: null,
                    claim_verification_method: null,
                    owner_id: null,
                    location_geog: null,
                    verification_documents: null,
                    verification_notes: null,
                    verification_requested_at: null,
                    verified_at: null,
                    verified_by: null,
                    schedule: [],
                    scheduled_locations: [],
                    review_status: null,
                    slug: generateSlug(event.title || 'unknown-truck'),
                    view_count: 0,
                  };

                  return (
                    <div
                      key={event.id}
                      className="bg-white/5 border border-white/10 rounded-lg p-4"
                    >
                      <InfoTruckCardWithData truck={fallbackTruck} />
                    </div>
                  );
                })}
                <Link
                  href="/events"
                  className="block py-3 text-center text-sm text-white underline hover:text-white/80"
                >
                  Browse all events →
                </Link>
              </div>
            )}
          </div>
        );
      }
      default: {
        return (
          <div className="text-center py-12">
            <div className="text-white text-lg mb-2">No food trucks found</div>
            <div className="text-gray-400 text-sm">Try selecting a different category</div>
          </div>
        );
      }
    }
  };

  return (
    <FoodTruckListLayout
      loading={loading}
      error={error}
      onRetry={onRetry}
      loadingMessage={loadingMessage}
    >
      {/* Category Tabs - reduced padding since navigation is via bottom nav */}
      <div className="border-b border-white/10 bg-[#181111]/95 backdrop-blur-sm relative z-10">
        <div className="p-1">
          <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="mobile"
              onClick={() => setSelectedCategory('all')}
              className={
                selectedCategory === 'all'
                  ? 'bg-red-600 text-white'
                  : 'text-white border-white/20 hover:bg-white/10'
              }
            >
              All
            </Button>
            <Button
              variant={selectedCategory === 'new' ? 'default' : 'outline'}
              size="mobile"
              onClick={() => setSelectedCategory('new')}
              className={
                selectedCategory === 'new'
                  ? 'bg-red-600 text-white'
                  : 'text-white border-white/20 hover:bg-white/10'
              }
            >
              <ClockIcon className="w-4 h-4 mr-1" />
              New
            </Button>
            <Button
              variant={selectedCategory === 'cuisines' ? 'default' : 'outline'}
              size="mobile"
              onClick={() => setSelectedCategory('cuisines')}
              className={
                selectedCategory === 'cuisines'
                  ? 'bg-red-600 text-white'
                  : 'text-white border-white/20 hover:bg-white/10'
              }
            >
              <Grid3X3 className="w-4 h-4 mr-1" />
              Cuisines
            </Button>
            <Button
              variant={selectedCategory === 'events' ? 'default' : 'outline'}
              size="mobile"
              onClick={() => setSelectedCategory('events')}
              className={
                selectedCategory === 'events'
                  ? 'bg-red-600 text-white'
                  : 'text-white border-white/20 hover:bg-white/10'
              }
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Events
            </Button>
          </div>
        </div>

        {/* Floating Cuisine Search Bar - Only visible on Cuisines tab and not viewing specific cuisine */}
        {selectedCategory === 'cuisines' && !viewCuisine && (
          <div className="px-2 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                className="flex h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10 w-full text-white border-white/20 focus:border-[var(--primary-color)]"
                placeholder="Search cuisines..."
                type="text"
                value={cuisineSearchTerm}
                onChange={(e) => setCuisineSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto pb-[144px]">
        <div className="px-2 pb-4 pt-[2px] space-y-2">
          {/* Category Sections */}
          {selectedCategory === 'cuisines' && !viewCuisine ? (
            <CuisineExploration
              trucks={viableTrucks}
              onCuisineSelect={(c) => setViewCuisine(c)}
              selectedCuisines={[]}
              showSearch={false}
              searchTerm={cuisineSearchTerm}
            />
          ) : (
            renderCategoryContent()
          )}

          {selectedCategory !== 'cuisines' &&
            selectedCategory !== 'events' &&
            getFilteredTrucks().length === 0 && (
              <div className="text-center py-12">
                <div className="text-white text-lg mb-2">No food trucks found</div>
                <div className="text-gray-400 text-sm">Try selecting a different category</div>
              </div>
            )}
        </div>
      </div>
    </FoodTruckListLayout>
  );
};
