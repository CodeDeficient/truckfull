'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { TRUCK_FALLBACK_IMAGE } from '@/lib/utils/photoTransform';
import { Popup } from 'react-map-gl/mapbox';
import { Facebook, Instagram, Twitter, Globe, Navigation, Share2, Check } from 'lucide-react';
import type { FoodTruck } from '@/lib/types';
import {
  formatPrice,
  formatDateInTimezone,
  formatTime12Hour,
  getCurrentDayName,
  getCurrentDayHours,
  getCurrentTimeInTimezone,
} from '@/lib/utils/foodTruckHelpers';
import { convertToDomain } from '@/lib/utils/foodTruckUtils';
import { buildUpcomingSchedule } from '@/lib/services/upcomingSchedule';
import { dateKeyInTimezone } from '@/lib/services/scheduleOverride';
import { hasValidCoordinates, resolveActiveLocation } from '@/lib/services/activeLocation';
import { useTruckMenu } from '@/hooks/useTruckMenu';
import { useTruckContact } from '@/hooks/useTruckContact';
import { ClaimTruckModal } from '@/components/owner/ClaimTruckModal';
import {
  trackTruckView,
  trackMenuClick,
  trackDirectionsClick,
  trackWebsiteClick,
  trackCall,
  trackShare,
} from '@/lib/utils/analytics';

const COUNTY_SUFFIX = /,\s*[a-z]+\s+County/i;
const COUNTRY_SUFFIX = /,\s*(United States|USA)/i;

interface EnhancedTruckPopupProps {
  readonly truck: FoodTruck;
  readonly onClose: () => void;
  readonly latitude: number;
  readonly longitude: number;
  readonly showBackButton?: boolean;
  readonly onBack?: () => void;
}

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

function getTodayCalendar(timezone?: string | null): {
  month: string;
  day: string;
  weekday: string;
} {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      ...(timezone ? { timeZone: timezone } : {}),
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  } catch {
    formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  }
  const parts = formatter.formatToParts(new Date());
  return {
    month: parts.find((part) => part.type === 'month')?.value ?? '',
    day: parts.find((part) => part.type === 'day')?.value ?? '',
    weekday: parts.find((part) => part.type === 'weekday')?.value ?? '',
  };
}

/**
 * Enhanced popup component for food trucks with profile image and organized details
 */
