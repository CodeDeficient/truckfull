import { describe, it, expect } from '@jest/globals';
import {
  getCuisineIcon,
  getFallbackCuisineIcon,
  cuisineIcons,
  type CuisineIconType,
} from '@/lib/utils/cuisineIcons';

describe('getCuisineIcon', () => {
  it('returns "other" for empty string', () => {
    expect(getCuisineIcon('')).toBe('other');
  });

  it('returns "other" for null-like input', () => {
    expect(getCuisineIcon('UnknownCuisine')).toBe('other');
  });

  it('returns "american" for American cuisine', () => {
    expect(getCuisineIcon('American')).toBe('american');
    expect(getCuisineIcon('New American')).toBe('american');
    expect(getCuisineIcon('Southern')).toBe('american');
    expect(getCuisineIcon('Soul Food')).toBe('american');
  });

  it('returns "bbq" for BBQ cuisine', () => {
    expect(getCuisineIcon('BBQ')).toBe('bbq');
    expect(getCuisineIcon('Grill')).toBe('bbq');
  });

  it('returns "fast-food" for fast food', () => {
    expect(getCuisineIcon('Fast Food')).toBe('fast-food');
    expect(getCuisineIcon('Burger')).toBe('fast-food');
  });

  it('returns "diner" for diner cuisine', () => {
    expect(getCuisineIcon('Diner')).toBe('diner');
  });

  it('returns "steak" for steakhouse', () => {
    expect(getCuisineIcon('Steakhouse')).toBe('steak');
  });

  it('returns "asian" for Asian cuisine variants', () => {
    expect(getCuisineIcon('Asian')).toBe('asian');
    expect(getCuisineIcon('Asian Fusion')).toBe('asian');
    expect(getCuisineIcon('Pan Asian')).toBe('asian');
  });

  it('returns "chinese" for Chinese cuisine variants', () => {
    expect(getCuisineIcon('Chinese')).toBe('chinese');
    expect(getCuisineIcon('Dim Sum')).toBe('chinese');
    expect(getCuisineIcon('Szechuan')).toBe('chinese');
    expect(getCuisineIcon('Cantonese')).toBe('chinese');
    expect(getCuisineIcon('Hunan')).toBe('chinese');
  });

  it('returns "japanese" for Japanese cuisine variants', () => {
    expect(getCuisineIcon('Japanese')).toBe('japanese');
    expect(getCuisineIcon('Sushi')).toBe('japanese');
    expect(getCuisineIcon('Ramen')).toBe('japanese');
    expect(getCuisineIcon('Tempura')).toBe('japanese');
    expect(getCuisineIcon('Teriyaki')).toBe('japanese');
    expect(getCuisineIcon('Izakaya')).toBe('japanese');
    expect(getCuisineIcon('Teppanyaki')).toBe('japanese');
  });

  it('returns "korean" for Korean cuisine variants', () => {
    expect(getCuisineIcon('Korean')).toBe('korean');
    expect(getCuisineIcon('Korean Fried Chicken')).toBe('korean');
  });

  it('returns "thai" for Thai cuisine variants', () => {
    expect(getCuisineIcon('Thai')).toBe('thai');
    expect(getCuisineIcon('Pad Thai')).toBe('thai');
  });

  it('returns "vietnamese" for Vietnamese cuisine variants', () => {
    expect(getCuisineIcon('Vietnamese')).toBe('vietnamese');
    expect(getCuisineIcon('Pho')).toBe('vietnamese');
    expect(getCuisineIcon('Banh Mi')).toBe('vietnamese');
  });

  it('returns "indian" for Indian cuisine variants', () => {
    expect(getCuisineIcon('Indian')).toBe('indian');
    expect(getCuisineIcon('North Indian')).toBe('indian');
    expect(getCuisineIcon('South Indian')).toBe('indian');
    expect(getCuisineIcon('Pakistani')).toBe('indian');
    expect(getCuisineIcon('Bangladeshi')).toBe('indian');
    expect(getCuisineIcon('Curry')).toBe('indian');
  });

  it('returns "mexican" for Mexican cuisine variants', () => {
    expect(getCuisineIcon('Mexican')).toBe('mexican');
    expect(getCuisineIcon('Tacos')).toBe('mexican');
    expect(getCuisineIcon('Tamales')).toBe('mexican');
    expect(getCuisineIcon('Enchiladas')).toBe('mexican');
    expect(getCuisineIcon('Guacamole')).toBe('mexican');
  });

  it('returns "italian" for Italian cuisine variants', () => {
    expect(getCuisineIcon('Italian')).toBe('italian');
    expect(getCuisineIcon('Pizza')).toBe('pizza');
    expect(getCuisineIcon('Pasta')).toBe('italian');
    expect(getCuisineIcon('Neapolitan')).toBe('italian');
    expect(getCuisineIcon('Sicilian')).toBe('italian');
  });

  it('handles lowercase input', () => {
    expect(getCuisineIcon('italian')).toBe('italian');
    expect(getCuisineIcon('mexican')).toBe('mexican');
  });

  it('handles mixed case input', () => {
    expect(getCuisineIcon('ITALIAN')).toBe('italian');
    expect(getCuisineIcon('Mexican')).toBe('mexican');
  });

  it('returns "french" for French cuisine variants', () => {
    expect(getCuisineIcon('French')).toBe('french');
    expect(getCuisineIcon('Bistro')).toBe('french');
    expect(getCuisineIcon('Crepes')).toBe('french');
    expect(getCuisineIcon('Croque Monsieur')).toBe('french');
  });

  it('returns "mediterranean" for Mediterranean cuisine', () => {
    expect(getCuisineIcon('Mediterranean')).toBe('mediterranean');
    expect(getCuisineIcon('Greek')).toBe('greek');
    expect(getCuisineIcon('Spanish')).toBe('spanish');
    expect(getCuisineIcon('Portuguese')).toBe('mediterranean');
    expect(getCuisineIcon('Moroccan')).toBe('moroccan');
    expect(getCuisineIcon('Tuscan')).toBe('mediterranean');
  });

  it('returns "middle-eastern" for Middle Eastern cuisine', () => {
    expect(getCuisineIcon('Middle Eastern')).toBe('middle-eastern');
    expect(getCuisineIcon('Lebanese')).toBe('middle-eastern');
    expect(getCuisineIcon('Turkish')).toBe('turkish');
    expect(getCuisineIcon('Persian')).toBe('persian');
    expect(getCuisineIcon('Armenian')).toBe('middle-eastern');
  });

  it('returns "african" for African cuisine', () => {
    expect(getCuisineIcon('African')).toBe('african');
    expect(getCuisineIcon('Ethiopian')).toBe('ethiopian');
    expect(getCuisineIcon('Nigerian')).toBe('african');
  });

  it('returns "european" for European cuisine variants', () => {
    expect(getCuisineIcon('European')).toBe('european');
    expect(getCuisineIcon('German')).toBe('german');
    expect(getCuisineIcon('British')).toBe('european');
    expect(getCuisineIcon('Eastern European')).toBe('eastern-european');
    expect(getCuisineIcon('Polish')).toBe('polish');
    expect(getCuisineIcon('Scandinavian')).toBe('scandinavian');
    expect(getCuisineIcon('Nordic')).toBe('scandinavian');
  });

  it('returns "seafood" for seafood', () => {
    expect(getCuisineIcon('Seafood')).toBe('seafood');
    expect(getCuisineIcon('Oysters')).toBe('seafood');
  });

  it('returns "sandwich" for sandwich', () => {
    expect(getCuisineIcon('Sandwich')).toBe('sandwich');
  });

  it('returns "salad" for salad', () => {
    expect(getCuisineIcon('Salad')).toBe('salad');
  });

  it('returns "dessert" for dessert', () => {
    expect(getCuisineIcon('Dessert')).toBe('dessert');
    expect(getCuisineIcon('Bakery')).toBe('dessert');
  });

  it('returns "cafe" for cafe', () => {
    expect(getCuisineIcon('Cafe')).toBe('cafe');
    expect(getCuisineIcon('Coffee Shop')).toBe('cafe');
  });

  it('returns "breakfast" for breakfast', () => {
    expect(getCuisineIcon('Breakfast')).toBe('breakfast');
    expect(getCuisineIcon('Brunch')).toBe('breakfast');
  });

  it('returns "vegetarian" for vegetarian', () => {
    expect(getCuisineIcon('Vegetarian')).toBe('vegetarian');
  });

  it('returns "vegan" for vegan', () => {
    expect(getCuisineIcon('Vegan')).toBe('vegan');
  });

  it('returns "other" for Gluten-Free (not in lowercase matching)', () => {
    expect(getCuisineIcon('Gluten-Free')).toBe('other');
  });

  it('returns "healthy" for healthy', () => {
    expect(getCuisineIcon('Healthy')).toBe('healthy');
  });

  it('returns "food-truck" for food truck', () => {
    expect(getCuisineIcon('Food Truck')).toBe('food-truck');
  });

  it('returns "other" for unknown cuisines', () => {
    expect(getCuisineIcon('Unknown Cuisine')).toBe('other');
    expect(getCuisineIcon('Some Random Food')).toBe('other');
  });

  it('matches italian in description for pizza-like foods', () => {
    expect(getCuisineIcon('authentic pizza place')).toBe('italian');
  });

  it('matches mexican and taco keywords', () => {
    expect(getCuisineIcon('taco truck')).toBe('mexican');
  });

  it('matches chinese and dim sum keywords', () => {
    expect(getCuisineIcon('dim sum restaurant')).toBe('chinese');
  });

  it('matches japanese with sushi or ramen keywords', () => {
    expect(getCuisineIcon('sushi bar')).toBe('japanese');
    expect(getCuisineIcon('ramen shop')).toBe('japanese');
  });

  it('matches thai keyword', () => {
    expect(getCuisineIcon('thai food')).toBe('thai');
  });

  it('matches indian keyword', () => {
    expect(getCuisineIcon('indian curry')).toBe('indian');
  });

  it('matches french keyword', () => {
    expect(getCuisineIcon('french cuisine')).toBe('french');
  });

  it('matches mediterranean or greek keywords', () => {
    expect(getCuisineIcon('greek food')).toBe('mediterranean');
  });

  it('matches seafood keyword', () => {
    expect(getCuisineIcon('seafood restaurant')).toBe('seafood');
  });

  it('matches bbq or barbecue keywords', () => {
    expect(getCuisineIcon('barbecue joint')).toBe('bbq');
  });

  it('matches steak or steakhouse keywords', () => {
    expect(getCuisineIcon('steakhouse')).toBe('steak');
  });

  it('matches vegetarian keyword', () => {
    expect(getCuisineIcon('vegetarian cafe')).toBe('vegetarian');
  });

  it('matches vegan keyword', () => {
    expect(getCuisineIcon('vegan options')).toBe('vegan');
  });

  it('matches healthy keyword', () => {
    expect(getCuisineIcon('healthy food')).toBe('healthy');
  });

  it('matches fast food, burger, or sandwich keywords', () => {
    expect(getCuisineIcon('burger joint')).toBe('fast-food');
    expect(getCuisineIcon('sandwich shop')).toBe('fast-food');
  });

  it('matches breakfast or brunch keywords', () => {
    expect(getCuisineIcon('brunch spot')).toBe('breakfast');
  });

  it('matches dessert or bakery keywords', () => {
    expect(getCuisineIcon('bakery treats')).toBe('dessert');
  });

  it('matches cafe or coffee keywords', () => {
    expect(getCuisineIcon('coffee shop')).toBe('cafe');
  });

  it('matches korean keyword', () => {
    expect(getCuisineIcon('korean restaurant')).toBe('korean');
  });

  it('matches vietnamese or pho keywords', () => {
    expect(getCuisineIcon('vietnamese food')).toBe('vietnamese');
    expect(getCuisineIcon('pho restaurant')).toBe('vietnamese');
  });
});

