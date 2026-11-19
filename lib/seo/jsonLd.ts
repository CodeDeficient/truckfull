/**
 * JSON-LD Structured Data generators for SEO
 * Uses Schema.org vocabulary for rich Google snippets
 */

import { safeJsonLdStringify } from '@/lib/utils/jsonUtils';
import type {
  FoodTruck,
  FoodTruckDomain,
  FoodTruckContactInfo,
  FoodTruckSocialMedia,
} from '@/lib/types';

interface MenuItemJsonLd {
  '@type': 'MenuItem';
  name: string;
  description?: string;
  offers?: {
    '@type': 'Offer';
    price: string;
    priceCurrency: string;
  };
}

interface MenuSectionJsonLd {
  '@type': 'MenuSection';
  name: string;
  hasMenuItem: MenuItemJsonLd[];
}

interface MenuJsonLd {
  '@type': 'Menu';
  name: string;
  hasMenuSection: MenuSectionJsonLd[];
}

interface FoodEstablishmentJsonLd {
  '@context': 'https://schema.org';
  '@type': 'FoodEstablishment';
  name: string;
  description?: string;
  image?: string;
  url: string;
  address?: {
    '@type': 'PostalAddress';
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  geo?: {
    '@type': 'GeoCoordinates';
    latitude: number;
    longitude: number;
  };
  telephone?: string;
  servesCuisine?: string[];
  priceRange?: string;
  openingHoursSpecification?: Array<{
    '@type': 'OpeningHoursSpecification';
    dayOfWeek: string[];
    opens: string;
    closes: string;
  }>;
  hasMenu?: MenuJsonLd;
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: number;
    reviewCount: number;
  };
  sameAs?: string[];
}

type TruckUnion = FoodTruck | FoodTruckDomain;

/**
 * Helper to get location coordinates from truck
 */
function getLocation(truck: TruckUnion): { lat?: number; lng?: number } {
  const loc = truck.current_location;
  return {
    lat: loc?.lat,
    lng: loc?.lng,
  };
}

/**
 * Helper to get contact info
 */
function getContactInfo(truck: TruckUnion): FoodTruckContactInfo {
  return truck.contact_info ?? {};
}

/**
 * Helper to get social media
 */
function getSocialMedia(truck: TruckUnion): FoodTruckSocialMedia {
  return truck.social_media ?? {};
}

/**
 * Generate FoodEstablishment JSON-LD for a food truck
 */
export function generateFoodTruckJsonLd(
  truck: TruckUnion,
  pageUrl: string,
): FoodEstablishmentJsonLd {
  const contact = getContactInfo(truck);
  const social = getSocialMedia(truck);
  const location = getLocation(truck);

  const jsonLd: FoodEstablishmentJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    name: truck.name,
    url: pageUrl,
  };

  // Description
  if (truck.description) {
    jsonLd.description = truck.description;
  }

  // Image - check various sources
  const imageUrl = truck.image_url ?? social.photo_url;
  if (imageUrl) {
    jsonLd.image = imageUrl;
  }

  // Location
  if (location.lat && location.lng) {
    jsonLd.geo = {
      '@type': 'GeoCoordinates',
      latitude: location.lat,
      longitude: location.lng,
    };
  }

  // Address (if available on domain type)
  if ('city' in truck && truck.city) {
    jsonLd.address = {
      '@type': 'PostalAddress',
      addressLocality: truck.city ?? undefined,
      addressRegion: 'state' in truck ? (truck.state ?? undefined) : undefined,
      addressCountry: 'US',
    };
  }

  // Phone from contact info
  if (contact.phone) {
    jsonLd.telephone = contact.phone;
  }

  // Cuisine types
  const cuisineType = truck.cuisine_type;
  if (cuisineType && cuisineType.length > 0) {
    jsonLd.servesCuisine = cuisineType;
  }

  // Price range
  if (truck.price_range) {
    jsonLd.priceRange = truck.price_range;
  }

  // Operating hours
  if (truck.operating_hours && typeof truck.operating_hours === 'object') {
    const dayMap: Record<string, string> = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    };

    const hours = Object.entries(
      truck.operating_hours as Record<string, { open: string; close: string }>,
    )
      .filter(([_, val]) => val?.open && val?.close)
      .map(([day, val]) => ({
        '@type': 'OpeningHoursSpecification' as const,
        dayOfWeek: [dayMap[day] || day],
        opens: val.open,
        closes: val.close,
      }));

    if (hours.length > 0) {
      jsonLd.openingHoursSpecification = hours;
    }
  }

  // Social links
  const socialLinks: string[] = [];
  if (contact.website) socialLinks.push(contact.website);
  if (social.facebook) socialLinks.push(social.facebook);
  if (social.instagram) socialLinks.push(social.instagram);
  if (socialLinks.length > 0) {
    jsonLd.sameAs = socialLinks;
  }

  // Menu items — proper Schema.org Menu structure
  if (truck.menu_items && truck.menu_items.length > 0) {
    const items = truck.menu_items.slice(0, 20);

    const categorized = new Map<string, typeof items>();
    for (const item of items) {
      const category = item.category || 'Menu';
      if (!categorized.has(category)) categorized.set(category, []);
      categorized.get(category)!.push(item);
    }

    jsonLd.hasMenu = {
      '@type': 'Menu',
      name: `${truck.name} Menu`,
      hasMenuSection: [...categorized.entries()].map(([sectionName, sectionItems]) => ({
        '@type': 'MenuSection',
        name: sectionName,
        hasMenuItem: sectionItems.map((item) => {
          const menuItem: MenuItemJsonLd = {
            '@type': 'MenuItem',
            name: item.name,
          };
          if (item.description) menuItem.description = item.description;
          if (item.price != null && Number.isFinite(Number(item.price))) {
            menuItem.offers = {
              '@type': 'Offer',
              price: Number(item.price).toFixed(2),
              priceCurrency: 'USD',
            };
          }
          return menuItem;
        }),
      })),
    };
  }

  // Rating (if available on domain type)
  if (
    'average_rating' in truck &&
    truck.average_rating &&
    'review_count' in truck &&
    truck.review_count
  ) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: truck.average_rating,
      reviewCount: truck.review_count,
    };
  }

  return jsonLd;
}

/**
 * Generate the JSON-LD script tag content
 */
export function jsonLdScriptContent(data: FoodEstablishmentJsonLd): string {
  return safeJsonLdStringify(data);
}
