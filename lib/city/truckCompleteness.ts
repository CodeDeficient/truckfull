export const COMPLETENESS_KEYS = [
  'address',
  'phone',
  'email',
  'website',
  'social',
  'menu',
  'claimed',
] as const;

export type CompletenessKey = (typeof COMPLETENESS_KEYS)[number];

export type CompletenessFlags = Readonly<Record<CompletenessKey, boolean>>;

export interface CompletenessSource {
  readonly street_address: string | null;
  readonly contact_info: unknown;
  readonly social_media: unknown;
  readonly menu: unknown;
  readonly is_claimed: boolean | null;
}

const SOCIAL_KEYS = ['facebook', 'instagram', 'tiktok', 'twitter', 'x', 'youtube', 'linktree'] as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasMenu(menu: unknown): boolean {
  if (Array.isArray(menu)) return menu.length > 0;
  return Object.keys(asRecord(menu)).length > 0;
}

export function getCompletenessFlags(source: CompletenessSource): CompletenessFlags {
  const contact = asRecord(source.contact_info);
  const social = asRecord(source.social_media);
  return {
    address: hasText(source.street_address),
    phone: hasText(contact.phone),
    email: hasText(contact.email),
    website: hasText(contact.website),
    social: SOCIAL_KEYS.some((key) => hasText(social[key])),
    menu: hasMenu(source.menu),
    claimed: source.is_claimed === true,
  };
}

export function completenessScore(flags: CompletenessFlags): number {
  return COMPLETENESS_KEYS.reduce((total, key) => total + (flags[key] ? 1 : 0), 0);
}

export function matchesAll(flags: CompletenessFlags, required: ReadonlySet<CompletenessKey>): boolean {
  for (const key of required) if (!flags[key]) return false;
  return true;
}
