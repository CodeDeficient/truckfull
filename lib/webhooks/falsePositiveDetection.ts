import type { ParsedPost, FalsePositiveResult } from './types';

const WHITESPACE = /\s+/;

const FOOD_KEYWORDS = [
  'food',
  'truck',
  'foodtruck',
  'taco',
  'burger',
  'pizza',
  'sandwich',
  'bbq',
  'sushi',
  'noodle',
  'curry',
  'chicken',
  'beef',
  'pork',
  'fish',
  'seafood',
  'delicious',
  'tasty',
  'yummy',
  'serving',
  'served',
  'menu',
  'meal',
  'lunch',
  'dinner',
  'breakfast',
  'brunch',
  'snack',
  'appetizer',
  'dessert',
  'drink',
  'beverage',
  'kitchen',
  'chef',
  'cuisine',
  'gourmet',
  'homemade',
  'fresh',
  'ingredients',
];

const NON_FOOD_KEYWORDS = [
  'car',
  'vehicle',
  'auto',
  'dealership',
  'real estate',
  'property',
  'rental',
  'gym',
  'fitness',
  'membership',
  'special',
  'insurance',
  'loan',
  'mortgage',
  'investment',
  'seminar',
  'workshop',
  'webinar',
  'conference',
  'concert',
  'show',
  'event',
  'party',
  'wedding',
  'birthday',
  'celebration',
  'vacation',
  'travel',
  'hotel',
  'booking',
  'ticket',
  'sale',
  'discount',
  'offer',
  'promotional',
  'advertisement',
];

const BRICK_AND_MORTAR_PHRASES = [
  'restaurant',
  'brick and mortar',
  'location',
  'store',
  'shop',
  'dine with us',
];

const PERSONAL_POST_PHRASES = [
  'family',
  'friends',
  'personal',
  'my family',
  'with my',
  'our family',
  'vacation',
  'trip',
  'holiday',
  'weekend',
  'photos',
];

export function detectFalsePositive(post: ParsedPost): FalsePositiveResult {
  const reasons: string[] = [];
  let confidence = 0;

  if (!post || !post.content) {
    return { isFalsePositive: true, confidence: 1, reasons: ['Empty or missing content'] };
  }

  const content = post.content.trim().toLowerCase();
  const words = content.split(WHITESPACE);

  if (content.length === 0) {
    return { isFalsePositive: true, confidence: 1, reasons: ['Empty or missing content'] };
  }

  const isOnlyHashtags =
    content.length - content.replaceAll('#', '').length > words.length / 2 ||
    words.every((word) => word.startsWith('#'));
  if (isOnlyHashtags) {
    reasons.push('Only hashtags, no substantive content');
    confidence += 0.5;
  }

  const foodKeywordCount = FOOD_KEYWORDS.filter((keyword) => content.includes(keyword)).length;
  const nonFoodKeywordCount = NON_FOOD_KEYWORDS.filter((keyword) =>
    content.includes(keyword),
  ).length;

  if (foodKeywordCount === 0 && nonFoodKeywordCount >= 2) {
    reasons.push('No food-related keywords');
    confidence += 0.6;
  }

  const hasBrickAndMortar = BRICK_AND_MORTAR_PHRASES.some((phrase) => content.includes(phrase));
  if (
    hasBrickAndMortar &&
    !content.includes('food truck') &&
    !content.includes('foodtruck') &&
    foodKeywordCount === 0
  ) {
    reasons.push('Brick and mortar restaurant, not food truck');
    confidence += 0.6;
  }

  const hasPersonalContent = PERSONAL_POST_PHRASES.some((phrase) => content.includes(phrase));
  const hasBusinessTerms = ['serving', 'business', 'open', 'location', 'today', 'visit'].some(
    (term) => content.includes(term),
  );
  if (hasPersonalContent && foodKeywordCount === 0 && !hasBusinessTerms) {
    reasons.push('Personal post, not business-related');
    confidence += 0.6;
  }

  if (post.extracted_data) {
    const { truck_name, food_items, cuisine_type } = post.extracted_data;

    if (
      truck_name ||
      (food_items && food_items.length > 0) ||
      (cuisine_type && cuisine_type.length > 0)
    ) {
      confidence = Math.max(confidence - 0.3, 0);
    }

    if (truck_name) {
      const lowerTruckName = truck_name.toLowerCase();
      if (!lowerTruckName.includes('truck') && !lowerTruckName.includes('mobile')) {
        reasons.push('Truck name does not indicate mobile food service');
        confidence += 0.2;
      }
    }
  }

  if (post.extracted_data?.food_items && post.extracted_data.food_items.length > 0) {
    confidence = Math.max(confidence - 0.3, 0);
  }

  if (
    content.includes('food truck') ||
    content.includes('foodtruck') ||
    content.includes('mobile kitchen')
  ) {
    confidence = Math.max(confidence - 0.4, 0);
  }

  if (foodKeywordCount >= 2) {
    confidence = Math.max(confidence - 0.3, 0);
  }

  confidence = Math.min(confidence, 1);

  const isFalsePositive = confidence > 0.5;

  return {
    isFalsePositive,
    confidence,
    reasons,
  };
}
