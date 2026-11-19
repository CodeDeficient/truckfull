'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { NoTrucksGuidance } from './NoTrucksGuidance';
import { DashboardHeader } from './dashboard/header';
import { DashboardSidebar } from './dashboard/sidebar';
import { OverviewPage } from './OverviewPage';
import { TrucksTable } from './dashboard/TrucksTable';
import { UpgradeModal } from '@/components/owner/UpgradeModal';
import GoLiveModal from '@/components/owner/GoLiveModal';
import GPSLocationUpdater from '@/components/owner/GPSLocationUpdater';
import { useRouter, usePathname } from 'next/navigation';
import MenuManagementSection from '@/components/owner/MenuManagementSection';
import { ScheduleTab } from './ScheduleTab';
import { SettingsTab } from './SettingsTab';
import { AnalyticsTab } from './AnalyticsTab';
import { BillingTab } from './BillingTab';
import { EventsTab } from './EventsTab';
import { FieldGuideTab } from './FieldGuideTab';
import { AutomaticUpdatesClient } from './AutomaticUpdatesClient';
import { RelevanceReviewTab } from './RelevanceReviewTab';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import type { FoodTruckDomain, FoodTruckOperatingHours, UserProfileDomain } from '@/lib/types';
import { fromFoodTruckRow, fromProfileRow } from '@/lib/mappers/domain';
import type { Database } from '@/lib/database.remote.types';
import { useTierAccess } from '@/hooks/useTierAccess';
import { useGPSLocation } from '@/hooks/useGpsLocation';
import { fetchOwnerTrucks } from '@/lib/services/ownerTrucks.client';
import { logDebug, logError, logWarning } from '@/lib/logging';

