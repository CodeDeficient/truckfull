import { slugifyCuisine } from '@/lib/utils/slugify';
import type { NextStop } from '@/lib/truck-profile/nextStop';
import type { ProfileScheduleUpdate, TruckProfileView } from '@/lib/truck-profile/profileView';

export interface TruckFaqLink {
  readonly label: string;
  readonly href: string;
}

export interface TruckFaqEntry {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly links: readonly TruckFaqLink[];
}

type ContactChannel = 'phone' | 'email' | 'website' | 'facebook' | 'instagram';

export interface TruckFaqFacts {
  readonly name: string;
  readonly slug: string;
  readonly area: { readonly kind: 'city'; readonly label: string } | { readonly kind: 'unknown' };
  readonly cuisines: readonly string[];
  readonly menuItemCount: number;
  readonly hasPublishedHours: boolean;
  readonly contactChannels: readonly ContactChannel[];
  readonly isClaimed: boolean;
  readonly nextStop: NextStop | null;
  readonly scheduleUpdate: ProfileScheduleUpdate | null;
}

const CONTACT_LABELS: Record<ContactChannel, string> = {
  phone: 'by phone',
  email: 'by email',
  website: 'through their website',
  facebook: 'on Facebook',
  instagram: 'on Instagram',
};

const CLAIM_LINK: TruckFaqLink = { label: 'Claim this listing', href: '/claim-your-truck' };

const CORRECTION_LINK: TruckFaqLink = { label: 'Send us a correction', href: '/contact' };

const BOOKING_WAITLIST_LINK: TruckFaqLink = {
  label: 'Join the booking waitlist',
  href: `mailto:newman@truckfull.food?subject=${encodeURIComponent('Booking waitlist')}`,
};

function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

export function buildTruckFaqFacts(truck: TruckProfileView): TruckFaqFacts {
  const city = truck.city?.trim();
  const state = truck.state?.trim();
  const channels: ContactChannel[] = [];
  if (truck.phone?.trim()) channels.push('phone');
  if (truck.email?.trim()) channels.push('email');
  if (truck.website) channels.push('website');
  if (truck.facebook) channels.push('facebook');
  if (truck.instagram) channels.push('instagram');

  return {
    name: truck.name,
    slug: truck.slug,
    area: city && state ? { kind: 'city', label: `${city}, ${state}` } : { kind: 'unknown' },
    cuisines: truck.cuisines.map((cuisine) => cuisine.trim()).filter(Boolean),
    menuItemCount: truck.menuItemCount,
    hasPublishedHours: truck.hasPublishedHours,
    contactChannels: channels,
    isClaimed: truck.isClaimed,
    nextStop: truck.isClaimed ? truck.nextStop : null,
    scheduleUpdate: truck.isClaimed ? truck.scheduleUpdate : null,
  };
}

function formatDateKey(dateKey: string, withYear: boolean): string {
  return new Date(`${dateKey}T12:00:00.000Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: withYear ? undefined : 'long',
    month: 'long',
    day: 'numeric',
    year: withYear ? 'numeric' : undefined,
  });
}

function formatClock(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function describeStopTime(stop: NextStop): string {
  if (stop.isAllDay || !stop.startTime) return '';
  if (!stop.endTime) return ` starting at ${formatClock(stop.startTime)}`;
  return ` from ${formatClock(stop.startTime)} to ${formatClock(stop.endTime)}`;
}

function describeStop(stop: NextStop): string {
  const day = formatDateKey(stop.serviceDate, false);
  const time = describeStopTime(stop);
  const place = stop.place ? ` at ${stop.place}` : '';
  return `${day}${time}${place}`;
}

function whereEntry(facts: TruckFaqFacts): TruckFaqEntry {
  const question = `Where can I find ${facts.name}?`;
  if (facts.nextStop?.place) {
    const lead =
      facts.area.kind === 'city'
        ? `${facts.name} serves the ${facts.area.label} area, and their`
        : `${facts.name}'s`;
    return {
      id: 'where',
      question,
      answer: `${lead} next confirmed stop is at ${facts.nextStop.place}.`,
      links: [{ label: 'Open the live map', href: `/?truck=${facts.slug}` }],
    };
  }
  if (facts.area.kind === 'unknown') {
    return {
      id: 'where',
      question,
      answer: `We're still looking for where ${facts.name} serves. If you've seen them out, let us know.`,
      links: [CORRECTION_LINK],
    };
  }
  return {
    id: 'where',
    question,
    answer: `${facts.name} is listed in the ${facts.area.label} area. We don't have a confirmed upcoming stop yet, so check with them before heading out.`,
    links: [{ label: 'Open the live map', href: `/?truck=${facts.slug}` }],
  };
}

function nextStopEntry(facts: TruckFaqFacts): TruckFaqEntry {
  const question = `When is ${facts.name} serving next?`;
  if (facts.nextStop) {
    return {
      id: 'next-stop',
      question,
      answer: `${facts.name}'s next confirmed stop is ${describeStop(facts.nextStop)}. Plans can change, so check with them before heading out.`,
      links: [],
    };
  }
  if (facts.isClaimed) {
    const hours = facts.hasPublishedHours
      ? ' Their usual weekly hours are listed on this page.'
      : '';
    return {
      id: 'next-stop',
      question,
      answer: `No upcoming stop is confirmed yet.${hours}`,
      links: [],
    };
  }
  return {
    id: 'next-stop',
    question,
    answer: `No upcoming stop is confirmed yet. Once the owner claims this listing, they can post where they'll be next.`,
    links: [CLAIM_LINK],
  };
}

