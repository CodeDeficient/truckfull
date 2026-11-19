/**
 * Organizer Dashboard Page
 * WBS: 6.3.1, 6.3.6
 *
 * Main dashboard for event organizers.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Star, Loader2, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { OrganizerSignUpForm } from './_components/OrganizerSignUpForm';
import { EventsList, type Event } from './_components/EventsList';
import { CreateEventForm, type EventData } from './_components/CreateEventForm';
import { OrganizerSidebar, type DashboardView } from './_components/OrganizerSidebar';
import { OrganizerHeader } from './_components/OrganizerHeader';
import { VerificationView } from './_components/VerificationView';
import { ApplicationsView } from './_components/ApplicationsView';

type EventModalState = { mode: 'create' } | { mode: 'edit'; event: Event } | null;

interface Organizer {
  id: string;
  business_name: string;
  contact_email: string;
  verification_status: 'unverified' | 'pending' | 'verified';
  rating_avg: number | null;
  rating_count: number;
}

export default function OrganizerDashboardClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [showVerificationBanner, setShowVerificationBanner] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [eventModalState, setEventModalState] = useState<EventModalState>(null);

  const loadOrganizer = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await getSupabase().auth.getUser();

      if (!user) {
        // If no user, redirect to login
        router.push('/login?redirect=/organizer');
        return;
      }
      setAuthUser(user);

      // Use the API route which handles the correct table (event_organizers) and permissions
      const response = await fetch('/api/organizer');

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login?redirect=/organizer');
          return;
        }
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();

      // key from API is 'organizer'
      if (data.organizer) {
        setOrganizer(data.organizer as Organizer);
      } else {
        setOrganizer(null);
      }
    } catch (error) {
      console.error('Error loading organizer:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadOrganizer();
  }, [loadOrganizer]);

  const handleSignUpComplete = () => {
    loadOrganizer();
  };

  const handleSignOut = async () => {
    await getSupabase().auth.signOut();
    router.push('/');
  };

  const handleVerifyClick = () => {
    setCurrentView('verify');
  };

  if (loading) {
    return (
      <div className="flex bg-background h-screen w-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show sign-up form if not an organizer
  if (!organizer) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Become an Event Organizer</h1>
            <p className="text-muted-foreground">
              List your food truck events and connect with vendors
            </p>
          </div>
          <OrganizerSignUpForm onComplete={handleSignUpComplete} />
        </div>
      </div>
    );
  }

  const handleCreateClick = () => {
    setEventModalState({ mode: 'create' });
  };

  const handleEditEvent = (event: EventData) => {
    const organizerEvent: Event = {
      id: event.id || '',
      name: event.name,
      description: event.description,
      start_date: event.start_date,
      end_date: event.end_date,
      location_data: {
        city: event.location_data?.city,
        state: event.location_data?.state,
      },
      vendor_fee: event.vendor_fee ?? 0,
      max_vendors: event.max_vendors,
      status: 'draft',
      applications: {
        pending: 0,
        accepted: 0,
        total: 0,
      },
    };
    setEventModalState({ mode: 'edit', event: organizerEvent });
  };

  const handleModalClose = () => {
    setEventModalState(null);
  };

  const handleEventSaved = () => {
    handleModalClose();
    setCurrentView('events');
    setRefreshKey((prev) => prev + 1);
  };

  const renderContent = () => {
    if (eventModalState?.mode === 'create' || eventModalState?.mode === 'edit') {
      return (
        <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold">
              {eventModalState.mode === 'create' ? 'New Event' : 'Edit Event'}
            </h3>
            <Button variant="ghost" onClick={handleModalClose}>
              Cancel
            </Button>
          </div>
          <CreateEventForm
            onSuccess={handleEventSaved}
            initialData={eventModalState.mode === 'edit' ? eventModalState.event : undefined}
          />
        </div>
      );
    }

    // Modal for Preview is rendered at root level, not replacing content
    // See return statement update below

    switch (currentView) {
      case 'events': {
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">My Events</h2>
                <p className="text-muted-foreground">Manage your food truck events.</p>
              </div>
              <Button onClick={handleCreateClick}>
                <Plus className="w-4 h-4 mr-2" /> Create New Event
              </Button>
            </div>
            <EventsList key={refreshKey} onEdit={handleEditEvent} />
          </div>
        );
      }

      case 'applications': {
        return <ApplicationsView />;
      }

      case 'verify': {
        return <VerificationView status={organizer.verification_status} />;
      }

      default: {
        return (
          <div className="space-y-8">
            {/* Header Content */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{organizer.business_name}</h2>
                <div className="flex items-center gap-3 mt-1.5">
                  <Badge
                    variant={organizer.verification_status === 'verified' ? 'default' : 'secondary'}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full"
                  >
                    {organizer.verification_status === 'verified' && (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    {organizer.verification_status === 'pending' && (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    {organizer.verification_status !== 'verified' &&
                      organizer.verification_status !== 'pending' && (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                    <span className="capitalize">{organizer.verification_status}</span>
                  </Badge>
                  {organizer.rating_avg && (
                    <span className="flex items-center text-sm font-medium text-amber-600 dark:text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                      {organizer.rating_avg.toFixed(1)}{' '}
                      <span className="text-muted-foreground ml-1 font-normal">
                        ({organizer.rating_count})
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateClick} className="shadow-sm">
                  <Plus className="w-4 h-4 mr-2" /> Create Event
                </Button>
              </div>
            </div>

            {/* Verification Warning - Updated to link to verify page */}
            {organizer.verification_status === 'unverified' && showVerificationBanner && (
              <div
                id="verification-banner"
                className="relative rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 animate-in slide-in-from-top-2"
              >
                <button
                  onClick={() => setShowVerificationBanner(false)}
                  className="absolute top-2 right-2 p-1 text-amber-600/60 hover:text-amber-600 hover:bg-amber-600/10 rounded-full transition-colors"
                  aria-label="Dismiss verification warning"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-between gap-4 pr-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-amber-500/20 rounded-full">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                        Verification Required
                      </h4>
                      <p className="text-sm text-amber-800/80 dark:text-amber-200/80 max-w-xl">
                        To publish paid events and collect vendor fees, you must verify your
                        identity. This process helps keep our marketplace safe.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white border-0 shadow-sm shrink-0"
                    onClick={() => setCurrentView('verify')}
                  >
                    Verify Identity
                  </Button>
                </div>
              </div>
            )}

            <EventsList key={refreshKey} onEdit={handleEditEvent} />
          </div>
        );
      }
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <OrganizerSidebar
        className="hidden md:block"
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <OrganizerHeader
          user={organizer}
          authUser={authUser}
          onSignOut={handleSignOut}
          currentView={currentView}
          onViewChange={setCurrentView}
          onVerifyClick={handleVerifyClick}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">{renderContent()}</main>
      </div>
    </div>
  );
}
