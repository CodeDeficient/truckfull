'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { DashboardHeader } from '../../_components/dashboard/header';
import { DashboardSidebar } from '../../_components/dashboard/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, MapPin, Clock, Star, Edit, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { FoodTruckDomain, UserProfileDomain } from '@/lib/types';
import { fromFoodTruckRow, fromProfileRow } from '@/lib/mappers/domain';
import type { Database } from '@/lib/database.remote.types';
import { useTierAccess } from '@/hooks/useTierAccess';
import { logError } from '@/lib/logging';
import { NoTrucksGuidance } from '../../_components/NoTrucksGuidance';
import { fetchOwnerTrucks } from '@/lib/services/ownerTrucks.client';

const LAT_LNG_PAIR = /^-?\d+\.\d+,\s*-?\d+\.\d+$/;

export default function MyTrucksClient() {
  const [profile, setProfile] = useState<UserProfileDomain | undefined>();
  const [trucks, setTrucks] = useState<FoodTruckDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { tier, maxTrucks } = useTierAccess();

  useEffect(() => {
    void loadTrucks();
  }, []);

  async function loadTrucks() {
    try {
      const supabase = getSupabase();

      // Get user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/?auth=open');
        return;
      }

      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single<Database['public']['Tables']['profiles']['Row']>();

      if (profileError || !profileData) {
        logError('Profile error:', profileError);
        return;
      }

      setProfile(fromProfileRow(profileData));

      const ownerTrucks = await fetchOwnerTrucks();
      const mappedTrucks = ownerTrucks.map((row) => fromFoodTruckRow(row));

      setTrucks(mappedTrucks);
    } catch (error) {
      logError('Load trucks error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your trucks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader user={profile} onSignOut={() => router.push('/?auth=open')} />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">My Trucks</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your food trucks and their details
                </p>
              </div>
              {/* Show Add Truck if below limit, Upgrade button if at limit */}
              {trucks.length < maxTrucks && (
                <Button
                  className="gap-2"
                  onClick={() => {
                    // Navigate to truck adding flow
                    globalThis.location.href = '/owner-dashboard/trucks/add';
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add New Truck
                </Button>
              )}
              {trucks.length >= maxTrucks && tier === 'free' && (
                <Button
                  className="gap-2"
                  onClick={() => (globalThis.location.href = '/owner-dashboard/upgrade')}
                >
                  <Crown className="h-4 w-4 text-amber-500" />
                  Upgrade for More Trucks
                </Button>
              )}
            </div>

            {trucks.length === 0 ? (
              <NoTrucksGuidance />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trucks.map((truck) => (
                  <Card
                    key={truck.id}
                    className="border-border/40 bg-card/50 backdrop-blur-sm hover:border-accent/50 transition-colors"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{truck.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {truck.cuisine_type?.join(', ') || 'No cuisine type'}
                          </CardDescription>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            truck.is_active
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-gray-500/10 text-gray-500'
                          }`}
                        >
                          {truck.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Display permanent address from dedicated fields */}
                      {(() => {
                        // Build permanent address from dedicated fields
                        const addressParts = [
                          truck.street_address,
                          truck.city,
                          truck.state,
                          truck.zip,
                        ].filter(Boolean);

                        let permanentAddress =
                          addressParts.length > 0 ? addressParts.join(', ') : undefined;

                        // Only fall back to current_location.address if it's NOT GPS coordinates
                        // GPS coords look like "33.473049, -81.966399" (numbers, comma, numbers)
                        if (!permanentAddress && truck.current_location?.address) {
                          const isGPSCoords = LAT_LNG_PAIR.test(truck.current_location.address);
                          if (!isGPSCoords) {
                            permanentAddress = truck.current_location.address;
                          }
                        }

                        // If still no address, show coordinates as fallback
                        if (!permanentAddress) {
                          const lat = truck.default_lat ?? truck.current_location?.lat;
                          const lng = truck.default_lng ?? truck.current_location?.lng;
                          if (lat && lng) {
                            permanentAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                          }
                        }

                        if (permanentAddress) {
                          return (
                            <div className="flex items-start gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-[#00d4ff] mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="text-muted-foreground">{permanentAddress}</span>
                                {/* Show live GPS indicator if truck is live */}
                                {truck.status === 'live' &&
                                  truck.live_gps_lat &&
                                  truck.live_gps_lng && (
                                    <div className="text-xs text-green-500 mt-1 flex items-center gap-1">
                                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                      Currently Live
                                    </div>
                                  )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {truck.operating_hours && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-green-500" />
                          <span className="text-muted-foreground">
                            Open today {truck.operating_hours.monday?.open || 'Closed'}
                          </span>
                        </div>
                      )}

                      {truck.average_rating !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-muted-foreground">
                            {truck.average_rating.toFixed(1)} ({truck.review_count || 0} reviews)
                          </span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => router.push(`/owner-dashboard/edit/${truck.id}`)}
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