export default function EnhancedOwnerDashboardClient({
  foundingData,
}: {
  readonly foundingData?: {
    readonly remaining: number;
    readonly total: number;
    readonly taken: number;
  };
}) {
  const [profile, setProfile] = useState<UserProfileDomain | undefined>();
  const [myTrucks, setMyTrucks] = useState<FoodTruckDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [isGoLiveModalOpen, setIsGoLiveModalOpen] = useState(false);
  const [_selectedTruckId, setSelectedTruckId] = useState<string | undefined>();
  const [liveTruckIds, setLiveTruckIds] = useState<Set<string>>(new Set());
  const [showTrialToast, setShowTrialToast] = useState(false);

  // Helper function to update truck location in state
  const updateTruckLocation = (
    truckId: string,
    lat: number,
    lng: number,
    setLive: boolean = false,
  ) => {
    setMyTrucks((prevTrucks) =>
      prevTrucks.map((t) =>
        t.id === truckId
          ? { ...t, current_location: { lat, lng, address: t.current_location?.address } }
          : t,
      ),
    );

    if (setLive) {
      setLiveTruckIds((prev) => new Set(prev).add(truckId));
    }
  };

  const router = useRouter();
  const pathname = usePathname();
  const { tier } = useTierAccess();
  const {
    getCurrentLocation,
    latitude,
    longitude,
    accuracy,
    loading: gpsLoading,
    error: gpsError,
  } = useGPSLocation();

  useEffect(() => {
    if (globalThis.location.hash === '#_=_') {
      history.replaceState(null, '', globalThis.location.pathname + globalThis.location.search);
    }
    void loadOwnerData(router, setProfile, setMyTrucks, setError, setLoading, setLiveTruckIds);
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    if (params.get('trial_started') === 'true') {
      setShowTrialToast(true);
      const url = new URL(globalThis.location.href);
      url.searchParams.delete('trial_started');
      globalThis.history.replaceState({}, '', url.toString());
      const timer = globalThis.setTimeout(() => setShowTrialToast(false), 6000);
      return () => globalThis.clearTimeout(timer);
    }
  }, []);

  async function loadOwnerData(
    router: ReturnType<typeof useRouter>,
    setProfile: React.Dispatch<React.SetStateAction<UserProfileDomain | undefined>>,
    setMyTrucks: React.Dispatch<React.SetStateAction<FoodTruckDomain[]>>,
    setError: React.Dispatch<React.SetStateAction<string | undefined>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setLiveTruckIds?: React.Dispatch<React.SetStateAction<Set<string>>>,
  ) {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await getSupabase().auth.getUser();
      if (userError || !user) {
        router.push('/?auth=open');
        return;
      }

      // Get user profile
      const { data: profileData, error: profileError } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setError('Failed to load profile');
        return;
      }

      // Normalize and set profile to domain
      setProfile(fromProfileRow(profileData as Database['public']['Tables']['profiles']['Row']));

      let trucksData: Awaited<ReturnType<typeof fetchOwnerTrucks>>;
      try {
        trucksData = await fetchOwnerTrucks();
      } catch (error_) {
        logWarning('Could not load trucks:', error_ instanceof Error ? error_.message : error_);
        setMyTrucks([]);
        return;
      }

      setMyTrucks(trucksData.map((row) => fromFoodTruckRow(row)));

      if (setLiveTruckIds) {
        const liveTrucks = trucksData.filter((row) => row.status === 'live').map((row) => row.id);
        logDebug('Initializing live trucks:', liveTrucks);
        setLiveTruckIds(new Set(liveTrucks));
      }
    } catch (error_) {
      setError('Failed to load dashboard data');
      logError('Dashboard error:', error_);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await getSupabase().auth.signOut();
    router.push('/');
  }

  const handleGoLiveConfirm = async (truckId: string) => {
    logDebug(`[GO LIVE] Starting for truck ID: ${truckId}`);

    try {
      // Get current GPS location
      logDebug('[GO LIVE] Requesting GPS location...', {
        hookState: { latitude, longitude, accuracy, loading: gpsLoading, error: gpsError },
      });
      const locationResult = await getCurrentLocation();

      // Check if we got valid coordinates from the function call
      logDebug('[GO LIVE] Location result:', {
        result: locationResult,
        resultType: typeof locationResult,
        isNull: locationResult === null,
        isUndefined: locationResult === undefined,
        latitude: locationResult?.latitude,
        longitude: locationResult?.longitude,
        accuracy: locationResult?.accuracy,
      });

      if (!locationResult || locationResult.latitude == null || locationResult.longitude == null) {
        logError('[GO LIVE] Failed to get GPS coordinates', {
          locationResult,
          gpsError,
          checkResults: {
            isLocationResultNull: !locationResult,
            isLatitudeNull: locationResult?.latitude == null,
            isLongitudeNull: locationResult?.longitude == null,
          },
        });
        alert(
          `GPS Error: Could not get your location.\n\nLatitude: ${locationResult?.latitude ?? 'null'}\nLongitude: ${locationResult?.longitude ?? 'null'}\nError: ${gpsError ?? 'Unknown error'}\n\nPlease allow location permissions and try again.`,
        );
        return;
      }

      // Extract coordinates from the result
      const { latitude: lat, longitude: lng, accuracy: acc } = locationResult;

      logDebug('[GO LIVE] Making API call with:', { lat, lng, acc });

      // Update the truck's location and status to live
      const response = await fetch(`/api/trucks/${truckId}/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat,
          lng,
          operation: 'go_live',
          accuracy: acc,
        }),
      });

      logDebug('[GO LIVE] API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        logError('[GO LIVE] API error:', errorText);
        throw new Error(`Failed to go live: ${response.status} - ${errorText}`);
      }

      const updatedTruck = await response.json();
      logDebug('[GO LIVE] Truck updated successfully:', updatedTruck);

      // Update local state to reflect the change
      setMyTrucks((prevTrucks) =>
        prevTrucks.map((truck) =>
          truck.id === truckId
            ? {
                ...truck,
                status: 'live',
                live_location: {
                  lat,
                  lng,
                  address: truck.current_location?.address,
                },
                current_location: {
                  lat,
                  lng,
                  address: truck.current_location?.address,
                },
              }
            : truck,
        ),
      );

      // Update the live truck IDs state
      logDebug('[GO LIVE] Adding truck to live set:', truckId);
      setLiveTruckIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(truckId);
        logDebug('[GO LIVE] Live truck IDs:', [...newSet]);
        return newSet;
      });

      alert('✅ Successfully went live!');
    } catch (error) {
      logError('[GO LIVE] Error:', error);
      alert(
        `Failed to go live:\n\n${error instanceof Error ? error.message : String(error)}\n\nCheck the console for more details.`,
      );
    }
  };

  const handleCloseShop = async (truckId: string) => {
    logDebug(`Closing shop for truck ID: ${truckId}`);

    try {
      // Close shop - sets status to offline, reverts to default location
      const response = await fetch(`/api/trucks/${truckId}/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'close_shop', // No coordinates needed - reverts to default
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to close shop');
      }

      const updatedTruck = await response.json();
      logDebug('Truck closed successfully:', updatedTruck);

      // Update local state to reflect offline status
      setMyTrucks((prevTrucks) =>
        prevTrucks.map((truck) =>
          truck.id === truckId
            ? {
                ...truck,
                status: 'offline',
                // Keep current_location as-is when going offline
              }
            : truck,
        ),
      );

      // Update local state to remove from live trucks
      logDebug('Removing truck from live set:', truckId);
      setLiveTruckIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(truckId);
        logDebug('Live truck IDs after close:', [...newSet]);
        return newSet;
      });
    } catch (error) {
      logError('Error closing shop:', error);
      alert('Failed to close shop. Please try again.');
    }
  };

  const handleOperatingHoursChange = (truckId: string, operatingHours: FoodTruckOperatingHours) => {
    setMyTrucks((prev) =>
      prev.map((t) => (t.id === truckId ? { ...t, operating_hours: operatingHours } : t)),
    );
  };

  if (loading) {
    return (
      <div className="flex h-[100dvh] overflow-hidden">
        <DashboardSidebar className="hidden md:block" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader
            user={profile}
            onSignOut={() => void handleSignOut()}
            onUpgradeClick={() => setUpgradeModalOpen(true)}
          />
          <main className="flex-1 flex items-center justify-center p-6 bg-background">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading dashboard...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[100dvh] overflow-hidden">
        <DashboardSidebar className="hidden md:block" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader
            user={profile}
            onSignOut={() => void handleSignOut()}
            onUpgradeClick={() => setUpgradeModalOpen(true)}
          />
          <main className="flex-1 flex items-center justify-center p-6 bg-background">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md w-full text-center">
              <h3 className="font-semibold text-destructive">Error</h3>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
              <button
                onClick={() => router.refresh()}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Try Again
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Determine content based on current path
  const renderContent = () => {
    switch (pathname) {
      case '/owner-dashboard/trucks': {
        return (
          <div className="max-w-5xl mx-auto">
            <TrucksTable
              trucks={myTrucks}
              liveTruckIds={liveTruckIds}
              onGoLiveClick={(truckId) => {
                setSelectedTruckId(truckId);
                setIsGoLiveModalOpen(true);
              }}
              onCloseShopClick={(truckId) => void handleCloseShop(truckId)}
            />
          </div>
        );
      }
      case '/owner-dashboard/location': {
        return (
          <div className="max-w-xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Update Truck Location</h2>
              <p className="text-muted-foreground mt-1">
                Use your device's GPS to update your truck's current location.
              </p>
            </div>
            {myTrucks.length === 0 ? (
              <NoTrucksGuidance />
            ) : (
              <div className="space-y-4">
                {myTrucks.map((truck) => (
                  <GPSLocationUpdater
                    key={truck.id}
                    truck={truck}
                    onLocationUpdate={async (lat, lng, _address) => {
                      try {
                        const response = await fetch(`/api/trucks/${truck.id}/location`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            lat,
                            lng,
                            status: 'live',
                          }),
                        });

                        if (!response.ok) {
                          const result = await response.json();
                          throw new Error(result.error || 'Failed to update truck location');
                        }

                        updateTruckLocation(truck.id, lat, lng, true);
                      } catch (error) {
                        logError('Error updating truck location:', error);
                        throw error;
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      }
      case '/owner-dashboard/menu': {
        const truck = myTrucks?.[0];
        return (
          <div className="max-w-7xl mx-auto">
            {truck ? (
              <MenuManagementSection truckId={truck.id} />
            ) : (
              <NoTrucksGuidance />
            )}
          </div>
        );
      }
      case '/owner-dashboard/schedule': {
        return (
          <div className="mx-auto w-full max-w-7xl px-3 sm:px-6">
            <ScheduleTab
              trucks={myTrucks}
              onOperatingHoursChange={handleOperatingHoursChange}
            />
          </div>
        );
      }
      case '/owner-dashboard/settings': {
        return (
          <div className="max-w-4xl mx-auto">
            <SettingsTab trucks={myTrucks} userTier={profile?.subscription_tier ?? 'free'} />
          </div>
        );
      }
      case '/owner-dashboard/analytics': {
        return (
          <div className="max-w-7xl mx-auto space-y-6">
            <AnalyticsTab trucks={myTrucks} />
          </div>
        );
      }
      case '/owner-dashboard/billing': {
        return (
          <div className="max-w-4xl mx-auto">
            <BillingTab foundingData={foundingData} />
          </div>
        );
      }
      case '/owner-dashboard/events': {
        return (
          <div className="h-full">
            <EventsTab
              truckId={myTrucks?.[0]?.id}
              userId={profile?.id}
              userTier={profile?.subscription_tier ?? 'free'}
            />
          </div>
        );
      }
      case '/owner-dashboard/field-guide': {
        return (
          <div className="max-w-[1920px] mx-auto h-full">
            <FieldGuideTab trucks={myTrucks} />
          </div>
        );
      }
      case '/owner-dashboard/facebook': {
        return (
          <div className="max-w-4xl mx-auto">
            <AutomaticUpdatesClient trucks={myTrucks} />
          </div>
        );
      }
      case '/owner-dashboard/relevance-review': {
        return (
          <div className="max-w-5xl mx-auto">
            <RelevanceReviewTab />
          </div>
        );
      }
      default: {
        // Overview / owner-dashboard
        return (
          <OverviewPage
            profile={profile}
            trucks={myTrucks}
            liveTruckIds={liveTruckIds}
            onGoLiveClick={(truckId) => {
              setSelectedTruckId(truckId);
              setIsGoLiveModalOpen(true);
            }}
            onCloseShopClick={(truckId) => void handleCloseShop(truckId)}
          />
        );
      }
    }
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {showTrialToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">Thanks for trying TruckFull!</p>
              <p className="text-green-100">Enjoy Pro for the next 30 days for free!</p>
            </div>
            <button
              type="button"
              onClick={() => setShowTrialToast(false)}
              className="shrink-0 text-green-200 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <DashboardSidebar className="hidden md:block" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          user={profile}
          onSignOut={() => void handleSignOut()}
          onUpgradeClick={() => setUpgradeModalOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-2 md:p-1 bg-background">{renderContent()}</main>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        currentTier={tier}
      />

      {/* Go Live Modal */}
      <GoLiveModal
        isOpen={isGoLiveModalOpen}
        onClose={() => setIsGoLiveModalOpen(false)}
        onConfirm={handleGoLiveConfirm}
        trucks={myTrucks}
        initialTruckId={_selectedTruckId}
      />

      {/* Profile Modal - controlled by zustand store */}
      <ProfileModal />

      {/* Settings Modal - controlled by zustand store */}
      <SettingsModal />
    </div>
  );
}