function cuisineEntry(facts: TruckFaqFacts): TruckFaqEntry {
  const question = `What kind of food does ${facts.name} serve?`;
  if (facts.cuisines.length === 0) {
    return {
      id: 'cuisine',
      question,
      answer: `We're not sure yet what ${facts.name} serves. If you know, we'd love to hear it.`,
      links: [CORRECTION_LINK],
    };
  }
  return {
    id: 'cuisine',
    question,
    answer: `${facts.name} serves ${joinList(facts.cuisines)} food.`,
    links: facts.cuisines.map((cuisine) => ({
      label: `More ${cuisine} trucks`,
      href: `/cuisine/${slugifyCuisine(cuisine)}`,
    })),
  };
}

function menuEntry(facts: TruckFaqFacts): TruckFaqEntry {
  const question = `Does ${facts.name} have a menu?`;
  if (facts.menuItemCount > 0) {
    const items = facts.menuItemCount === 1 ? '1 item' : `${facts.menuItemCount} items`;
    return {
      id: 'menu',
      question,
      answer: `Yes. We have ${items} from their menu on this page. Prices and items can change, so the truck has the final word.`,
      links: [],
    };
  }
  return {
    id: 'menu',
    question,
    answer: `${facts.name} may have one, but we haven't found it yet.`,
    links: [CORRECTION_LINK],
  };
}

function hoursEntry(facts: TruckFaqFacts): TruckFaqEntry {
  const question = `When is ${facts.name} open?`;
  if (facts.hasPublishedHours) {
    return {
      id: 'hours',
      question,
      answer: `Their usual weekly hours are listed on this page. Food trucks move around, so confirm with them before you go.`,
      links: [],
    };
  }
  return {
    id: 'hours',
    question,
    answer: `We don't have hours for ${facts.name} yet.`,
    links: [CORRECTION_LINK],
  };
}

function contactEntry(facts: TruckFaqFacts): TruckFaqEntry {
  const question = `How can I contact ${facts.name}?`;
  if (facts.contactChannels.length === 0) {
    return {
      id: 'contact',
      question,
      answer: `${facts.name} is a rare one. We haven't found a public way to reach them yet. If you have one, send it our way.`,
      links: [CORRECTION_LINK],
    };
  }
  const ways = joinList(facts.contactChannels.map((channel) => CONTACT_LABELS[channel]));
  return {
    id: 'contact',
    question,
    answer: `You can reach ${facts.name} ${ways}. Their details are listed on this page.`,
    links: [],
  };
}

function bookingEntry(facts: TruckFaqFacts): TruckFaqEntry {
  const reach =
    facts.contactChannels.length === 0
      ? `and we haven't found a public way to reach ${facts.name}`
      : `so you'll have to contact ${facts.name} directly ${joinList(facts.contactChannels.map((channel) => CONTACT_LABELS[channel]))} to ask`;
  return {
    id: 'booking',
    question: `Can I book ${facts.name} for catering or a private event?`,
    answer: `Most likely! Nearly every food truck and caterer takes catering and private event requests. Our booking system isn't ready quite yet, ${reach}. If you'd like to book through TruckFull when it launches, email newman@truckfull.food to join the waitlist.`,
    links: [BOOKING_WAITLIST_LINK],
  };
}

function claimEntry(facts: TruckFaqFacts): TruckFaqEntry {
  const question = `Is this listing managed by the owner?`;
  if (facts.isClaimed) {
    return {
      id: 'claim',
      question,
      answer: `Yes. The owner of ${facts.name} has claimed this listing on TruckFull.`,
      links: [],
    };
  }
  return {
    id: 'claim',
    question,
    answer: `Not yet. If you own ${facts.name}, you can claim it for free to keep your details up to date.`,
    links: [CLAIM_LINK],
  };
}

function freshnessEntry(facts: TruckFaqFacts): TruckFaqEntry {
  const question = `How current is the information about ${facts.name}?`;
  if (facts.scheduleUpdate) {
    const date = formatDateKey(facts.scheduleUpdate.date, true);
    const answer =
      facts.scheduleUpdate.source === 'manual'
        ? `${facts.name}'s schedule was last updated on ${date}.`
        : `${facts.name}'s schedule was last updated from their Facebook page on ${date}.`;
    return { id: 'freshness', question, answer, links: [] };
  }
  if (facts.isClaimed) {
    return {
      id: 'freshness',
      question,
      answer: `The owner manages this listing and can update it at any time.`,
      links: [],
    };
  }
  return {
    id: 'freshness',
    question,
    answer: `This listing is built from public sources and hasn't been confirmed by the owner yet, so some details may be out of date.`,
    links: [CORRECTION_LINK],
  };
}

export function buildTruckFaq(truck: TruckProfileView): TruckFaqEntry[] {
  const facts = buildTruckFaqFacts(truck);
  return [
    whereEntry(facts),
    nextStopEntry(facts),
    cuisineEntry(facts),
    menuEntry(facts),
    hoursEntry(facts),
    contactEntry(facts),
    bookingEntry(facts),
    claimEntry(facts),
    freshnessEntry(facts),
  ];
}
