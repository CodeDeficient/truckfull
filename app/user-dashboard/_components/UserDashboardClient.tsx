'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { FavoritesService } from '@/lib/services/favorites';
import { UserDashboardTabs } from './UserDashboardTabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/ui/sections/DashboardLayout';
import { logError, logWarning } from '@/lib/logging';

interface FoodTruck {
  id: string;
  slug?: string;
  name: string;
  cuisine_type: string[];
  current_location: {
    address?: string;
    city?: string;
    state?: string;
  };
  average_rating?: number;
  review_count?: number;
}

interface UserProfile {
  id: string;
  role: string;
  full_name?: string | null;
  email?: string | null;
}

export default function UserDashboardClient() {
  const [profile, setProfile] = useState<UserProfile | undefined>();
  const [favoriteTrucks, setFavoriteTrucks] = useState<FoodTruck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const router = useRouter();

  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true);

        const {
          data: { user },
          error: userError,
        } = await getSupabase().auth.getUser();
        if (userError || !user) {
          router.push('/?auth=open');
          return;
        }

        const { data: profileData, error: profileError } = await getSupabase()
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          setError('Failed to load profile');
          return;
        }

        setProfile(profileData as UserProfile);

        const { data: favoriteTrucksData, error: favoriteTrucksError } =
          await FavoritesService.getFavoritedTrucks(user.id);

        if (favoriteTrucksError) {
          logWarning('Could not load favorite trucks:', favoriteTrucksError);
          setFavoriteTrucks([]);
        } else {
          const normalized: FoodTruck[] = (favoriteTrucksData ?? [])
            .filter(
              (t: unknown): t is Record<string, unknown> =>
                Object.prototype.toString.call(t) === '[object Object]',
            )
            .map((t) => {
              const idVal = (t as { id?: unknown }).id;
              const slugVal = (t as { slug?: unknown }).slug;
              const nameVal = (t as { name?: unknown }).name;
              const cuisineVal = (t as { cuisine_type?: unknown }).cuisine_type;
              const locVal = (t as { current_location?: unknown }).current_location;
              const avgVal = (t as { average_rating?: unknown }).average_rating;
              const reviewsVal = (t as { review_count?: unknown }).review_count;
              return {
                id: typeof idVal === 'string' ? idVal : '',
                slug: typeof slugVal === 'string' && slugVal.length > 0 ? slugVal : undefined,
                name: typeof nameVal === 'string' ? nameVal : 'Unknown Truck',
                cuisine_type: Array.isArray(cuisineVal) ? (cuisineVal as string[]) : [],
                current_location:
                  Object.prototype.toString.call(locVal) === '[object Object]'
                    ? (locVal as { address?: string; city?: string; state?: string })
                    : {},
                average_rating: typeof avgVal === 'number' ? avgVal : undefined,
                review_count: typeof reviewsVal === 'number' ? reviewsVal : undefined,
              } satisfies FoodTruck;
            });
          setFavoriteTrucks(normalized);
        }
      } catch (error_) {
        setError('Failed to load dashboard data');
        logError('Dashboard error:', error_);
      } finally {
        setLoading(false);
      }
    }

    void loadUserData();
  }, [router]);

  async function handleSignOut() {
    await getSupabase().auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (typeof error === 'string' && error.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <DashboardLayout
      icon={<Heart className="h-8 w-8" />}
      title="User Dashboard"
      welcomeName={profile?.full_name ?? profile?.email ?? 'User'}
      onSignOut={() => {
        void handleSignOut();
      }}
    >
      {/* Main Content */}
      <UserDashboardTabs
        favoriteTrucks={favoriteTrucks}
        onViewTruck={(path) => {
          router.push(path);
        }}
      />
    </DashboardLayout>
  );
}
