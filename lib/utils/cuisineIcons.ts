/**
 * Comprehensive cuisine-to-icon mapping for food truck finder application
 * Provides appropriate icons for various cuisine types with fallbacks for unknown types
 */

// Define icon types
export type CuisineIconType =
  | 'american'
  | 'asian'
  | 'chinese'
  | 'japanese'
  | 'korean'
  | 'thai'
  | 'vietnamese'
  | 'indian'
  | 'mexican'
  | 'italian'
  | 'french'
  | 'mediterranean'
  | 'greek'
  | 'spanish'
  | 'latin-american'
  | 'caribbean'
  | 'middle-eastern'
  | 'turkish'
  | 'persian'
  | 'african'
  | 'ethiopian'
  | 'moroccan'
  | 'european'
  | 'german'
  | 'eastern-european'
  | 'polish'
  | 'scandinavian'
  | 'seafood'
  | 'bbq'
  | 'steak'
  | 'pizza'
  | 'sandwich'
  | 'salad'
  | 'dessert'
  | 'cafe'
  | 'vegetarian'
  | 'vegan'
  | 'gluten-free'
  | 'healthy'
  | 'fast-food'
  | 'breakfast'
  | 'diner'
  | 'food-truck'
  | 'other';

// Define cuisine type mapping
export type CuisineType =
  | 'American'
  | 'Asian'
  | 'Chinese'
  | 'Japanese'
  | 'Korean'
  | 'Thai'
  | 'Vietnamese'
  | 'Indian'
  | 'Mexican'
  | 'Italian'
  | 'French'
  | 'Mediterranean'
  | 'Greek'
  | 'Spanish'
  | 'Latin American'
  | 'Caribbean'
  | 'Middle Eastern'
  | 'Turkish'
  | 'Persian'
  | 'African'
  | 'Ethiopian'
  | 'Moroccan'
  | 'European'
  | 'German'
  | 'Eastern European'
  | 'Polish'
  | 'Scandinavian'
  | 'Seafood'
  | 'BBQ'
  | 'Steak'
  | 'Pizza'
  | 'Sandwich'
  | 'Salad'
  | 'Dessert'
  | 'Cafe'
  | 'Vegetarian'
  | 'Vegan'
  | 'Gluten-Free'
  | 'Healthy'
  | 'Fast Food'
  | 'Breakfast'
  | 'Diner'
  | 'Food Truck'
  | 'Other'
  | 'New American'
  | 'Southern'
  | 'Soul Food'
  | 'Asian Fusion'
  | 'Pan Asian'
  | 'Dim Sum'
  | 'Szechuan'
  | 'Cantonese'
  | 'Hunan'
  | 'Sushi'
  | 'Ramen'
  | 'Tempura'
  | 'Teriyaki'
  | 'Izakaya'
  | 'Teppanyaki'
  | 'Korean BBQ'
  | 'Korean Fried Chicken'
  | 'Pad Thai'
  | 'Pho'
  | 'Banh Mi'
  | 'North Indian'
  | 'South Indian'
  | 'Pakistani'
  | 'Bangladeshi'
  | 'Curry'
  | 'Tex-Mex'
  | 'Tacos'
  | 'Tamales'
  | 'Enchiladas'
  | 'Guacamole'
  | 'Pasta'
  | 'Neapolitan'
  | 'Sicilian'
  | 'Bistro'
  | 'Crepes'
  | 'Croque Monsieur'
  | 'Portuguese'
  | 'Tuscan'
  | 'Lebanese'
  | 'Armenian'
  | 'Nigerian'
  | 'British'
  | 'Oysters'
  | 'Grill'
  | 'Burger'
  | 'Coffee Shop'
  | 'Bakery'
  | 'Brunch'
  | 'Steakhouse'
  | 'Nordic'
  | 'International';

/**
 * Mapping of cuisine types to appropriate icons
 * This mapping includes common cuisine types and their variants
 */
