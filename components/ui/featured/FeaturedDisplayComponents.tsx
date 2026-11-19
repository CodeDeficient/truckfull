'use client';

import React from 'react';
import { Star, TrendingUp, Calendar } from 'lucide-react';
import {
  FeaturedTruckCard,
  FeaturedTrendingCard,
  FeaturedContentSection,
} from '@/components/featured';
import type { FeaturedContent } from '@/lib/services/featuredService';
import { convertToDomain } from '@/lib/utils/foodTruckUtils';
import { useState } from 'react';
import { WaitlistModal } from './WaitlistModal';

export const LoadingContent = () => (
  <div className="flex items-center justify-center h-screen bg-[#181111]">
    <div className="text-white">Loading featured content...</div>
  </div>
);

export const ErrorContent = ({ error }: { error: string | null }) => (
  <div className="flex items-center justify-center h-screen bg-[#181111]">
    <div className="text-white">{error ?? 'Failed to load featured content'}</div>
  </div>
);

export const FeaturedContentSections = ({
  featuredContent,
  onTruckClick,
  onOfferRedeem: _onOfferRedeem,
  onEventDetails: _onEventDetails,
}: {
  featuredContent: FeaturedContent;
  onTruckClick?: (id: string) => void;
  onOfferRedeem?: (id: string) => void;
  onEventDetails?: (id: string) => void;
}) => {
  const [activeWaitlistRole, setActiveWaitlistRole] = useState<
    'foodie' | 'truck_owner' | 'event_manager' | null
  >(null);

  const getModalProps = () => {
    switch (activeWaitlistRole) {
      case 'foodie': {
        return {
          title: 'Foodie Waitlist',
          description: 'Be the first to know about local food truck events!',
        };
      }
      case 'truck_owner': {
        return {
          title: 'Truck Owner Events',
          description: 'Get notified about catering opportunities and festivals.',
        };
      }
      case 'event_manager': {
        return {
          title: 'Event Manager Partners',
          description: 'Partner with us to host food truck events.',
        };
      }
      default: {
        return { title: '', description: '' };
      }
    }
  };

  const modalProps = getModalProps();

  return (
    <main className="p-3 space-y-4">
      {/* Featured Trucks Section */}
      <FeaturedContentSection
        title="Featured Trucks"
        icon={<Star className="w-5 h-5 text-[#ea2a2a]" />}
        gradientClass="from-[#ea2a2a]/20 to-purple-900/20"
      >
        <div className="space-y-2">
          {featuredContent.featuredTrucks.map((truck) => (
            <FeaturedTruckCard
              key={truck.id}
              id={truck.id}
              name={truck.name ?? 'Unknown Truck'}
              cuisine={
                Array.isArray(truck.cuisine_type)
                  ? truck.cuisine_type.join(', ')
                  : (truck.cuisine_type ?? 'Various Cuisine')
              }
              image={truck.image_url}
              truck={convertToDomain(truck)}
              onClick={() => {
                if (onTruckClick) {
                  onTruckClick(truck.id);
                }
              }}
            />
          ))}
        </div>
      </FeaturedContentSection>

      {/* Special Offers Section - Temporarily disabled per user request */}
      {}
      {/* <FeaturedContentSection
        title="Special Offers"
        icon={<Gift className="w-5 h-5 text-blue-400" />}
        gradientClass="from-blue-900/20 to-cyan-900/20"
      >
        <div className="space-y-3">
          {featuredContent.featuredOffers.map(offer => (
            <FeaturedOfferCard
              key={offer.id}
              id={offer.id}
              title={offer.title}
              description={offer.description}
              badgeText={offer.badgeText}
              badgeColor={offer.badgeColor}
              validUntil={offer.validUntil}
              onRedeemClick={() => onOfferRedeem ? onOfferRedeem(offer.id) : undefined}
            />
          ))}
        </div>
      </FeaturedContentSection> */}

      {/* Trending Section */}
      <FeaturedContentSection
        title="Trending Now"
        icon={<TrendingUp className="w-5 h-5 text-orange-400" />}
        gradientClass="from-orange-900/20 to-red-900/20"
      >
        <div className="grid grid-cols-2 gap-2">
          {featuredContent.trendingItems.map((item) => (
            <FeaturedTrendingCard
              key={item.id}
              id={item.id}
              name={item.name}
              rank={item.rank}
              image={item.image}
              truck={item.truck ? convertToDomain(item.truck) : undefined}
              onClick={() => {
                if (onTruckClick) {
                  onTruckClick(item.id);
                }
              }}
            />
          ))}
        </div>
      </FeaturedContentSection>

      {/* Events Section - Coming Soon */}
      <FeaturedContentSection
        title="Upcoming Events"
        icon={<Calendar className="w-5 h-5 text-purple-400" />}
        gradientClass="from-purple-900/20 to-pink-900/20"
      >
        <div className="text-center py-6 space-y-4">
          <div className="text-4xl">🎉</div>
          <h3 className="text-xl font-bold text-white">Coming Soon</h3>
          <p className="text-gray-400 text-sm px-4">
            Food truck events, festivals, and meetups are on the way! Sign up to be notified when
            events launch in your area.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <button
              onClick={() => setActiveWaitlistRole('foodie')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              🍔 I'm a Foodie
            </button>
            <button
              onClick={() => setActiveWaitlistRole('truck_owner')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              🚚 I Own a Truck
            </button>
            <button
              onClick={() => setActiveWaitlistRole('event_manager')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              📅 I'm an Event Manager
            </button>
          </div>
        </div>
      </FeaturedContentSection>

      {activeWaitlistRole && (
        <WaitlistModal
          isOpen={true}
          onClose={() => setActiveWaitlistRole(null)}
          waitlistRole={activeWaitlistRole}
          title={modalProps.title}
          description={modalProps.description}
        />
      )}
    </main>
  );
};

export const FeaturedHeader = () => (
  <header className="sticky top-0 z-10 bg-black/50 backdrop-blur-lg">
    <div className="flex items-center p-4 pb-2 justify-between">
      <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
        Featured
      </h2>
    </div>
  </header>
);
