export type EventCategory =
  | 'festival'
  | 'market'
  | 'concert'
  | 'sports'
  | 'community'
  | 'food_drink'
  | 'art_culture'
  | 'holiday'
  | 'charity'
  | 'business'
  | 'other';

export interface CategoryInfo {
  category: EventCategory;
  label: string;
  icon: string;
  color: string;
}

const CATEGORY_RULES: {
  category: EventCategory;
  keywords: RegExp;
  label: string;
  icon: string;
  color: string;
}[] = [
  {
    category: 'festival',
    keywords: /\b(festival|fest|fair|jamboree|celebration|jubilee)\b/i,
    label: 'Festival',
    icon: '🎪',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  {
    category: 'market',
    keywords: /\b(market|farmers.?market|flea.?market|bazaar|marketplace|pop.?up)\b/i,
    label: 'Market',
    icon: '🛒',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  {
    category: 'concert',
    keywords: /\b(concert|music|live.?music|symphony|orchestra|jazz|band|performance|recital)\b/i,
    label: 'Music',
    icon: '🎵',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  {
    category: 'sports',
    keywords:
      /\b(race|run|5k|10k|marathon|half.?marathon|tournament|regatta|triathlon|cycling|bike)\b/i,
    label: 'Sports',
    icon: '🏃',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  {
    category: 'food_drink',
    keywords: /\b(food|cook|bbq|barbecue|brew|wine|beer|taste|culinary|bake|grill|popup)\b/i,
    label: 'Food & Drink',
    icon: '🍽️',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  {
    category: 'art_culture',
    keywords: /\b(art|gallery|exhibit|theater|theatre|dance|ballet|opera|film|movie|cinema)\b/i,
    label: 'Art & Culture',
    icon: '🎨',
    color: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  },
  {
    category: 'holiday',
    keywords:
      /\b(christmas|halloween|thanksgiving|easter|fourth|july.?4|new.?year|st.?patrick|juneteenth|valentine|memorial|labor.?day| MLK)\b/i,
    label: 'Holiday',
    icon: '🎉',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  {
    category: 'charity',
    keywords: /\b(charity|fundraiser|benefit|donation|walkathon|relay|awareness)\b/i,
    label: 'Charity',
    icon: '💝',
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  },
  {
    category: 'community',
    keywords:
      /\b(block.?party|neighborhood|community|picnic|gathering|reunion|heritage|cultural)\b/i,
    label: 'Community',
    icon: '🏘️',
    color: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  },
  {
    category: 'business',
    keywords: /\b(networking|mixer|expo|trade.?show|conference|summit|lunch.?and.?learn)\b/i,
    label: 'Business',
    icon: '💼',
    color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  },
];

const DEFAULT_CATEGORY: CategoryInfo = {
  category: 'other',
  label: 'Event',
  icon: '📅',
  color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export function classifyEvent(title: string, description?: string | null): CategoryInfo {
  const text = `${title} ${description ?? ''}`;
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(text)) {
      return {
        category: rule.category,
        label: rule.label,
        icon: rule.icon,
        color: rule.color,
      };
    }
  }
  return DEFAULT_CATEGORY;
}

export const ALL_CATEGORIES: CategoryInfo[] = [
  ...CATEGORY_RULES.map((r) => ({
    category: r.category,
    label: r.label,
    icon: r.icon,
    color: r.color,
  })),
  DEFAULT_CATEGORY,
];
