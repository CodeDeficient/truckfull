import { describe, expect, it } from '@jest/globals';
import { buildTruckFaq } from '@/lib/truck-profile/faq';
import type { TruckFaqEntry } from '@/lib/truck-profile/faq';
import type { TruckProfileView } from '@/lib/truck-profile/profileView';

function view(overrides: Partial<TruckProfileView>): TruckProfileView {
  return {
    id: 'id-1',
    slug: 'test-truck',
    name: 'Test Truck',
    description: null,
    city: null,
    state: null,
    cuisines: [],
    priceRange: null,
    photoUrl: null,
    phone: null,
    email: null,
    website: null,
    facebook: null,
    instagram: null,
    address: null,
    lat: null,
    lng: null,
    menu: [],
    menuItemCount: 0,
    hours: [],
    hasPublishedHours: false,
    isClaimed: false,
    nextStop: null,
    timezone: null,
    scheduleUpdate: null,
    ...overrides,
  };
}

function entry(entries: readonly TruckFaqEntry[], id: string): TruckFaqEntry {
  const found = entries.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`missing faq entry ${id}`);
  return found;
}

const rich = view({
  city: 'Augusta',
  state: 'GA',
  cuisines: ['Southern', 'BBQ'],
  phone: '706-555-0100',
  website: 'https://example.com',
  instagram: 'https://instagram.com/test',
  menuItemCount: 12,
  hasPublishedHours: true,
  isClaimed: true,
});

const lunchStop = {
  serviceDate: '2026-10-15',
  startTime: '11:00',
  endTime: '14:00',
  isAllDay: false,
  place: '123 Broad St, Augusta, GA',
};

const sparse = view({ city: 'Columbia', state: 'SC' });