export const cuisineIcons: Record<string, CuisineIconType> = {
  // American cuisine
  American: 'american',
  'New American': 'american',
  Southern: 'american',
  'Soul Food': 'american',
  BBQ: 'bbq',
  Diner: 'diner',
  'Fast Food': 'fast-food',
  Burger: 'fast-food',
  Steakhouse: 'steak',

  // Asian cuisine
  Asian: 'asian',
  'Asian Fusion': 'asian',
  'Pan Asian': 'asian',

  // Chinese cuisine
  Chinese: 'chinese',
  'Dim Sum': 'chinese',
  Szechuan: 'chinese',
  Cantonese: 'chinese',
  Hunan: 'chinese',

  // Japanese cuisine
  Japanese: 'japanese',
  Sushi: 'japanese',
  Ramen: 'japanese',
  Tempura: 'japanese',
  Teriyaki: 'japanese',
  Izakaya: 'japanese',
  Teppanyaki: 'japanese',

  // Korean cuisine
  Korean: 'korean',
  'Korean BBQ': 'korean',
  'Korean Fried Chicken': 'korean',

  // Thai cuisine
  Thai: 'thai',
  'Pad Thai': 'thai',

  // Vietnamese cuisine
  Vietnamese: 'vietnamese',
  Pho: 'vietnamese',
  'Banh Mi': 'vietnamese',

  // Indian cuisine
  Indian: 'indian',
  'North Indian': 'indian',
  'South Indian': 'indian',
  Pakistani: 'indian',
  Bangladeshi: 'indian',
  Curry: 'indian',

  // Mexican cuisine
  Mexican: 'mexican',
  'Tex-Mex': 'mexican',
  Tacos: 'mexican',
  Tamales: 'mexican',
  Enchiladas: 'mexican',
  Guacamole: 'mexican',

  // Italian cuisine
  Italian: 'italian',
  Pizza: 'pizza',
  Pasta: 'italian',
  Neapolitan: 'italian',
  Sicilian: 'italian',

  // French cuisine
  French: 'french',
  Bistro: 'french',
  Crepes: 'french',
  'Croque Monsieur': 'french',

  // Mediterranean cuisine
  Mediterranean: 'mediterranean',
  Greek: 'greek',
  Spanish: 'spanish',
  Portuguese: 'mediterranean',
  Moroccan: 'moroccan',
  Tuscan: 'mediterranean',

  // Middle Eastern
  'Middle Eastern': 'middle-eastern',
  Lebanese: 'middle-eastern',
  Turkish: 'turkish',
  Persian: 'persian',
  Armenian: 'middle-eastern',

  // African
  African: 'african',
  Ethiopian: 'ethiopian',
  Nigerian: 'african',

  // European
  European: 'european',
  German: 'german',
  British: 'european',
  'Eastern European': 'eastern-european',
  Polish: 'polish',
  Scandinavian: 'scandinavian',
  Nordic: 'scandinavian',

  // Specialized cuisines
  Seafood: 'seafood',
  Oysters: 'seafood',
  Grill: 'bbq',
  Sandwich: 'sandwich',
  Salad: 'salad',
  Dessert: 'dessert',
  Cafe: 'cafe',
  'Coffee Shop': 'cafe',
  Bakery: 'dessert',
  Breakfast: 'breakfast',
  Brunch: 'breakfast',

  // Dietary specific
  Vegetarian: 'vegetarian',
  Vegan: 'vegan',
  'Gluten-Free': 'gluten-free',
  Healthy: 'healthy',

  // Others
  'Food Truck': 'food-truck',
  Other: 'other',
  International: 'other',
};

/**
 * Function to get the appropriate icon for a given cuisine type
 * @param cuisineType - The cuisine type to get an icon for
 * @returns The corresponding icon type
 */
export const getCuisineIcon = (cuisineType: string): CuisineIconType => {
  if (!cuisineType) {
    return 'other';
  }

  // Normalize the cuisine type to match our keys (capitalize first letter of each word)
  const normalizedCuisine = cuisineType
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Also handle common lowercase or differently formatted cuisines
  const lowercaseCuisine = cuisineType.toLowerCase();

  // Check for exact matches in our mapping
  if (normalizedCuisine in cuisineIcons) {
    return cuisineIcons[normalizedCuisine as CuisineType];
  }

  // Additional checks for common variations that might not match exactly
  if (lowercaseCuisine.includes('italian') || lowercaseCuisine.includes('pizza')) {
    return 'italian';
  } else if (lowercaseCuisine.includes('mexican') || lowercaseCuisine.includes('taco')) {
    return 'mexican';
  } else if (lowercaseCuisine.includes('chinese') || lowercaseCuisine.includes('dim sum')) {
    return 'chinese';
  } else if (
    lowercaseCuisine.includes('japanese') ||
    lowercaseCuisine.includes('sushi') ||
    lowercaseCuisine.includes('ramen')
  ) {
    return 'japanese';
  } else if (lowercaseCuisine.includes('thai')) {
    return 'thai';
  } else if (lowercaseCuisine.includes('indian')) {
    return 'indian';
  } else if (lowercaseCuisine.includes('french')) {
    return 'french';
  } else if (lowercaseCuisine.includes('mediterranean') || lowercaseCuisine.includes('greek')) {
    return 'mediterranean';
  } else if (lowercaseCuisine.includes('seafood')) {
    return 'seafood';
  } else if (lowercaseCuisine.includes('bbq') || lowercaseCuisine.includes('barbecue')) {
    return 'bbq';
  } else if (lowercaseCuisine.includes('steak') || lowercaseCuisine.includes('steakhouse')) {
    return 'steak';
  } else if (lowercaseCuisine.includes('vegetarian')) {
    return 'vegetarian';
  } else if (lowercaseCuisine.includes('vegan')) {
    return 'vegan';
  } else if (lowercaseCuisine.includes('healthy')) {
    return 'healthy';
  } else if (
    lowercaseCuisine.includes('fast food') ||
    lowercaseCuisine.includes('burger') ||
    lowercaseCuisine.includes('sandwich')
  ) {
    return 'fast-food';
  } else if (lowercaseCuisine.includes('breakfast') || lowercaseCuisine.includes('brunch')) {
    return 'breakfast';
  } else if (lowercaseCuisine.includes('dessert') || lowercaseCuisine.includes('bakery')) {
    return 'dessert';
  } else if (lowercaseCuisine.includes('cafe') || lowercaseCuisine.includes('coffee')) {
    return 'cafe';
  } else if (lowercaseCuisine.includes('korean')) {
    return 'korean';
  } else if (lowercaseCuisine.includes('vietnamese') || lowercaseCuisine.includes('pho')) {
    return 'vietnamese';
  }

  // If cuisine type is not found in mapping, return 'other' as fallback
  return 'other';
};

/**
 * Function to get a fallback icon for unknown cuisine types
 * This function can be used when a cuisine type doesn't match any in our mapping
 * @returns The fallback icon type
 */
export const getFallbackCuisineIcon = (): CuisineIconType => {
  return 'other';
};
