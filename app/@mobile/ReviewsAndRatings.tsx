import React from 'react';
import NavigationBar from '@/components/ui/organisms/NavigationBar';
import GenericBottomNavigation from '@/components/ui/organisms/GenericBottomNavigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ReviewsList from './reviews_and_ratings/_components/ReviewsList';
import FilterOptions from './reviews_and_ratings/_components/FilterOptions';

export default function Reviews_and_ratings() {
  const bottomNavItems = [
    {
      id: 'map',
      icon: <span className="material-symbols-outlined">map</span>,
      label: 'Map',
      href: '#',
    },
    {
      id: 'reviews',
      icon: <span className="material-symbols-outlined">reviews</span>,
      label: 'Reviews',
      isActive: true,
    },
    {
      id: 'profile',
      icon: <span className="material-symbols-outlined">person</span>,
      label: 'Profile',
      href: '#',
    },
  ];

  return (
    <div
      className="relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-hidden"
     
    >
      <NavigationBar title="Reviews & Ratings" />

      <div className="flex-grow p-4 pt-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Your Reviews</h1>
          <p className="text-white/60 text-sm">Manage and view your food truck reviews</p>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Filter Reviews</h2>
          <FilterOptions />
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-white">Recent Reviews</h2>
            <span className="text-sm text-white/60">5 reviews</span>
          </div>

          <ReviewsList />
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Write a Review</h2>
          <Card className="p-4 bg-white/5 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
              <div>
                <h3 className="font-semibold text-white">Taco Loco</h3>
                <p className="text-sm text-white/60">Last visited: Today</p>
              </div>
            </div>
            <Button size="mobile" className="w-full bg-[#ea2a2a] hover:bg-[#d42222] text-white">
              Write Review
            </Button>
          </Card>
        </div>
      </div>

      <GenericBottomNavigation items={bottomNavItems} />
    </div>
  );
}
