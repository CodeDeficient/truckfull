'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { NoDataState } from './NoDataState';
import { QuickActionsSection } from './QuickActionsSection';
import { StatisticsCardsSection } from './StatisticsCardsSection';
import { AdditionalLinksSection } from './AdditionalLinksSection';
import { DashboardData } from './types';

export default function AdminDashboardClient() {
  const [dashboardData, setDashboardData] = useState<DashboardData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get the Supabase client and session
        const supabase = getSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setError('Unauthorized access. Please log in as an administrator.');
          setLoading(false);
          return;
        }

        // Include credentials and authorization header for authentication
        const response = await fetch('/api/dashboard', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (!response.ok) {
          if (response.status === 401) {
            setError('Unauthorized access. Please log in as an administrator.');
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = (await response.json()) as DashboardData | { error: string };
        if ('error' in data && data.error) {
          throw new Error(data.error);
        }
        setDashboardData(data as DashboardData);
      } catch (error_) {
        setError(error_ instanceof Error ? error_.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  if (error != undefined) {
    return <ErrorState error={error} />;
  }

  if (!dashboardData) {
    return <NoDataState />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="text-sm text-muted-foreground">Welcome back, Administrator</div>
      </div>

      <QuickActionsSection />
      <StatisticsCardsSection dashboardData={dashboardData} />
      <AdditionalLinksSection />
    </div>
  );
}
