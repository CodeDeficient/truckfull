import { stripMenuFromTrucks } from '@/lib/utils/menuLazyLoad';

export const LIST_CONTACT_KEYS = ['website', 'instagram', 'facebook', 'tiktok'] as const;

export const DIRECT_CONTACT_KEY = /phone|e_?mail|telephone|fax/i;

export const EMAIL_PATTERN = /[\w.%+-]{1,64}@[\w-]{1,63}(?:\.[\w-]{1,63}){1,4}/g;

export const PHONE_PATTERN = /(?:\+?1[\s.-])?(?:\(\d{3}\)\s?|\b\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const SENTENCE_BREAK = /(?<=[.!?])\s+/;

function hasDirectContact(text: string): boolean {
  return text.search(EMAIL_PATTERN) !== -1 || text.search(PHONE_PATTERN) !== -1;
}

export function redactDirectContact(text: string): string {
  if (!hasDirectContact(text)) return text;
  return text
    .split(SENTENCE_BREAK)
    .filter((sentence) => !hasDirectContact(sentence))
    .join(' ')
    .trim();
}

export function listContactInfo(contact: unknown): Record<string, string> {
  if (!isRecord(contact)) return {};
  const kept: Record<string, string> = {};
  for (const key of LIST_CONTACT_KEYS) {
    const value = contact[key];
    if (typeof value === 'string' && value.trim() !== '') kept[key] = value;
  }
  return kept;
}

function scrub(value: unknown): unknown {
  if (typeof value === 'string') return redactDirectContact(value);
  if (Array.isArray(value)) return value.map((entry) => scrub(entry));
  if (!isRecord(value)) return value;
  const scrubbed: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!DIRECT_CONTACT_KEY.test(key)) scrubbed[key] = scrub(entry);
  }
  return scrubbed;
}

function toListItem(truck: Record<string, unknown>): Record<string, unknown> {
  const item = scrub(truck) as Record<string, unknown>;
  if ('contact_info' in truck) item.contact_info = listContactInfo(truck.contact_info);
  return item;
}

export function toPublicTruckList<T extends object>(trucks: readonly T[]): T[] {
  const items = trucks.map((truck) => toListItem({ ...(truck as Record<string, unknown>) }));
  return stripMenuFromTrucks(items) as unknown as T[];
}