export function EnhancedTruckPopup({
  truck,
  onClose,
  latitude,
  longitude,
  showBackButton,
  onBack,
}: EnhancedTruckPopupProps) {
  const [activeTab, setActiveTab] = React.useState<'hours' | 'menu' | 'contact'>('hours');

  const {
    menuData: lazyMenuData,
    loadedTruckId: loadedMenuTruckId,
    loading: menuLoading,
    loadMenu,
  } = useTruckMenu(truck.id);
  const directContact = useTruckContact(truck.id);

  useEffect(() => {
    if (activeTab === 'menu' && !truck.menu_items?.length && truck.has_menu) {
      loadMenu();
    }
  }, [activeTab, truck.id, truck.menu_items?.length, truck.has_menu, loadMenu]);

  const hasLazyMenuForTruck = loadedMenuTruckId === truck.id && lazyMenuData !== null;

  const resolvedMenu = truck.menu_items?.length || !hasLazyMenuForTruck
    ? truck
    : { ...truck, ...lazyMenuData };

  // State for tracking expanded menu categories (default: expand first category on desktop)
  const getInitialExpandedCategories = (): Record<string, boolean> => {
    // On desktop, expand the first category by default
    const isDesktop = globalThis.window !== undefined && window.innerWidth >= 768;
    return isDesktop ? { '0': true } : {};
  };

  const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>(
    getInitialExpandedCategories,
  );

  // State for claim truck modal
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [popupImgError, setPopupImgError] = useState(false);

  // State for share feedback
  const [shareFeedback, setShareFeedback] = useState<'copied' | 'shared' | null>(null);

  // Track view event on popup open
  useEffect(() => {
    if (truck.id) {
      trackTruckView(truck.id);
    }
  }, [truck.id]);

  const toggleCategory = (index: number) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [index.toString()]: !prev[index.toString()],
    }));
  };

  // Get current status and hours
  const truckDomain = useMemo(() => convertToDomain(truck), [truck]);
  // subscription_tier is enriched from profiles table for claimed trucks
  const rawTier = truck.subscription_tier;
  const ownerTier =
    rawTier && typeof rawTier === 'string' && rawTier.trim() !== '' ? rawTier : undefined;

  // Full override-aware schedule including today, used to derive both the
  // status badge's next-open info and the display list below.
  const fullSchedule = useMemo(
    () =>
      buildUpcomingSchedule(
        {
          timezone: truck.timezone,
          operating_hours: truck.operating_hours,
          overrides: truck.upcoming_overrides ?? [],
          startOffset: 0,
        },
        new Date(),
      ),
    [truck.timezone, truck.operating_hours, truck.upcoming_overrides],
  );

  const { openStatus, currentHours, nextOpenInfo } = useMemo(() => {
    const now = new Date();
    const day = getCurrentDayName(now, truck.timezone);
    const currentHours = getCurrentDayHours(truckDomain, now);
    const currentTime = getCurrentTimeInTimezone(now, truck.timezone);
    const currentMinutes = parseTime(currentTime);

    let openStatus: boolean | null;

    if (ownerTier && ['pro'].includes(ownerTier.toLowerCase())) {
      const hoursToCheck = getCurrentDayHours(truckDomain, now);

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

    // Check if currently open (both day and time)
    let isCurrentlyOpen = false;
    let hoursForDisplay = null;

    if (currentHours && !currentHours.closed && currentHours.open && currentHours.close) {
      const [openHours, openMinutes] = currentHours.open.split(':').map(Number);
      const [closeHours, closeMinutes] = currentHours.close.split(':').map(Number);

      // Check if current time is within open hours
      if (isWithinPopupHours(currentMinutes, currentHours, openHours * 60 + openMinutes, closeHours * 60 + closeMinutes)) {
        isCurrentlyOpen = true;
        hoursForDisplay = `${formatTime12Hour(currentHours.open)} - ${formatTime12Hour(currentHours.close)}`;
      } else if (currentMinutes < openHours * 60 + openMinutes) {
        // Closed but opens later today - this is our next open time
        const dayName = day.charAt(0).toUpperCase() + day.slice(1);
        return {
          openStatus,
          isOpen: openStatus === null ? false : openStatus,
          currentHours: null,
          nextOpenInfo: {
            day: dayName,
            date: formatDateInTimezone(now, truck.timezone),
            hours: `${formatTime12Hour(currentHours.open)} - ${formatTime12Hour(currentHours.close)}`,
            isToday: true, // Add flag to indicate if this is today
          },
        };
      }
    }

    // If currently open, return current info
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
    const todayKey = dateKeyInTimezone(now.toISOString(), truck.timezone ?? '');
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
          isToday: false, // Flag to indicate this is not today
        },
      };
    }

    // If no future open day found within 7 days
    return {
      openStatus,
      isOpen: openStatus === null ? false : openStatus,
      currentHours: null,
      nextOpenInfo: null,
    };
  }, [truck, truckDomain, ownerTier, fullSchedule]);

  const todayCalendar = useMemo(() => getTodayCalendar(truck.timezone), [truck.timezone]);

  // Get profile image URL with fallback
  const profileImageUrl = useMemo(() => {
    return truck.social_media?.photo_url ?? null; // Using only social_media.photo_url as per schema
  }, [truck.social_media]);

  // Get upcoming active days and their hours, merging one-off schedule overrides
  const upcomingActiveDays = useMemo(() => {
    const todayShown = Boolean(currentHours) || (openStatus !== null && nextOpenInfo?.isToday === true);
    if (!todayShown) return fullSchedule;
    const todayKey = dateKeyInTimezone(new Date().toISOString(), truck.timezone ?? '');
    return fullSchedule.filter((entry) => entry.dateKey !== todayKey);
  }, [fullSchedule, currentHours, nextOpenInfo, openStatus, truck.timezone]);

  // Get cuisine types with fallback to name analysis
  const cuisineTypes = useMemo(() => {
    const cuisineType = truck.cuisine_type;

    if (cuisineType && cuisineType.length > 0) {
      return cuisineType.join(', ');
    }

    // Fallback: Extract cuisine info from name if cuisine_type is null/empty
    const name = truck.name?.toLowerCase() || '';
    const detectedCuisines = [];

    if (name.includes('vegan')) detectedCuisines.push('Vegan');
    if (name.includes('mexican')) detectedCuisines.push('Mexican');
    if (name.includes('italian')) detectedCuisines.push('Italian');
    if (name.includes('asian')) detectedCuisines.push('Asian');
    if (name.includes('chinese')) detectedCuisines.push('Chinese');
    if (name.includes('thai')) detectedCuisines.push('Thai');
    if (name.includes('indian')) detectedCuisines.push('Indian');
    if (name.includes('american')) detectedCuisines.push('American');
    if (name.includes('breakfast')) detectedCuisines.push('Breakfast');
    if (name.includes('dessert')) detectedCuisines.push('Dessert');
    if (name.includes('bbq') || name.includes('barbecue')) detectedCuisines.push('BBQ');
    if (name.includes('seafood')) detectedCuisines.push('Seafood');
    if (name.includes('sandwich')) detectedCuisines.push('Sandwich');
    if (name.includes('pizza')) detectedCuisines.push('Pizza');

    return detectedCuisines.length > 0 ? detectedCuisines.join(', ') : 'Food Truck';
  }, [truck.cuisine_type, truck.name]);

  const handleShare = async (): Promise<void> => {
    if (!truck.id) return;

    try {
      const shareUrl = `${globalThis.window?.location.origin}/trucks/${truck.slug}`;
      const shareData = {
        title: truck.name,
        text: `Check out ${truck.name}! ${cuisineTypes}`,
        url: shareUrl,
      };

      if (navigator.share) {
        await navigator.share(shareData);
        setShareFeedback('shared');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback('copied');
      }

      trackShare(truck.id);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
      }
    } finally {
      setTimeout(() => setShareFeedback(null), 2000);
    }
  };

  return (
    <Popup
      latitude={latitude}
      longitude={longitude}
      onClose={onClose}
      closeButton={false} // Disable default close button to use custom one
      closeOnClick={false}
      anchor="bottom"
      offset={15}
      maxWidth="320px"
      className="enhanced-popup"
    >
      <div className="enhanced-popup-content">
        {/* Header with profile image */}
        <div className={`popup-header${showBackButton ? ' popup-header--with-back' : ''}`}>
          {/* Content row - avatar and truck info */}
          <div className="popup-header-content">
            {/* Profile image with status ring */}
            {(() => {
              const statusClass =
                openStatus === true
                  ? 'status-open'
                  : openStatus === false
                    ? 'status-closed'
                    : 'status-unknown';

              return profileImageUrl && !popupImgError ? (
                <div className={`profile-image-container ${statusClass}`}>
                  <Image
                    src={profileImageUrl}
                    alt={`${truck.name} logo`}
                    fill
                    sizes="64px"
                    className="profile-image"
                    onError={() => setPopupImgError(true)}
                  />
                </div>
              ) : (
                <div className={`profile-image-container ${statusClass}`}>
                  <Image
                    src={TRUCK_FALLBACK_IMAGE}
                    alt="TruckFull"
                    fill
                    sizes="64px"
                    className="rounded-full object-cover"
                  />
                </div>
              );
            })()}

            {/* Truck info */}
            <div className="truck-info">
              <h3 className="truck-name" title={truck.name}>
                {truck.name}
              </h3>
              <p className="cuisine-type">{cuisineTypes}</p>
              {/* Share button */}
              <button
                className="popup-share-button-inline"
                onClick={handleShare}
                aria-label="Share truck"
              >
                {shareFeedback ? <Check className="size-4" /> : <Share2 className="size-4" />}
                {shareFeedback === 'shared'
                  ? 'Shared!'
                  : shareFeedback === 'copied'
                    ? 'Copied!'
                    : 'Share'}
              </button>
            </div>
          </div>

          {/* Back button (positioned top-left, after content for focus order) */}
          {showBackButton && (
            <button className="popup-back-button" onClick={onBack} aria-label="Go back">
              <span className="back-icon">←</span>
            </button>
          )}

          {/* Close button (positioned top-right, after content for focus order) */}
          <button className="popup-close-button" onClick={onClose} aria-label="Close popup">
            <span className="close-icon">×</span>
          </button>
        </div>

        {/* Tab navigation */}
        <div className="popup-tabs">
          <button
            className={`popup-tab ${activeTab === 'hours' ? 'active' : ''}`}
            onClick={() => setActiveTab('hours')}
          >
            Hours
          </button>
          <button
            className={`popup-tab ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('menu');
              if (truck.id) trackMenuClick(truck.id);
            }}
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

        {/* Body content */}
        <div className="popup-body">
          {/* Hours & Location tab */}
          {activeTab === 'hours' && (
            <>
              {/* Today's location */}
              <div className="today-location-section">
                <h4 className="section-title">Today:</h4>
                <div className="today-status-row">
                  <span className="upcoming-day-calendar" aria-hidden="true">
                    <span className="upcoming-day-month">{todayCalendar.month}</span>
                    <span className="upcoming-day-date">{todayCalendar.day}</span>
                  </span>
                  <span className="today-day-name">{todayCalendar.weekday}:</span>
                {/* Status and today's hours */}
                <div className="status-section">
                  {openStatus === null ? (
                    <>
                      {/* For free tier or unclaimed trucks, show hours without open/closed status */}
                      {(() => {
                        if (currentHours) {
                          return <span className="hours">{currentHours}</span>;
                        }
                        // Show fallback message if no hours data
                        if (upcomingActiveDays.length === 0) {
                          return (
                            <div className="hours-fallback text-gray-500 dark:text-gray-400 text-sm">
                              <p>🕐 Hours may vary</p>
                              <p className="text-xs mt-1">
                                Please contact for current hours and locations.
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </>
                  ) : (
                    <span className={`status-badge ${openStatus ? 'open' : 'closed'}`}>
                      {openStatus
                        ? (() => {
                            // Open: Show "Open until [Close Time]"
                            if (currentHours) {
                              const closeTime = currentHours.split(' - ')[1];
                              return `🟢 Open until ${closeTime}`;
                            }
                            return '🟢 Open';
                          })()
                        : (() => {
                            // Closed: Show "Closed until [Next Open Time]"
                            if (nextOpenInfo) {
                              const openTime = nextOpenInfo.hours.split(' - ')[0];
                              if (nextOpenInfo.isToday) {
                                return `🔴 Closed until ${openTime}`;
                              }
                              // Shorten the day name to fit better
                              const shortDay = nextOpenInfo.day.slice(0, 3);
                              return `🔴 Closed until ${shortDay} ${openTime}`;
                            }
                            return '🔴 Closed';
                          })()}
                    </span>
                  )}
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

              {/* Upcoming active days */}
              {upcomingActiveDays.length > 0 && (
                <div className="upcoming-hours-section">
                  <h4 className="section-title">Upcoming Hours:</h4>
                  <div className="upcoming-hours-list">
                    {upcomingActiveDays.map((dayInfo, index) => (
                      <div key={index} className="upcoming-day">
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

            </>
          )}

          {/* Menu tab */}
          {activeTab === 'menu' && (
            <>
              {(() => {
                // Types for menu data - can be either grouped (MenuCategory[]) or flat (MenuItem[])
                interface MenuItem {
                  name?: string;
                  price?: number;
                  category?: string;
                  description?: string;
                  dietary_info?: string[];
                  is_popular?: boolean;
                  [key: string]: unknown;
                }
                interface MenuCategory {
                  name: string;
                  items: MenuItem[];
                }

                const truckWithMenu = resolvedMenu as { menu?: unknown; menu_items?: unknown };
                const rawMenu = truckWithMenu.menu_items ?? truckWithMenu.menu ?? [];

                // Detect if menu is grouped (MenuCategory[]) or flat (MenuItem[])
                // Grouped format: [{name: "Soups", items: [...]}, ...]
                // Flat format: [{name: "Soup Item", category: "Soups", ...}, ...]
                const isGroupedFormat = (data: unknown[]): boolean => {
                  if (data.length === 0) return false;
                  const first = data[0] as Record<string, unknown>;
                  return Array.isArray(first?.items);
                };

                let categories: string[] = [];
                const itemsByCategory: Record<string, MenuItem[]> = {};

                if (Array.isArray(rawMenu) && rawMenu.length > 0) {
                  if (isGroupedFormat(rawMenu as unknown[])) {
                    // Already grouped - use directly
                    const grouped = rawMenu as unknown as MenuCategory[];
                    categories = grouped.map((cat) => cat.name);
                    for (const cat of grouped) {
                      itemsByCategory[cat.name] = cat.items;
                    }
                  } else {
                    // Flat format - group by category field
                    const flat = rawMenu as unknown as MenuItem[];
                    const categorySet = new Set<string>();
                    for (const item of flat) {
                      const cat = item.category ?? 'Menu';
                      categorySet.add(cat);
                      if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
                      itemsByCategory[cat].push(item);
                    }
                    categories = [...categorySet];
                  }
                }

                // Get unique categories, maintaining order

                if (categories.length > 0) {
                  return (
                    <div className="menu-section">
                      <div className="menu-categories">
                        {categories.map((category, catIndex) => {
                          const isExpanded = expandedCategories[catIndex.toString()] ?? false;
                          const categoryItems = itemsByCategory[category] ?? [];

                          return (
                            <div key={catIndex} className="menu-category">
                              <button
                                className="category-header"
                                onClick={() => toggleCategory(catIndex)}
                                aria-expanded={isExpanded}
                              >
                                <h5 className="category-name">{category}</h5>
                                <span className="category-toggle">{isExpanded ? '−' : '+'}</span>
                              </button>
                              {isExpanded && (
                                <div className="menu-items">
                                  {categoryItems.map((item: MenuItem, itemIndex: number) => (
                                    <div key={itemIndex} className="menu-item">
                                      <span className="item-name">{item.name}</span>
                                      {item.price && (
                                        <span className="item-price">
                                          {formatPrice(item.price)}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                if (menuLoading) {
                  return (
                    <div className="empty-state">
                      <p>Loading menu...</p>
                    </div>
                  );
                }
                return (
                  <div className="empty-state">
                    <p>No menu items available</p>
                  </div>
                );
              })()}
            </>
          )}

          {/* Contact tab */}
          {activeTab === 'contact' && (
            <div className="contact-tab-content">
              {/* Rating */}
              {truck.average_rating != null && truck.average_rating > 0 && (
                <div className="rating-section">
                  <div className="stars">
                    {Array.from({ length: Math.floor(truck.average_rating) }).map((_, i) => (
                      <span key={`full-${i}`} className="star-full">
                        ★
                      </span>
                    ))}
                    {truck.average_rating % 1 >= 0.5 && (
                      <span key="half" className="star-half">
                        ☆
                      </span>
                    )}
                    {Array.from({
                      length:
                        5 -
                        Math.floor(truck.average_rating) -
                        (truck.average_rating % 1 >= 0.5 ? 1 : 0),
                    }).map((_, i) => (
                      <span key={`empty-${i}`} className="star-empty">
                        ★
                      </span>
                    ))}
                    <span className="rating-text">
                      ({truck.average_rating.toFixed(1)})
                      {truck.review_count != null &&
                        truck.review_count > 0 &&
                        ` • ${truck.review_count} reviews`}
                    </span>
                  </div>
                </div>
              )}

              {/* Social Media */}
              {truck.social_media &&
                (Object.keys(truck.social_media).length > 1 ||
                  (Object.keys(truck.social_media).length === 1 &&
                    !truck.social_media.photo_url)) && (
                  <div className="contact-section">
                    <h4 className="section-title">Follow Us:</h4>
                    <div className="social-links">
                      {truck.social_media.instagram && (
                        <a
                          href={
                            truck.social_media.instagram.startsWith('http')
                              ? truck.social_media.instagram
                              : `https://instagram.com/${truck.social_media.instagram}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="social-link instagram"
                        >
                          <Instagram className="size-4" />
                          <span>Instagram</span>
                        </a>
                      )}
                      {truck.social_media.facebook && (
                        <a
                          href={
                            truck.social_media.facebook.startsWith('http')
                              ? truck.social_media.facebook
                              : `https://facebook.com/${truck.social_media.facebook}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="social-link facebook"
                        >
                          <Facebook className="size-4" />
                          <span>Facebook</span>
                        </a>
                      )}
                      {truck.social_media.twitter && (
                        <a
                          href={
                            truck.social_media.twitter.startsWith('http')
                              ? truck.social_media.twitter
                              : `https://twitter.com/${truck.social_media.twitter}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="social-link twitter"
                        >
                          <Twitter className="size-4" />
                          <span>Twitter</span>
                        </a>
                      )}
                      {typeof truck.social_media.website === 'string' &&
                        truck.social_media.website && (
                          <a
                            href={truck.social_media.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="social-link website"
                            onClick={() => {
                              if (truck.id) trackWebsiteClick(truck.id);
                            }}
                          >
                            <Globe className="size-4" />
                            <span>Website</span>
                          </a>
                        )}
                    </div>
                  </div>
                )}

              {/* Contact Info */}
              {(directContact.phone ||
                directContact.email ||
                (truck.contact_info?.website && !truck.social_media?.website)) && (
                  <div className="contact-section">
                    <h4 className="section-title">Contact:</h4>
                    <div className="contact-details">
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
                      {truck.contact_info?.website && !truck.social_media?.website && (
                        <a
                          href={truck.contact_info.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="contact-link"
                        >
                          🌐 Website
                        </a>
                      )}
                    </div>
                  </div>
                )}

              {!truck.social_media && !truck.contact_info && (
                <div className="empty-state">
                  <p>No contact information available</p>
                </div>
              )}

              {/* Claim Truck Banner - Moved to bottom of Contact tab */}
              {!(
                (truck as typeof truck & { is_claimed?: boolean; owner_id?: string }).is_claimed ||
                (truck as typeof truck & { owner_id?: string }).owner_id
              ) && (
                <div
                  className="claim-truck-banner"
                  style={{ marginTop: '16px' }}
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
                    Is this your truck?{' '}
                    <span className="claim-banner-button">Claim it now</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Claim Truck Modal */}
      <ClaimTruckModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        truckId={truck.id ?? ''}
        truckName={truck.name ?? ''}
      />
    </Popup>
  );
}
