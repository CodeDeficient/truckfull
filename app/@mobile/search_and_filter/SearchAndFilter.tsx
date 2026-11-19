import React, { useState } from 'react';
import NavigationBar from '@/components/ui/organisms/NavigationBar';
import GenericBottomNavigation from '@/components/ui/organisms/GenericBottomNavigation';
import { Card } from '@/components/ui/card';
import ListItem from '@/components/ui/molecules/ListItem';
import { AnimatePresence } from 'framer-motion';
import { LiveSearchList } from '@/components/search/LiveSearchList';
import { FoodTruckDomain } from '@/lib/types';
import { logDebug } from '@/lib/logging';

export default function Search_and_filter() {
  // Extracted data to constants to reduce function size
  const bottomNavItems = [
    {
      id: 'discover',
      icon: <span className="material-symbols-outlined">explore</span>,
      label: 'Discover',
      href: '/@mobile/discover_food_trucks',
    },
    {
      id: 'list',
      icon: <span className="material-symbols-outlined">format_list_bulleted</span>,
      label: 'List',
      href: '/@mobile/food_truck_list',
      isActive: true,
    },
    {
      id: 'favorites',
      icon: <span className="material-symbols-outlined">favorite_border</span>,
      label: 'Favorites',
      href: '/@mobile/favorites',
    },
    {
      id: 'profile',
      icon: <span className="material-symbols-outlined">person_outline</span>,
      label: 'Profile',
      href: '/@mobile/user_profile',
    },
  ];

  const filterButtons = [
    { label: 'All', active: true },
    { label: 'Rating 4.5+', active: false },
    { label: 'Nearby', active: false },
    { label: 'Price Range', active: false },
  ];

  const featuredTrucks = [
    {
      id: 1,
      name: 'Taco Loco',
      cuisine: 'Authentic Mexican',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCc9F0yhx28Jj543VFY5XMxHgOpvAdwyeXnoNixx1pAJMdHalzUizfh6sKQn4ZIr6wzUC1AmOitu6le08si5sE-Cn1xwOR7Q2boDItclTq-X8D8pzVCSLE4QtnrAVaoTHS50gLRSsloUiPnLGOnGs8cW8cd6x1HV_9iUa277B7cyKm8GRUnQBjsn95PeEcH0YwUZaa5VMxa11M7XAJJtSsZfpyhtQd9wjziqLVFk3T7xAyvwG0RpPOnNwCCTKgrGbsHJY_vuFqau6Ql',
    },
    {
      id: 2,
      name: 'Burger Barn',
      cuisine: 'Gourmet Burgers',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAm0DqeXG_LRHSGG5S556XtvWk7aJ98i2OB3urkbZa3Mk6IBprmd7Oezc3i7cbgdASadTq7mYtTijZOFNVxvfwEm-RuJvOFEhYeN2vwOLm0vFebr5pjp-BGa7Itk5ruBhCBl4qBhrNZM5iyBxfprm9RdW25fFNP44QQA2M-Z9HSbVekBdPPNShlGbrynuBR3hwW4L8b-Rw1c9oHXshPx9YWSIxWsZlQSKrXsxlBpZ09hqvSAgQT7HHm8-klbu82zUZ-TLMTOCwzrUge',
    },
    {
      id: 3,
      name: 'Pizza Palace',
      cuisine: 'Wood-fired pizzas',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCZtGKZfF_3Pe-MIdId3fuQnrOlcsC0sHOZ-tbIV81zJmIkDAnm2dNWDo5KjEuS-OeFMiagV9Tj9Xxhf2qJ74GRCvvbenBMSB9n9pRhB7eaqPoHHsiTB-0tjB0HRoS2NsLDKvqVQT5Wtd_IxSNVxalow3Qk6KNtBbRSDg7PCTksR37QON59ADsQ0kYI1Q9KQbg0Lg1-Yg2WJIE2MCUajxrAkawwx3w_YIxV99MDtqaL6b7ZyGMlepFQRb0S8d85iJjr8OY-CTNKmaSE',
    },
  ];

  const allTrucks: FoodTruckDomain[] = [
    {
      id: '1',
      name: 'The Curry Corner',
      description: 'Indian cuisine',
      created_at: undefined,
      updated_at: undefined,
      current_location: null,
      operating_hours: null,
      menu_items: [],
      cuisine_type: ['Indian'],
      price_range: undefined,
      specialties: undefined,
      data_quality_score: undefined,
      verification_status: undefined,
      source_url: undefined,
      last_synced_at: undefined,
      average_rating: 4.5,
      review_count: undefined,
      contact_info: {},
      social_media: {},
      is_active: true,
      image_url:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuB-hwYS2vqi2hLJkgOMLslROC6b_X3k5ro9qUw1EYRoSHg3Wd8ZsgzAnap8FpYyDXzbp0BGJoYChcXl7WzBkFuBddm1mBy6Qj9g7341TzQ7GwR5bR6dzBBCJIN5upCbZRst-nTEJasxytkTGsXifdbI9N3TBg6aBxf7iyvZUDiQI277VGOoMisYi_0Z39rMzokjNtpWkBJgD7CjZyjK-BNKhCee_32fDmo_v4PMe_nPJbMDb6ysqIDYTm7pG-EgtXbaf8lJdvZJcbqF',
    },
    {
      id: '2',
      name: 'The Donut Den',
      description: 'Desserts',
      created_at: undefined,
      updated_at: undefined,
      current_location: null,
      operating_hours: null,
      menu_items: [],
      cuisine_type: ['Desserts'],
      price_range: undefined,
      specialties: undefined,
      data_quality_score: undefined,
      verification_status: undefined,
      source_url: undefined,
      last_synced_at: undefined,
      average_rating: 4.2,
      review_count: undefined,
      contact_info: {},
      social_media: {},
      is_active: true,
      image_url:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAoozkSzttSpwrLUYSjRuIj6ucSg9oZIMqvSiq8sudqsSiPXVpQU3UWAetcWg8s1swHFiBq_fOo7OrZjHg1G1UGgNNbJf3wNbOHXj-fefchguDMtUgmRz67setq-9QKe4kL7oS__ynu-exajO6yAcpp11oir3AFvf3wyf9reFMHiAYgeTKOe3V0iowUuaTL24BGJ86KnyNPi_r2qnTk4NtAZLaq8rvnLfBuNBs6TRKn9WUc8bE0IkqS42w8PxbQtWkMzXDJVntYiSfl',
    },
    {
      id: '3',
      name: 'The Smoothie Shack',
      description: 'Healthy options',
      created_at: undefined,
      updated_at: undefined,
      current_location: null,
      operating_hours: null,
      menu_items: [],
      cuisine_type: ['Healthy'],
      price_range: undefined,
      specialties: undefined,
      data_quality_score: undefined,
      verification_status: undefined,
      source_url: undefined,
      last_synced_at: undefined,
      average_rating: 4.8,
      review_count: undefined,
      contact_info: {},
      social_media: {},
      is_active: true,
      image_url:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDdVdsadtT7IpKFA57kvbrqZRzQiIPg9HcbAQxoIVR314jDm97Q38HFaPX223g9EmAyQL1-lZCPxYlMdFiVuI8iV_Xr_O_7iljcvEiccnvOtAwwBnkqx-Hz9m1I2Jn2zRhfEhw86Nf0Bwtc_K63qWt8n9Fp399DycJD0DuY5Fgn7mknntmGlXbr02kjIDgd7g4XfG6qd0YlfQmmslOrPbegd9zwIvQVHKYoiolDCgg6R3J9J2cYYe5WnptL4dEkzxVTTur9QN6VdqJi',
    },
  ];

  // Helper functions to render different sections
  const renderFilterButtons = () => {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filterButtons.map((filter, index) => (
          <button
            key={index}
            className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-sm font-medium text-white transition-colors duration-300 ${
              filter.active
                ? 'bg-[var(--primary-color)]'
                : 'glassmorphism hover:bg-[var(--primary-color)]'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    );
  };

  const renderFeaturedTrucks = () => {
    return (
      <div>
        <h2 className="px-4 pb-3 pt-5 text-2xl font-bold tracking-tight text-white">
          Featured Trucks
        </h2>
        <div className="flex gap-4 overflow-x-auto px-4 pb-4 [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {featuredTrucks.map((truck) => (
            <div key={truck.id} className="w-72 shrink-0">
              <div
                className="relative h-40 w-full rounded-xl bg-cover bg-center"
                style={{ backgroundImage: `url("${truck.image}")` }}
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <h3 className="text-lg font-bold text-white">{truck.name}</h3>
                  <p className="text-sm text-gray-300">{truck.cuisine}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAllTrucks = () => {
    return (
      <div>
        <h2 className="px-4 pb-3 pt-5 text-2xl font-bold tracking-tight text-white">All Trucks</h2>
        <div className="space-y-3 px-4">
          {allTrucks.map((truck) => (
            <Card key={truck.id} className="glassmorphism">
              <ListItem
                title={truck.name}
                subtitle={`${truck.cuisine_type?.[0] || 'Unknown'} • ${truck.average_rating || 0} ★ • ${truck.description}`}
                image={truck.image_url}
                imageAlt={truck.name}
                rightContent={
                  <button className="text-white">
                    <span className="material-symbols-outlined"> chevron_right </span>
                  </button>
                }
              />
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <SearchAndFilterContent
      renderFilterButtons={renderFilterButtons}
      renderFeaturedTrucks={renderFeaturedTrucks}
      renderAllTrucks={renderAllTrucks}
      bottomNavItems={bottomNavItems}
      allTrucks={allTrucks}
    />
  );
}

const SearchAndFilterContent = ({
  renderFilterButtons,
  renderFeaturedTrucks,
  renderAllTrucks,
  bottomNavItems,
  allTrucks,
}: {
  renderFilterButtons: () => React.ReactNode;
  renderFeaturedTrucks: () => React.ReactNode;
  renderAllTrucks: () => React.ReactNode;
  bottomNavItems: Array<{
    id: string;
    icon: React.ReactNode;
    label: string;
    href: string;
    isActive?: boolean;
  }>;
  allTrucks: FoodTruckDomain[];
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  logDebug('Search query:', searchQuery);

  const filteredTrucks = allTrucks.filter((truck) =>
    truck.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      className="relative flex size-full min-h-screen flex-col justify-between group/design-root overflow-x-hidden"
      style={{
        zIndex: 1,
        backgroundImage:
          'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCZh3aBDnCF_724vIl1-ba0w8_6ipS6QFS-xkfSAkx7F3tOaprsf21HftRn1tZBHWSKjf3y6GNPWT9Mz8tqgyvgzL9Ng8u0TdpKxHsw6EE96nSlpsxATYnz0q2bZhRQN5S1dG1rqGxpR8U_BO9RmihOu4xuvXYcU9K99l0Kqpnl1UcOlNOkM7Dk1YPELc4Y4IEwtdjgyCY9deDqQEGRww9XoTTBOpW6eksyzOpLJOgPF9uaG_9G-wpsIk3-ZzN37OQuGYqC3I7AzmMh")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 flex-grow">
        <NavigationBar title="TruckFull" />

        <main className="p-4 space-y-6">
          <div className="relative">
            <input
              className="form-input w-full rounded-full border-transparent bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)]"
              placeholder="Find food trucks, cuisines..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              search
            </span>
          </div>

          {renderFilterButtons()}
          {renderFeaturedTrucks()}
          {renderAllTrucks()}
        </main>
      </div>

      <AnimatePresence>
        {searchQuery && (
          <LiveSearchList
            trucks={filteredTrucks}
            loading={false}
            onTruckSelect={() => {}}
            userLocation={null}
          />
        )}
      </AnimatePresence>

      <GenericBottomNavigation items={bottomNavItems} />
    </div>
  );
};