describe('getFallbackCuisineIcon', () => {
  it('always returns "other"', () => {
    expect(getFallbackCuisineIcon()).toBe('other');
  });
});

describe('cuisineIcons mapping', () => {
  it('contains American cuisine mappings', () => {
    expect(cuisineIcons['American']).toBe('american');
    expect(cuisineIcons['New American']).toBe('american');
    expect(cuisineIcons['Southern']).toBe('american');
  });

  it('contains Asian cuisine mappings', () => {
    expect(cuisineIcons['Asian']).toBe('asian');
    expect(cuisineIcons['Asian Fusion']).toBe('asian');
  });

  it('contains Chinese cuisine mappings', () => {
    expect(cuisineIcons['Chinese']).toBe('chinese');
    expect(cuisineIcons['Dim Sum']).toBe('chinese');
  });

  it('contains Japanese cuisine mappings', () => {
    expect(cuisineIcons['Japanese']).toBe('japanese');
    expect(cuisineIcons['Sushi']).toBe('japanese');
  });

  it('contains Korean cuisine mappings', () => {
    expect(cuisineIcons['Korean']).toBe('korean');
    expect(cuisineIcons['Korean BBQ']).toBe('korean');
  });

  it('contains Thai cuisine mappings', () => {
    expect(cuisineIcons['Thai']).toBe('thai');
    expect(cuisineIcons['Pad Thai']).toBe('thai');
  });

  it('contains Vietnamese cuisine mappings', () => {
    expect(cuisineIcons['Vietnamese']).toBe('vietnamese');
    expect(cuisineIcons['Pho']).toBe('vietnamese');
  });

  it('contains Indian cuisine mappings', () => {
    expect(cuisineIcons['Indian']).toBe('indian');
    expect(cuisineIcons['Curry']).toBe('indian');
  });

  it('contains Mexican cuisine mappings', () => {
    expect(cuisineIcons['Mexican']).toBe('mexican');
    expect(cuisineIcons['Tacos']).toBe('mexican');
  });

  it('contains Italian cuisine mappings', () => {
    expect(cuisineIcons['Italian']).toBe('italian');
    expect(cuisineIcons['Pizza']).toBe('pizza');
  });

  it('contains French cuisine mappings', () => {
    expect(cuisineIcons['French']).toBe('french');
    expect(cuisineIcons['Bistro']).toBe('french');
  });

  it('contains Mediterranean cuisine mappings', () => {
    expect(cuisineIcons['Mediterranean']).toBe('mediterranean');
    expect(cuisineIcons['Greek']).toBe('greek');
  });

  it('contains Middle Eastern cuisine mappings', () => {
    expect(cuisineIcons['Middle Eastern']).toBe('middle-eastern');
    expect(cuisineIcons['Turkish']).toBe('turkish');
  });

  it('contains African cuisine mappings', () => {
    expect(cuisineIcons['African']).toBe('african');
    expect(cuisineIcons['Ethiopian']).toBe('ethiopian');
  });

  it('contains European cuisine mappings', () => {
    expect(cuisineIcons['European']).toBe('european');
    expect(cuisineIcons['German']).toBe('german');
  });

  it('contains Seafood mappings', () => {
    expect(cuisineIcons['Seafood']).toBe('seafood');
    expect(cuisineIcons['Oysters']).toBe('seafood');
  });

  it('contains BBQ mappings', () => {
    expect(cuisineIcons['BBQ']).toBe('bbq');
    expect(cuisineIcons['Grill']).toBe('bbq');
  });

  it('contains Vegetarian and Vegan mappings', () => {
    expect(cuisineIcons['Vegetarian']).toBe('vegetarian');
    expect(cuisineIcons['Vegan']).toBe('vegan');
  });

  it('contains Dessert and Bakery mappings', () => {
    expect(cuisineIcons['Dessert']).toBe('dessert');
    expect(cuisineIcons['Bakery']).toBe('dessert');
  });

  it('contains Cafe mappings', () => {
    expect(cuisineIcons['Cafe']).toBe('cafe');
    expect(cuisineIcons['Coffee Shop']).toBe('cafe');
  });
});
