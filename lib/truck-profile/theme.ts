export type CuisineAtmosphereId =
  | 'gem-smoke'
  | 'metaballs'
  | 'shaved-ice'
  | 'pixel-snow'
  | 'water'
  | 'iridescence'
  | 'liquid-metal'
  | 'warp'
  | 'prism'
  | 'heatmap'
  | 'aurora'
  | 'grain-gradient';

export interface CuisineTheme {
  readonly id: string;
  readonly atmosphere: CuisineAtmosphereId;
  readonly base: string;
  readonly deep: string;
  readonly accent: string;
  readonly glow: string;
  readonly cream: string;
  readonly mood: string;
}

const SOUTHERN = /\b(southern|soul|comfort|home cook|country|cajun|creole|fried)\b/i;
const SEAFOOD = /\b(seafood|fish|shrimp|oyster|crab|coastal|lowcountry|boil|po'? ?boy)\b/i;
const BBQ = /\b(bbq|barbecue|smoke|smoked|grill|pit|brisket|wing)\b/i;
const SWEET = /\b(dessert|ice cream|gelato|baker|bakery|pastry|sweet|candy|chocolate|donut|shaved ice|water ice|italian ice)\b/i;
const GARDEN = /\b(vegan|vegetarian|farm|fresh|salad|garden|juice|smoothie|poke|bowl)\b/i;

const THEMES: Record<string, CuisineTheme> = {
  southern: {
    id: 'southern',
    atmosphere: 'gem-smoke',
    base: '#170c06',
    deep: '#3a1c10',
    accent: '#d9541f',
    glow: '#f3a93c',
    cream: '#f6e7c8',
    mood: 'Cast-iron warmth and smoke',
  },
  coastal: {
    id: 'coastal',
    atmosphere: 'water',
    base: '#04141c',
    deep: '#0a2f3d',
    accent: '#1f7a8c',
    glow: '#bfe3e0',
    cream: '#eaf6f5',
    mood: 'Tides, salt and light',
  },
  bbq: {
    id: 'bbq',
    atmosphere: 'gem-smoke',
    base: '#120803',
    deep: '#3a1206',
    accent: '#d13a12',
    glow: '#ffb347',
    cream: '#f3e2c7',
    mood: 'Embers and long smoke',
  },
  sweet: {
    id: 'sweet',
    atmosphere: 'shaved-ice',
    base: '#1a0f16',
    deep: '#3d1f33',
    accent: '#e0568a',
    glow: '#ffd8e6',
    cream: '#fdeef4',
    mood: 'Soft pastel sugar',
  },
  garden: {
    id: 'garden',
    atmosphere: 'grain-gradient',
    base: '#0e1a12',
    deep: '#1f3a28',
    accent: '#4f9d57',
    glow: '#d6ef9f',
    cream: '#eef6e3',
    mood: 'Morning growth and breeze',
  },
  default: {
    id: 'default',
    atmosphere: 'grain-gradient',
    base: '#141010',
    deep: '#2c1414',
    accent: '#ef4444',
    glow: '#ffcf6b',
    cream: '#f7ead2',
    mood: 'Warm and local',
  },
};

export function resolveCuisineTheme(cuisines: readonly string[]): CuisineTheme {
  const joined = cuisines.join(' ').toLowerCase();
  if (SOUTHERN.test(joined)) return THEMES.southern;
  if (SEAFOOD.test(joined)) return THEMES.coastal;
  if (BBQ.test(joined)) return THEMES.bbq;
  if (SWEET.test(joined)) return THEMES.sweet;
  if (GARDEN.test(joined)) return THEMES.garden;
  return THEMES.default;
}
