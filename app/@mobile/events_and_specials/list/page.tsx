'use client';
import React, { useState, useEffect } from 'react';
import Footer from '../_components/Footer';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';
import { fetchEventsAndSpecials, subscribeToEventsAndSpecials } from '../lib/data/events';
import { Event, Special } from '@/lib/types';
import EventCard from './_components/EventCard';
import SpecialCard from './_components/SpecialCard';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from '@/components/navigation/IntentLink';
import { logError } from '@/lib/logging';

const EventsAndSpecialsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to setup events subscription
  const setupEventsSubscription = () => {
    return subscribeToEventsAndSpecials('events', (newEvents) => {
      setEvents(processEventData(newEvents));
    });
  };

  // Helper function to setup specials subscription
  const setupSpecialsSubscription = () => {
    return subscribeToEventsAndSpecials('specials', (newSpecials) => {
      setSpecials(processSpecialData(newSpecials));
    });
  };

  // Helper function to process event data
  const processEventData = (data: unknown[]): Event[] => {
    if (data && Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      if (
        firstItem &&
        typeof firstItem === 'object' &&
        'id' in firstItem &&
        'food_truck_id' in firstItem
      ) {
        return data as Event[];
      }
    }
    return [];
  };

  // Helper function to process special data
  const processSpecialData = (data: unknown[]): Special[] => {
    if (data && Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      if (
        firstItem &&
        typeof firstItem === 'object' &&
        'id' in firstItem &&
        'food_truck_id' in firstItem
      ) {
        return data as Special[];
      }
    }
    return [];
  };

  useEffect(() => {
    const getInitialData = () => {
      try {
        setLoading(true);
        // fetchEventsAndSpecials is synchronous, no need for Promise.all or await
        const initialEvents = fetchEventsAndSpecials('events');
        const initialSpecials = fetchEventsAndSpecials('specials');

        // Process events data
        const processedEvents = processEventData(initialEvents);
        setEvents(processedEvents);

        // Process specials data (always empty for now)
        const processedSpecials = processSpecialData(initialSpecials);
        setSpecials(processedSpecials);

        setError(null);
      } catch (error_) {
        setError('Failed to fetch initial data.');
        logError('Failed to fetch initial data', error_);
      } finally {
        setLoading(false);
      }
    };

    void getInitialData();

    // Setup subscriptions
    const eventsSubscription = setupEventsSubscription();
    const specialsSubscription = setupSpecialsSubscription();

    return () => {
      eventsSubscription.unsubscribe();
      specialsSubscription.unsubscribe();
    };
  }, []);

  // Function to render content based on loading, error, and data states
  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center">
          <p>Loading...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="text-center text-red-500">
          <p>{error}</p>
        </div>
      );
    }

    return (
      <>
        <section id="events" className="mb-12">
          <h2 className="mb-6 text-3xl font-semibold text-gray-800">Upcoming Events</h2>
          {events.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No upcoming events found.</p>
          )}
        </section>

        <Separator className="my-8" />

        <section id="specials">
          <h2 className="mb-6 text-3xl font-semibold text-gray-800">Today's Specials</h2>
          {specials.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {specials.map((special) => (
                <SpecialCard key={special.id} special={special} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No specials available today.</p>
          )}
        </section>
      </>
    );
  };

  return <EventsAndSpecialsPageContent renderContent={renderContent} />;
};

const EventsAndSpecialsPageContent = ({
  renderContent,
}: {
  renderContent: () => React.ReactNode;
}) => {
  return (
    <div className="container mx-auto flex min-h-screen flex-col bg-gray-50 px-4 py-8">
      <CommonPageHead
        title="Events & Specials"
        subtitle="Find the latest events and specials from your favorite food trucks."
      />

      <main className="flex-grow">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Latest Events & Specials
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Don't miss out on these delicious deals and exciting events!
          </p>
        </div>

        <div className="mb-8">
          <Link href="/@mobile/events_and_specials/create">
            <Button>Create New Event or Special</Button>
          </Link>
        </div>

        {renderContent()}
      </main>

      <Footer />
    </div>
  );
};

export default EventsAndSpecialsPage;
