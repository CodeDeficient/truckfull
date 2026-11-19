'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Facebook, Instagram, Twitter, Globe, ArrowLeft, Navigation, X } from 'lucide-react';
import type { FoodTruckDomain, MenuItem } from '@/lib/types';
import {
  formatDateInTimezone,
  formatPrice,
  formatTime12Hour,
  getCurrentDayHours,
  getCurrentDayName,
  getCurrentTimeInTimezone,
} from '@/lib/utils/foodTruckHelpers';
import { ClaimTruckModal } from '@/components/owner/ClaimTruckModal';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { TRUCK_FALLBACK_IMAGE } from '@/lib/utils/photoTransform';
import {
  trackMenuClick,
  trackDirectionsClick,
  trackWebsiteClick,
  trackCall,
} from '@/lib/utils/analytics';
import { useTruckMenu } from '@/hooks/useTruckMenu';
import { useTruckContact } from '@/hooks/useTruckContact';
import { buildUpcomingSchedule } from '@/lib/services/upcomingSchedule';
import { dateKeyInTimezone } from '@/lib/services/scheduleOverride';
import { hasValidCoordinates, resolveActiveLocation } from '@/lib/services/activeLocation';

const COUNTY_SUFFIX = /,\s*[a-z]+\s+County/i;
const COUNTRY_SUFFIX = /,\s*(United States|USA)/i;

interface MobileTruckDetailsProps {
  truck: FoodTruckDomain;
  onBack?: () => void;
  onClose?: () => void;
  showBack?: boolean;
}

// Using the MenuItem type from lib/types instead of redefining
interface MenuCategory {
  name: string;
  items: MenuItem[];
}

const normalizeExternalUrl = (value: string | undefined): string | null => {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  return `https://${value}`;
};

function parseTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function isWithinPopupHours(
  currentMinutes: number,
  hours: { readonly [key: string]: unknown },
  openMinutes: number,
  closeMinutes: number,
): boolean {
  return hours.endsNextDay === true
    ? currentMinutes >= openMinutes || currentMinutes <= closeMinutes
    : currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

function getSafeTimezone(timezone?: string | null): string {
  if (timezone) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
      return timezone;
    } catch {
      // Fall through to the runtime timezone when the stored value is invalid.
    }
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function getEffectiveCurrentHours(
  truck: FoodTruckDomain,
  now: Date,
): FoodTruckDomain['current_day_hours'] {
  const serviceDate = dateKeyInTimezone(now.toISOString(), getSafeTimezone(truck.timezone));
  const override = truck.upcoming_overrides?.find((item) => item.service_date === serviceDate);
  if (override) {
    if (!override.is_closed && !override.is_all_day && (!override.start_time || !override.end_time)) {
      return getCurrentDayHours(truck, now);
    }
    const hasStarted = override.is_all_day || Boolean(
      override.start_time &&
        parseTime(getCurrentTimeInTimezone(now, truck.timezone)) >= parseTime(override.start_time),
    );
    return {
      open: override.is_all_day ? '00:00' : override.start_time ?? undefined,
      close: override.is_all_day ? '23:59' : override.end_time ?? undefined,
      closed: override.is_closed,
      // Prevent a service-day override from appearing open before its start.
      endsNextDay: override.ends_next_day && hasStarted,
    };
  }
  return getCurrentDayHours(truck, now);
}

export const MobileTruckDetails: React.FC<MobileTruckDetailsProps> = ({
  truck,
  onBack,
  onClose,
  showBack = true,
}) => {
  const [activeTab, setActiveTab] = useState<'hours' | 'menu' | 'contact'>('hours');
  const {
    menuData: lazyMenuData,
    loadedTruckId: loadedMenuTruckId,
    loading: menuLoading,
    loadMenu,
  } = useTruckMenu(truck.id);
  const directContact = useTruckContact(truck.id);

  useEffect(() => {
    if (activeTab === 'menu' && truck.menu_items.length === 0 && truck.has_menu) {
      loadMenu();
    }
  }, [activeTab, truck.id, truck.menu_items.length, truck.has_menu, loadMenu]);

  const hasLazyMenuForTruck = loadedMenuTruckId === truck.id && lazyMenuData !== null;

  const resolvedTruck = truck.menu_items.length > 0 || !hasLazyMenuForTruck
    ? truck
    : { ...truck, ...lazyMenuData };

  // State for tracking expanded menu categories
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  const toggleCategory = (index: number) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [index.toString()]: !prev[index.toString()],
    }));
  };

  // Determine owner tier from truck
  const ownerTier =
    truck.subscription_tier &&
    typeof truck.subscription_tier === 'string' &&
    truck.subscription_tier.trim() !== ''
      ? truck.subscription_tier
      : undefined;

  // --- Logic copied from EnhancedTruckPopup ---
  // Full override-aware schedule including today, used to derive both the
  // status badge's next-open info and the display list below.
  const fullSchedule = useMemo(
    () => {
      const timezone = getSafeTimezone(truck.timezone);
      return buildUpcomingSchedule(
        {
          timezone,
          operating_hours: truck.operating_hours,
          overrides: truck.upcoming_overrides ?? [],
          startOffset: 0,
        },
        new Date(),
      );
    },
    [truck.timezone, truck.operating_hours, truck.upcoming_overrides],
  );

  const { openStatus, currentHours, nextOpenInfo } = useMemo(() => {
    const now = new Date();
    const day = getCurrentDayName(now, truck.timezone);
    const currentHours = getEffectiveCurrentHours(truck, now);
    const currentTime = getCurrentTimeInTimezone(now, truck.timezone);
    const currentMinutes = parseTime(currentTime);

    let openStatus: boolean | null;

    if (ownerTier && ['pro'].includes(ownerTier.toLowerCase())) {
      const hoursToCheck = getEffectiveCurrentHours(truck, now);

      if (!hoursToCheck || hoursToCheck.closed || !hoursToCheck.open || !hoursToCheck.close) {
        openStatus = false;
      } else {
        const [openHours, openMinutes] = hoursToCheck.open.split(':').map(Number);
        const [closeHours, closeMinutes] = hoursToCheck.close.split(':').map(Number);
        openStatus = isWithinPopupHours(
          currentMinutes,
          hoursToCheck,
          openHours * 60 + openMinutes,
          closeHours * 60 + closeMinutes,
        );
      }
    } else {
      openStatus = null;
    }

    let isCurrentlyOpen = false;
    let hoursForDisplay: string | null = null;

    if (currentHours && !currentHours.closed && currentHours.open && currentHours.close) {
      const [openHours, openMinutes] = currentHours.open.split(':').map(Number);
      const [closeHours, closeMinutes] = currentHours.close.split(':').map(Number);

      if (isWithinPopupHours(currentMinutes, currentHours, openHours * 60 + openMinutes, closeHours * 60 + closeMinutes)) {
        isCurrentlyOpen = true;
        hoursForDisplay = `${formatTime12Hour(currentHours.open)} - ${formatTime12Hour(currentHours.close)}`;
      } else if (currentMinutes < openHours * 60 + openMinutes) {
        const dayName = day.charAt(0).toUpperCase() + day.slice(1);
        return {
          openStatus,
          isOpen: openStatus === null ? false : openStatus,
          currentHours: null,
          nextOpenInfo: {
            day: dayName,
            date: formatDateInTimezone(now, truck.timezone),
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

    // If closed and missed today's hours or today is closed, calculate next open
    // day from the override-aware upcoming schedule so one-off overrides on
    // otherwise-closed days are honored by the status badge.
    const todayKey = dateKeyInTimezone(now.toISOString(), getSafeTimezone(truck.timezone));
    const nextEntry = fullSchedule.find((entry) => entry.dateKey !== todayKey);
    if (nextEntry) {
      const dayName = nextEntry.day.charAt(0).toUpperCase() + nextEntry.day.slice(1);
      return {
        openStatus,
        isOpen: openStatus === null ? false : openStatus,
        currentHours: null,
        nextOpenInfo: {
          day: dayName,
          date: `${nextEntry.monthShort} ${nextEntry.dayOfMonth}`,
          hours: nextEntry.hours,
          isToday: false,
        },
      };
    }

    return {
      openStatus,
      isOpen: openStatus === null ? false : openStatus,
      currentHours: null,
      nextOpenInfo: null,
    };
  }, [truck, ownerTier, fullSchedule]);

  const profileImageUrl = useMemo(() => {
    return truck.social_media?.photo_url ?? null;
  }, [truck.social_media]);

  const todayCalendar = useMemo(() => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: getSafeTimezone(truck.timezone),
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    }).formatToParts(new Date());

    return {
      month: parts.find((part) => part.type === 'month')?.value ?? '',
      day: parts.find((part) => part.type === 'day')?.value ?? '',
      weekday: parts.find((part) => part.type === 'weekday')?.value ?? '',
    };
  }, [truck.timezone]);

  const upcomingActiveDays = useMemo(() => {
    const todayShown = Boolean(currentHours) || nextOpenInfo?.isToday === true;
    return buildUpcomingSchedule(
      {
        timezone: getSafeTimezone(truck.timezone),
        operating_hours: truck.operating_hours,
        overrides: truck.upcoming_overrides ?? [],
        startOffset: todayShown ? 1 : 0,
      },
      new Date(),
    );
  }, [truck.timezone, truck.operating_hours, truck.upcoming_overrides, currentHours, nextOpenInfo, openStatus]);

  const cuisineTypes = useMemo(() => {
    if (truck.cuisine_type && truck.cuisine_type.length > 0) {
      return truck.cuisine_type.join(', ');
    }
    return Array.isArray(truck.cuisine_type) ? truck.cuisine_type.join(', ') : 'Food Truck';
  }, [truck.cuisine_type]);

  // Deduplicate website logic
  const rawWebsite = (truck.social_media?.website as string) || truck.contact_info?.website;
  const normalizedWebsite = normalizeExternalUrl(rawWebsite);

  const profileBorderColor = (() => {
    if (openStatus === true) return 'border-green-500';
    if (openStatus === false) return 'border-red-500';
    return 'border-gray-500';
  })();
  const profileBoxShadow = (() => {
    if (openStatus === true) return '0 0 6px rgba(34, 197, 94, 0.4)';
    if (openStatus === false) return '0 0 6px rgba(239, 68, 68, 0.4)';
  })();

  const statusText = (() => {
    if (openStatus === null) {
      return null;
    }
    if (openStatus) {
      return currentHours ? `🟢 Open until ${currentHours.split(' - ')[1]}` : '🟢 Open';
    }
    if (nextOpenInfo) {
      const dayPrefix = nextOpenInfo.isToday ? '' : `${nextOpenInfo.day.slice(0, 3)} `;
      return `🔴 Closed until ${dayPrefix}${nextOpenInfo.hours.split(' - ')[0]}`;
    }
    return '🔴 Closed';
  })();

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
            className={`relative h-16 w-16 shrink-0 rounded-full overflow-hidden border-2 ${profileBorderColor}`}
            style={{ boxShadow: profileBoxShadow }}
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
            <div className="today-location-section">
              <h4 className="section-title">Today:</h4>
              <div className="today-status-row">
                <span className="upcoming-day-calendar" aria-hidden="true">
                  <span className="upcoming-day-month">{todayCalendar.month}</span>
                  <span className="upcoming-day-date">{todayCalendar.day}</span>
                </span>
                <span className="today-day-name">{todayCalendar.weekday}:</span>
                <div className="status-section">
                  {(() => {
                    if (openStatus === null) {
                      if (currentHours) {
                        return <span className="hours">{currentHours}</span>;
                      }
                      if (nextOpenInfo) {
                        const dayPrefix = nextOpenInfo.isToday
                          ? ''
                          : `${nextOpenInfo.day.slice(0, 3)} `;
                        return (
                          <span className="status-badge closed">
                            🔴 Opens {dayPrefix}
                            {nextOpenInfo.hours.split(' - ')[0]}
                          </span>
                        );
                      }
                      if (upcomingActiveDays.length === 0) {
                        return (
                          <div className="text-zinc-400 text-sm">
                            <p>🕐 Hours may vary</p>
                            <p className="text-xs mt-1">
                              Please contact for current hours and locations.
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }
                    return (
                      <span className={`status-badge ${openStatus ? 'open' : 'closed'}`}>
                        {statusText}
                      </span>
                    );
                  })()}
                </div>
              </div>
              {(() => {
                const active = resolveActiveLocation(truck);
                const location = truck.current_day_location ?? active;
                const hasAddress = Boolean(location?.address?.trim());
                const hasCoords = hasValidCoordinates(location);
                if (!hasAddress && !hasCoords) return null;
                const destinationLabel = location?.address ?? `${location?.lat}, ${location?.lng}`;
                return (
                  <div className="today-location-row">
                    {hasAddress && location?.address && (
                      <p className="location today-location">
                        <span className="address-pin" aria-hidden="true">
                          📍
                        </span>{' '}
                        {location.address
                          .replace(COUNTY_SUFFIX, '')
                          .replace(COUNTRY_SUFFIX, '')}
                      </p>
                    )}
                    {hasCoords && location && (
                      <a
                        className="today-location-navigate"
                        href={`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Directions to ${destinationLabel}`}
                        title="Navigate"
                        onClick={() => {
                          if (truck.id) trackDirectionsClick(truck.id);
                        }}
                      >
                        <Navigation className="size-4" />
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>

            {upcomingActiveDays.length > 0 && (
              <div className="upcoming-hours-section">
                <h4 className="section-title">Upcoming Hours:</h4>
                <div className="upcoming-hours-list">
                  {upcomingActiveDays.map((dayInfo, i) => (
                    <div key={i} className="upcoming-day">
                      <div className="upcoming-day-row">
                        <span className="upcoming-day-calendar" aria-hidden="true">
                          <span className="upcoming-day-month">{dayInfo.monthShort}</span>
                          <span className="upcoming-day-date">{dayInfo.dayOfMonth}</span>
                        </span>
                        <span className="upcoming-day-name">{dayInfo.day}:</span>
                        <span className="upcoming-day-hours">{dayInfo.hours}</span>
                      </div>
                      {dayInfo.location && (
                        <div className="upcoming-day-location">
                          <a
                            className="upcoming-day-navigate"
                            href={
                              dayInfo.lat && dayInfo.lng
                                ? `https://www.google.com/maps/dir/?api=1&destination=${dayInfo.lat},${dayInfo.lng}`
                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dayInfo.location)}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Directions to ${dayInfo.location}`}
                            title="Navigate"
                            onClick={() => {
                              if (truck.id) trackDirectionsClick(truck.id);
                            }}
                          >
                            <Navigation className="size-4" />
                          </a>
                          <span>
                            <span className="address-pin" aria-hidden="true">
                              📍
                            </span>{' '}
                            {dayInfo.location}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-0">
            {(() => {
              // Prefer menu_items, fallback to legacy menu field for older trucks
              // Legacy trucks may have menu instead of menu_items
              const truckWithLegacyMenu = resolvedTruck as typeof resolvedTruck & {
                menu?: MenuCategory[] | MenuItem[];
              };
              const rawMenu: MenuCategory[] | MenuItem[] =
                resolvedTruck.menu_items && resolvedTruck.menu_items.length > 0
                  ? resolvedTruck.menu_items
                  : (truckWithLegacyMenu.menu ?? []);

              const isGroupedFormat = (data: unknown[]): data is MenuCategory[] =>
                data.length > 0 && Array.isArray((data[0] as MenuCategory).items);

              let categories: MenuCategory[] = [];

              if (Array.isArray(rawMenu) && rawMenu.length > 0) {
                if (isGroupedFormat(rawMenu)) {
                  // If the data is already in grouped format, use it as is
                  categories = rawMenu;
                } else {
                  // If the data is flat, group it by category
                  const groups: Record<string, MenuItem[]> = {};
                  for (const item of rawMenu) {
                    const cat = item.category || 'Menu';
                    if (!groups[cat]) groups[cat] = [];
                    groups[cat].push(item);
                  }
                  categories = Object.entries(groups).map(([name, items]) => ({ name, items }));
                }
              }

              if (menuLoading) {
                return <p className="text-zinc-500 text-center py-4">Loading menu...</p>;
              }

              if (categories.length === 0)
                return <p className="text-zinc-500 text-center py-4">No menu items available</p>;

              return categories.map((cat, i) => (
                <div key={i} className="menu-category">
                  <button
                    className="category-header"
                    onClick={() => {
                      if (truck.id && !expandedCategories[i.toString()]) {
                        trackMenuClick(truck.id);
                      }
                      toggleCategory(i);
                    }}
                  >
                    <h5 className="category-name">{cat.name}</h5>
                    <span className="category-toggle">
                      {expandedCategories[i.toString()] ? '−' : '+'}
                    </span>
                  </button>
                  {expandedCategories[i.toString()] && (
                    <div className="menu-items">
                      {cat.items.map((item, j) => (
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
                  rel="noopener noreferrer"
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
                  rel="noopener noreferrer"
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
                  rel="noopener noreferrer"
                  className="social-link twitter"
                >
                  <Twitter className="h-4 w-4" /> <span>Twitter</span>
                </a>
              )}
              {/* Deduplicated Website Logic */}
              {normalizedWebsite && (
                <a
                  href={normalizedWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link website"
                  onClick={() => {
                    if (truck.id) trackWebsiteClick(truck.id);
                  }}
                >
                  <Globe className="h-4 w-4" /> <span>Website</span>
                </a>
              )}
            </div>

            {(directContact.phone || directContact.email) && (
              <div className="contact-details mt-4">
                <h4 className="section-title">Contact:</h4>
                {directContact.phone && (
                  <a
                    href={`tel:${directContact.phone}`}
                    className="contact-link"
                    onClick={() => {
                      if (truck.id) trackCall(truck.id);
                    }}
                  >
                    📞 {directContact.phone}
                  </a>
                )}
                {directContact.email && (
                  <a href={`mailto:${directContact.email}`} className="contact-link">
                    ✉️ {directContact.email}
                  </a>
                )}
              </div>
            )}

            {!(truck.is_claimed || truck.owner_id) && (
              <div
                className="claim-truck-banner mt-6"
                role="button"
                tabIndex={0}
                onClick={() => setIsClaimModalOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsClaimModalOpen(true);
                  }
                }}
              >
                <p className="claim-banner-text">
                  Is this your truck?
                  <span className="claim-banner-button">Claim it now</span>
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
