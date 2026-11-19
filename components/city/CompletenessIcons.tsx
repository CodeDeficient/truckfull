import type { JSX } from 'react';
import { BadgeCheck, Globe, Mail, MapPin, Phone, Share2, UtensilsCrossed } from 'lucide-react';
import {
  COMPLETENESS_KEYS,
  type CompletenessFlags,
  type CompletenessKey,
} from '@/lib/city/truckCompleteness';

export const COMPLETENESS_LABELS: Readonly<Record<CompletenessKey, string>> = {
  address: 'Address',
  phone: 'Phone',
  email: 'Email',
  website: 'Website',
  social: 'Social media',
  menu: 'Menu',
  claimed: 'Claimed by owner',
};

export const COMPLETENESS_ICONS: Readonly<Record<CompletenessKey, typeof MapPin>> = {
  address: MapPin,
  phone: Phone,
  email: Mail,
  website: Globe,
  social: Share2,
  menu: UtensilsCrossed,
  claimed: BadgeCheck,
};

export const COMPLETENESS_TONES: Readonly<
  Record<CompletenessKey, { readonly on: string; readonly icon: string }>
> = {
  address: { on: 'bg-amber-400 text-black', icon: 'text-amber-400' },
  phone: { on: 'bg-emerald-400 text-black', icon: 'text-emerald-400' },
  email: { on: 'bg-cyan-400 text-black', icon: 'text-cyan-400' },
  website: { on: 'bg-violet-400 text-black', icon: 'text-violet-400' },
  social: { on: 'bg-pink-400 text-black', icon: 'text-pink-400' },
  menu: { on: 'bg-orange-400 text-black', icon: 'text-orange-400' },
  claimed: { on: 'bg-blue-500 text-white', icon: 'text-blue-400' },
};

export function CompletenessIcons({
  flags,
}: {
  readonly flags: CompletenessFlags;
}): JSX.Element | null {
  const present = COMPLETENESS_KEYS.filter((key) => flags[key]);
  if (present.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Listing includes">
      {present.map((key) => {
        const Icon = COMPLETENESS_ICONS[key];
        return (
          <li key={key} title={COMPLETENESS_LABELS[key]}>
            <Icon aria-hidden className={`size-4 ${COMPLETENESS_TONES[key].icon}`} />
            <span className="sr-only">{COMPLETENESS_LABELS[key]}</span>
          </li>
        );
      })}
    </ul>
  );
}