describe('buildTruckFaq', () => {
  it('answers every question from real data for a rich, claimed listing', () => {
    const faq = buildTruckFaq(rich);
    expect(faq.map((item) => item.id)).toEqual([
      'where',
      'next-stop',
      'cuisine',
      'menu',
      'hours',
      'contact',
      'booking',
      'claim',
      'freshness',
    ]);
    expect(entry(faq, 'cuisine').answer).toBe('Test Truck serves Southern and BBQ food.');
    expect(entry(faq, 'cuisine').links.map((link) => link.href)).toEqual([
      '/cuisine/southern',
      '/cuisine/bbq',
    ]);
    expect(entry(faq, 'menu').answer).toContain('12 items');
    expect(entry(faq, 'hours').answer).toContain('usual weekly hours');
    expect(entry(faq, 'contact').answer).toBe(
      'You can reach Test Truck by phone, through their website, and on Instagram. Their details are listed on this page.',
    );
    expect(entry(faq, 'claim').answer).toContain('has claimed this listing');
    expect(entry(faq, 'claim').links).toEqual([]);
  });

  it('qualifies the city instead of presenting it as a live location', () => {
    const where = entry(buildTruckFaq(rich), 'where');
    expect(where.answer).toContain('listed in the Augusta, GA area');
    expect(where.answer).toContain("don't have a confirmed upcoming stop");
    expect(where.links).toEqual([{ label: 'Open the live map', href: '/?truck=test-truck' }]);
  });

  it('uses honest fallbacks with a next action for a sparse, unclaimed listing', () => {
    const faq = buildTruckFaq(sparse);
    expect(entry(faq, 'cuisine').answer).toContain('not sure yet');
    expect(entry(faq, 'menu').answer).toContain("haven't found it yet");
    expect(entry(faq, 'hours').answer).toContain("don't have hours");
    expect(entry(faq, 'contact').answer).toContain("haven't found a public way");
    expect(entry(faq, 'claim').links).toEqual([
      { label: 'Claim this listing', href: '/claim-your-truck' },
    ]);
    for (const id of ['cuisine', 'menu', 'hours', 'contact']) {
      expect(entry(faq, id).links).toEqual([{ label: 'Send us a correction', href: '/contact' }]);
    }
  });

  it('prefers real values over fallbacks field by field in a mixed listing', () => {
    const faq = buildTruckFaq(
      view({ city: 'Macon', state: 'GA', cuisines: ['Mexican'], email: 'a@b.co' }),
    );
    expect(entry(faq, 'cuisine').answer).toBe('Test Truck serves Mexican food.');
    expect(entry(faq, 'contact').answer).toContain('by email');
    expect(entry(faq, 'menu').answer).toContain("haven't found it yet");
    expect(entry(faq, 'hours').answer).toContain("don't have hours");
  });

  it('does not invent a location when the city or state is missing', () => {
    for (const partial of [{ city: 'Augusta' }, { state: 'GA' }, { city: '  ', state: 'GA' }]) {
      const where = entry(buildTruckFaq(view(partial)), 'where');
      expect(where.answer).toContain('still looking for where');
      expect(where.answer).not.toContain('Augusta');
    }
  });

  it('ignores blank cuisine and contact values', () => {
    const faq = buildTruckFaq(view({ cuisines: ['  '], phone: ' ' }));
    expect(entry(faq, 'cuisine').answer).toContain('not sure yet');
    expect(entry(faq, 'contact').answer).toContain("haven't found a public way");
  });

  it('says booking is likely but routes requests to the truck and the waitlist', () => {
    const booking = entry(buildTruckFaq(rich), 'booking');
    expect(booking.question).toBe('Can I book Test Truck for catering or a private event?');
    expect(booking.answer).toContain('Most likely!');
    expect(booking.answer).toContain(
      'contact Test Truck directly by phone, through their website, and on Instagram to ask',
    );
    expect(booking.answer).toContain('newman@truckfull.food');
    expect(booking.links).toEqual([
      {
        label: 'Join the booking waitlist',
        href: 'mailto:newman@truckfull.food?subject=Booking%20waitlist',
      },
    ]);
  });

  it('does not point to contact channels that do not exist when answering booking', () => {
    const booking = entry(buildTruckFaq(sparse), 'booking');
    expect(booking.answer).toContain(
      "isn't ready quite yet, and we haven't found a public way to reach Test Truck.",
    );
    expect(booking.answer).not.toContain('directly');
  });

  it('gives the next confirmed stop for a claimed truck', () => {
    const faq = buildTruckFaq({ ...rich, nextStop: lunchStop });
    expect(entry(faq, 'next-stop').answer).toBe(
      "Test Truck's next confirmed stop is Thursday, October 15 from 11:00 AM to 2:00 PM at 123 Broad St, Augusta, GA. Plans can change, so check with them before heading out.",
    );
    expect(entry(faq, 'where').answer).toBe(
      'Test Truck serves the Augusta, GA area, and their next confirmed stop is at 123 Broad St, Augusta, GA.',
    );
  });

  it('describes all-day stops and stops without a place', () => {
    const faq = buildTruckFaq({
      ...rich,
      nextStop: { ...lunchStop, isAllDay: true, startTime: null, endTime: null, place: null },
    });
    expect(entry(faq, 'next-stop').answer).toContain('is Thursday, October 15. Plans');
    expect(entry(faq, 'where').answer).toContain('listed in the Augusta, GA area');
  });

  it('never shows a schedule for an unclaimed truck', () => {
    const faq = buildTruckFaq({
      ...sparse,
      nextStop: lunchStop,
      scheduleUpdate: { date: '2026-10-03', source: 'manual' },
    });
    expect(entry(faq, 'next-stop').answer).toContain('Once the owner claims this listing');
    expect(entry(faq, 'next-stop').links).toEqual([
      { label: 'Claim this listing', href: '/claim-your-truck' },
    ]);
    expect(entry(faq, 'where').answer).not.toContain('123 Broad St');
    expect(entry(faq, 'freshness').answer).toContain("hasn't been confirmed by the owner");
  });

  it('points a claimed truck with no upcoming stop at its weekly hours', () => {
    expect(entry(buildTruckFaq(rich), 'next-stop').answer).toBe(
      'No upcoming stop is confirmed yet. Their usual weekly hours are listed on this page.',
    );
  });

  it('dates the last schedule update and names its source', () => {
    const owner = buildTruckFaq({
      ...rich,
      scheduleUpdate: { date: '2026-10-03', source: 'manual' },
    });
    expect(entry(owner, 'freshness').answer).toBe(
      "Test Truck's schedule was last updated on October 3, 2026.",
    );
    const facebook = buildTruckFaq({
      ...rich,
      scheduleUpdate: { date: '2026-09-28', source: 'facebook' },
    });
    expect(entry(facebook, 'freshness').answer).toBe(
      "Test Truck's schedule was last updated from their Facebook page on September 28, 2026.",
    );
    expect(entry(buildTruckFaq(rich), 'freshness').answer).toContain('The owner manages');
  });

  it('never emits placeholders or em dashes', () => {
    for (const truck of [rich, sparse, view({}), { ...rich, nextStop: lunchStop }]) {
      for (const item of buildTruckFaq(truck)) {
        const text = `${item.question} ${item.answer}`;
        expect(text).not.toMatch(/\[[A-Z][a-z]+( [A-Z][a-z]+)?\]|undefined|null|—/);
      }
    }
  });
});
