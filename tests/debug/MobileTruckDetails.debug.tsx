import React, { useMemo, useState } from 'react';
import {
  Facebook,
  Instagram,
  Twitter,
  Globe,
  ArrowLeft,
  Loader2,
  Navigation,
  X,
} from 'lucide-react';
import type { FoodTruck, FoodTruckDomain } from '@/lib/types';
import { formatPrice, formatTime12Hour } from '@/lib/utils/foodTruckHelpers';
import { convertToDomain } from '@/lib/utils/foodTruckUtils';
import { TRUCK_FALLBACK_IMAGE } from '@/lib/utils/photoTransform';
import { ClaimTruckModal } from '@/components/owner/ClaimTruckModal';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface MobileTruckDetailsProps {
  truck: FoodTruckDomain;
  onBack?: () => void;
  onClose?: () => void;
  showBack?: boolean;
}

export const MobileTruckDetails: React.FC<MobileTruckDetailsProps> = ({
  truck,
  onBack,
  onClose,
  showBack = true,
}) => {
  // Debug logging to identify which component is causing the issue
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    console.log('Image type:', typeof Image);
    console.log('Button type:', typeof Button);
    console.log('ClaimTruckModal type:', typeof ClaimTruckModal);
    console.log('Facebook icon type:', typeof Facebook);
    console.log('Instagram icon type:', typeof Instagram);
    console.log('Twitter icon type:', typeof Twitter);
    console.log('Globe icon type:', typeof Globe);
    console.log('ArrowLeft icon type:', typeof ArrowLeft);
    console.log('Loader2 icon type:', typeof Loader2);
    console.log('Navigation icon type:', typeof Navigation);
    console.log('X icon type:', typeof X);
  }

  const [activeTab, setActiveTab] = useState<'hours' | 'menu' | 'contact'>('hours');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // State for tracking expanded menu categories
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  const toggleCategory = (index: number) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [index.toString()]: !prev[index.toString()],
    }));
  };

  // Truck is already FoodTruckDomain
  const truckDomain = truck;
  const rawTier = (truck as any).subscription_tier;
  const ownerTier =
    rawTier && typeof rawTier === 'string' && rawTier.trim() !== '' ? rawTier : undefined;

  // --- Logic copied from EnhancedTruckPopup ---
  const { openStatus, currentHours, nextOpenInfo } = useMemo(() => {
    const now = new Date();
    const day = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    const currentHours = truck.operating_hours?.[day];

    const hasOwner = !!truckDomain.owner_id;
    let openStatus: boolean | null;

    if (hasOwner) {
      if (ownerTier && ['pro'].includes(ownerTier.toLowerCase())) {
        const now = new Date();
        const day = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
        const hoursToCheck = truckDomain.operating_hours?.[day];

        if (!hoursToCheck || hoursToCheck.closed || !hoursToCheck.open || !hoursToCheck.close) {
          openStatus = false;
        } else {
          const [openHours, openMinutes] = hoursToCheck.open.split(':').map(Number);
          const [closeHours, closeMinutes] = hoursToCheck.close.split(':').map(Number);
          const openTime = new Date(now);
          openTime.setHours(openHours, openMinutes, 0, 0);
          const closeTime = new Date(now);
          closeTime.setHours(closeHours, closeMinutes, 0, 0);
          const currentTime = now.getTime();
          openStatus = currentTime >= openTime.getTime() && currentTime <= closeTime.getTime();
        }
      } else {
        openStatus = null;
      }
    } else {
      openStatus = null;
    }

    let isCurrentlyOpen = false;
    let hoursForDisplay = null;

    if (currentHours && !currentHours.closed && currentHours.open && currentHours.close) {
      const [openHours, openMinutes] = currentHours.open.split(':').map(Number);
      const [closeHours, closeMinutes] = currentHours.close.split(':').map(Number);
      const openTime = new Date(now);
      openTime.setHours(openHours, openMinutes, 0, 0);
      const closeTime = new Date(now);
      closeTime.setHours(closeHours, closeMinutes, 0, 0);
      const currentTime = now.getTime();

      if (currentTime >= openTime.getTime() && currentTime <= closeTime.getTime()) {
        isCurrentlyOpen = true;
        hoursForDisplay = `${formatTime12Hour(currentHours.open)} - ${formatTime12Hour(currentHours.close)}`;
      } else if (currentTime < openTime.getTime()) {
        const dayName = day.charAt(0).toUpperCase() + day.slice(1);
        return {
          openStatus,
          isOpen: openStatus === null ? false : openStatus,
          currentHours: null,
          nextOpenInfo: {
            day: dayName,
            date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            hours: `${formatTime12Hour(currentHours.open)} - ${formatTime12Hour(currentHours.close)}`,
            isToday: true,
          },
        };
      }
    }

    if (isCurrentlyOpen) {
      return {
        openStatus,
        isOpen: openStatus === null ? false : openStatus,
        currentHours: hoursForDisplay,
        nextOpenInfo: null,
      };
    }

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayIndex = now.getDay();

    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (todayIndex + i) % 7;
      const nextDay = days[nextDayIndex];
      const nextHours = truck.operating_hours?.[nextDay];

      if (nextHours && !nextHours.closed && nextHours.open && nextHours.close) {
        const nextOpenDate = new Date(now);
        nextOpenDate.setDate(now.getDate() + i);
        const dayName = nextDay.charAt(0).toUpperCase() + nextDay.slice(1);
        return {
          openStatus,
          isOpen: openStatus === null ? false : openStatus,
          currentHours: null,
          nextOpenInfo: {
            day: dayName,
            date: nextOpenDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            hours: `${formatTime12Hour(nextHours.open)} - ${formatTime12Hour(nextHours.close)}`,
            isToday: false,
          },
        };
      }
    }

    return {
      openStatus,
      isOpen: openStatus === null ? false : openStatus,
      currentHours: null,
      nextOpenInfo: null,
    };
  }, [truck, truckDomain, ownerTier]);

  const profileImageUrl = useMemo(() => {
    return truck.social_media?.photo_url ?? null;
  }, [truck.social_media]);

  const upcomingActiveDays = useMemo(() => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayIndex = new Date().getDay();
    const result = [];

    for (let i = 0; i < 7; i++) {
      const dayIndex = (todayIndex + i) % 7;
      const day = days[dayIndex];
      const hours = truck.operating_hours?.[day];

      if (!hours?.closed && hours?.open && hours?.close) {
        const dayName = day.charAt(0).toUpperCase() + day.slice(1);
        result.push({
          day: dayName,
          hours: `${formatTime12Hour(hours.open)} - ${formatTime12Hour(hours.close)}`,
        });
        if (result.length >= 3) break;
      }
    }
    return result;
  }, [truck.operating_hours]);

  const cuisineTypes = useMemo(() => {
    if (truck.cuisine_type && truck.cuisine_type.length > 0) {
      return truck.cuisine_type.join(', ');
    }
    return Array.isArray(truck.cuisine_type) ? truck.cuisine_type.join(', ') : 'Food Truck';
  }, [truck.cuisine_type]);

  // Deduplicate website logic
  const availableWebsite = (truck.social_media?.website as string) || truck.contact_info?.website;

  return (
    <div className="flex flex-col flex-1 min-h-0 text-white">
      {/* Header */}
      <div className="flex flex-col px-3 pt-2 pb-3 border-b border-zinc-800 shrink-0 bg-neutral-900">
        {/* Back button row - only show when showBack is true */}
        {showBack && (
          <div className="flex w-full justify-between items-start">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8 -ml-2 text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 -mr-2 text-zinc-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        )}

        {/* Title row - includes X button when no back button */}
        <div className="flex items-start w-full min-w-0 mt-0">
          <div
            className={`relative h-16 w-16 shrink-0 rounded-full overflow-hidden border-2 ${
              openStatus === true
                ? 'border-green-500'
                : openStatus === false
                  ? 'border-red-500'
                  : 'border-gray-500'
            }`}
            style={{
              boxShadow:
                openStatus === true
                  ? '0 0 6px rgba(34, 197, 94, 0.4)'
                  : openStatus === false
                    ? '0 0 6px rgba(239, 68, 68, 0.4)'
                    : undefined,
            }}
          >
            <Image
              src={profileImageUrl || TRUCK_FALLBACK_IMAGE}
              alt={truck.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="ml-3 min-w-0 flex-1 self-center">
            <h3 className="font-bold truncate text-2xl">{truck.name}</h3>
            <p className="text-sm text-zinc-400 truncate">{cuisineTypes}</p>
          </div>

          {/* X button on title row when no back button - positioned at top */}
          {!showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 -mr-2 -mt-1 text-zinc-400 hover:text-white shrink-0 self-start"
            >
              <X className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs - Using standard popup classes for styling */}
      <div className="popup-tabs shrink-0" style={{ marginBottom: 0 }}>
        <button
          className={`popup-tab ${activeTab === 'hours' ? 'active' : ''}`}
          onClick={() => setActiveTab('hours')}
        >
          Hours
        </button>
        <button
          className={`popup-tab ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => setActiveTab('menu')}
        >
          Menu
        </button>
        <button
          className={`popup-tab ${activeTab === 'contact' ? 'active' : ''}`}
          onClick={() => setActiveTab('contact')}
        >
          Contact
        </button>
      </div>

      {/* Content - touch-action allows scrolling without triggering drawer close */}
      <div
        className="flex-1 min-h-0 overflow-y-auto p-4 content-area"
        style={{ touchAction: 'pan-y' }}
        data-vaul-no-drag
      >
        {activeTab === 'hours' && (
          <div className="space-y-6">
            <div className="status-section">
              {openStatus === null ? (
                currentHours ? (
                  <span className="hours">{currentHours}</span>
                ) : (
                  upcomingActiveDays.length === 0 && (
                    <div className="text-zinc-400 text-sm">
                      <p>🕐 Hours may vary</p>
                      <p className="text-xs mt-1">
                        Please contact for current hours and locations.
                      </p>
                    </div>
                  )
                )
              ) : (
                <span className={`status-badge ${openStatus ? 'open' : 'closed'}`}>
                  {openStatus
                    ? currentHours
                      ? `🟢 Open until ${currentHours.split(' - ')[1]}`
                      : '🟢 Open'
                    : nextOpenInfo
                      ? `🔴 Closed until ${nextOpenInfo.isToday ? '' : nextOpenInfo.day.slice(0, 3) + ' '}${nextOpenInfo.hours.split(' - ')[0]}`
                      : '🔴 Closed'}
                </span>
              )}
            </div>

            {upcomingActiveDays.length > 0 && (
              <div className="upcoming-hours-section">
                <h4 className="section-title">Upcoming Hours:</h4>
                <div className="upcoming-hours-list">
                  {upcomingActiveDays.map((dayInfo, i) => (
                    <div key={i} className="upcoming-day">
                      <span className="upcoming-day-name">{dayInfo.day}:</span>
                      <span className="upcoming-day-hours">{dayInfo.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {truck.current_location?.address && (
              <div className="location-section border-t border-zinc-800 pt-4 mt-2">
                <p className="location mb-3">📍 {truck.current_location.address}</p>
                {truck.current_location.lat && truck.current_location.lng && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${truck.current_location.lat},${truck.current_location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="navigate-button"
                  >
                    Get Directions <Navigation className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-0">
            {(() => {
              const truckWithMenu = truck as any;
              const rawMenu = truckWithMenu.menu ?? truckWithMenu.menu_items ?? [];

              const isGroupedFormat = (data: any[]): boolean =>
                data.length > 0 && Array.isArray(data[0]?.items);
              let categories: any[] = [];

              if (Array.isArray(rawMenu) && rawMenu.length > 0) {
                if (isGroupedFormat(rawMenu)) {
                  categories = rawMenu.map((cat) => ({ name: cat.name, items: cat.items }));
                } else {
                  const groups: Record<string, any[]> = {};
                  rawMenu.forEach((item: any) => {
                    const cat = item.category || 'Menu';
                    if (!groups[cat]) groups[cat] = [];
                    groups[cat].push(item);
                  });
                  categories = Object.entries(groups).map(([name, items]) => ({ name, items }));
                }
              }

              if (categories.length === 0)
                return <p className="text-zinc-500 text-center py-4">No menu items available</p>;

              return categories.map((cat, i) => (
                <div key={i} className="menu-category">
                  <button className="category-header" onClick={() => toggleCategory(i)}>
                    <h5 className="category-name">{cat.name}</h5>
                    <span className="category-toggle">
                      {expandedCategories[i.toString()] ? '−' : '+'}
                    </span>
                  </button>
                  {expandedCategories[i.toString()] && (
                    <div className="menu-items">
                      {cat.items.map((item: any, j: number) => (
                        <div key={j} className="menu-item">
                          <span className="item-name">{item.name}</span>
                          {item.price && (
                            <span className="item-price">{formatPrice(item.price)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-4">
            <div className="social-links">
              <h4 className="section-title">Follow Us:</h4>
              {truck.social_media?.instagram && (
                <a
                  href={
                    (truck.social_media.instagram as string).startsWith('http')
                      ? (truck.social_media.instagram as string)
                      : `https://instagram.com/${truck.social_media.instagram}`
                  }
                  target="_blank"
                  className="social-link instagram"
                >
                  <Instagram className="h-4 w-4" /> <span>Instagram</span>
                </a>
              )}
              {truck.social_media?.facebook && (
                <a
                  href={
                    (truck.social_media.facebook as string).startsWith('http')
                      ? (truck.social_media.facebook as string)
                      : `https://facebook.com/${truck.social_media.facebook}`
                  }
                  target="_blank"
                  className="social-link facebook"
                >
                  <Facebook className="h-4 w-4" /> <span>Facebook</span>
                </a>
              )}
              {truck.social_media?.twitter && (
                <a
                  href={
                    (truck.social_media.twitter as string).startsWith('http')
                      ? (truck.social_media.twitter as string)
                      : `https://twitter.com/${truck.social_media.twitter}`
                  }
                  target="_blank"
                  className="social-link twitter"
                >
                  <Twitter className="h-4 w-4" /> <span>Twitter</span>
                </a>
              )}
              {/* Deduplicated Website Logic */}
              {availableWebsite && (
                <a href={availableWebsite} target="_blank" className="social-link website">
                  <Globe className="h-4 w-4" /> <span>Website</span>
                </a>
              )}
            </div>

            {(truck.contact_info?.phone || truck.contact_info?.email) && (
              <div className="contact-details mt-4">
                <h4 className="section-title">Contact:</h4>
                {truck.contact_info.phone && (
                  <a href={`tel:${truck.contact_info.phone}`} className="contact-link">
                    📞 {truck.contact_info.phone}
                  </a>
                )}
                {truck.contact_info.email && (
                  <a href={`mailto:${truck.contact_info.email}`} className="contact-link">
                    ✉️ {truck.contact_info.email}
                  </a>
                )}
              </div>
            )}

            {!((truck as any).is_claimed || (truck as any).owner_id) && (
              <div className="claim-truck-banner mt-6">
                <p className="claim-banner-text">
                  Is this your truck?
                  <button className="claim-banner-button" onClick={() => setIsClaimModalOpen(true)}>
                    Claim it now
                  </button>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <ClaimTruckModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        truckId={truck.id ?? ''}
        truckName={truck.name}
      />
    </div>
  );
};
