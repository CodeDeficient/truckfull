export const MENU_ITEM_CUISINES = {
  tacos: 'Mexican',
  tortas: 'Mexican',
  quesadillas: 'Mexican',
  burritos: 'Mexican',
  burgers: 'American',
  wings: 'American',
  'hot dogs': 'American',
  sandwiches: 'American',
  'po boys': 'Southern',
  'smoked meats': 'Southern',
  'finger foods': 'Southern',
  shrimp: 'Seafood',
  catfish: 'Seafood',
  flounder: 'Seafood',
  oyster: 'Seafood',
  oysters: 'Seafood',
  ribs: 'BBQ',
  brisket: 'BBQ',
  'pulled pork': 'BBQ',
  pasta: 'Italian',
  lasagna: 'Italian',
  'fried rice': 'Chinese',
  'lo mein': 'Chinese',
  'egg rolls': 'Chinese',
  'cold brew': 'Coffee',
  latte: 'Coffee',
  espresso: 'Coffee',
  gelati: 'Ice Cream',
  swirls: 'Ice Cream',
  sundaes: 'Ice Cream',
};

const toCuisineSlug = (name) =>
  name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '');

export const CUISINE_SLUG_REDIRECTS = {
  dessert: 'desserts',
  barbecue: 'bbq',
  candy: 'desserts',
  'dirty-sodas': 'beverages',
  'smash-burgers': 'american',
  'chicken-wings': 'american',
  'fried-chicken': 'southern',
  ...Object.fromEntries(
    Object.entries(MENU_ITEM_CUISINES).map(([item, cuisine]) => [
      toCuisineSlug(item),
      toCuisineSlug(cuisine),
    ]),
  ),
};

export const cuisineRedirects = Object.entries(CUISINE_SLUG_REDIRECTS).map(([from, to]) => ({
  source: `/cuisine/${from}`,
  destination: `/cuisine/${to}`,
  permanent: true,
}));
