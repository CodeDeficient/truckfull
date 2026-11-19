import { jest, describe, it, expect } from '@jest/globals';
import { isEventBlocked } from '@/lib/events/eventRelevanceFilter';
import type { CalendarData } from '@/lib/events/types';

function makeEvent(overrides: Partial<CalendarData> = {}): CalendarData {
  return {
    calendarTitle: 'Some Event',
    calendarDescription: '',
    calendarCategory: '',
    calendarLocation: 'Forsyth Park, Savannah, GA',
    ...overrides,
  };
}

describe('isEventBlocked', () => {
  it('blocks government meetings', () => {
    expect(
      isEventBlocked(makeEvent({ calendarTitle: 'Downtown Development Authority Meeting' })),
    ).toBe(true);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'City Council Meeting' }))).toBe(true);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Planning Commission Session' }))).toBe(true);
  });

  it('blocks library events', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Storytime' }))).toBe(true);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Book Club' }))).toBe(true);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Teen Writing Club' }))).toBe(true);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Lego Club' }))).toBe(true);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Craft & Chat' }))).toBe(true);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Crochet Class' }))).toBe(true);
  });

  it('blocks recycling and holidays', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Blue Recycling Week' }))).toBe(true);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Good Friday Holiday Offices Closed' }))).toBe(
      true,
    );
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Closed Easter Sunday' }))).toBe(true);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Early Closure' }))).toBe(true);
  });

  it('blocks weddings and photo shoots', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Toller Wedding' }))).toBe(true);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'PF-Photo Shoot- River Street' }))).toBe(true);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Wedding Ceremony at Cathedral' }))).toBe(
      true,
    );
  });

  it('blocks sports season (recurring, not events)', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Spring Sports Season' }))).toBe(true);
  });

  it('allows food truck events', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Food Truck Downtown Event' }))).toBe(false);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Food Truck Fridays' }))).toBe(false);
  });

  it('allows festivals and cook-offs', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Boss Hog Cook-Off' }))).toBe(false);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Savannah Jazz Festival' }))).toBe(false);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Carnival' }))).toBe(false);
  });

  it('allows markets and fairs', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: "Forsyth Farmers' Market" }))).toBe(false);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'County Fair' }))).toBe(false);
  });

  it('allows concerts and live music', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Cece Winans in Concert' }))).toBe(false);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Spring House Music Fest' }))).toBe(false);
  });

  it('allows 5K runs and races', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'JEA 5K' }))).toBe(false);
    expect(isEventBlocked(makeEvent({ calendarTitle: "The Governor's Cup Road Race" }))).toBe(
      false,
    );
  });

  it('allows food-related events', () => {
    expect(
      isEventBlocked(makeEvent({ calendarTitle: 'Tasting Notes Wine and Food Celebration' })),
    ).toBe(false);
    expect(
      isEventBlocked(makeEvent({ calendarTitle: 'Candlelight: The Best of Hans Zimmer' })),
    ).toBe(false);
  });

  it('blocks internal/maintenance events', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Internal' }))).toBe(true);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Forsyth Fountain Maintenance' }))).toBe(true);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Daffin Park ALL - SEFT Hold' }))).toBe(true);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Close Out Date-No Permitted Events' }))).toBe(
      true,
    );
  });

  it('allows christmas markets and holiday festivals', () => {
    expect(
      isEventBlocked(
        makeEvent({ calendarTitle: "Plant Riverside District's Savannah Christmas Market" }),
      ),
    ).toBe(false);
    expect(
      isEventBlocked(
        makeEvent({
          calendarTitle: "Savannah's Waterfront Christmas on the River & Lighted Christmas Parade",
        }),
      ),
    ).toBe(false);
    expect(
      isEventBlocked(makeEvent({ calendarTitle: 'Chamber Holiday Oyster Roast and Pop-up Shops' })),
    ).toBe(false);
  });

  it('allows events with "classic" or "festival" in name despite "class" pattern', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: '42nd Annual Savannah Jazz Festival' }))).toBe(
      false,
    );
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Gator Rivers 3on3 Classic' }))).toBe(false);
    expect(
      isEventBlocked(
        makeEvent({ calendarTitle: 'National Festival of the States Concert Series' }),
      ),
    ).toBe(false);
  });

  it('allows birthday parties and street fairs', () => {
    expect(
      isEventBlocked(makeEvent({ calendarTitle: "LEOPOLD'S 103 ANNUAL BIRTHDAY PARTY" })),
    ).toBe(false);
    expect(
      isEventBlocked(makeEvent({ calendarTitle: 'Sulfur Studios First Friday Street Fair' })),
    ).toBe(false);
  });

  it('allows movie nights in parks', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Free Family Movie Night' }))).toBe(false);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'COS Parks & Recreation Movie Night' }))).toBe(
      false,
    );
  });

  it('allows watch parties', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Game Day Watch Party' }))).toBe(false);
  });

  it('still blocks holiday closures but not holiday festivals', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Holiday Schedule - Offices Closed' }))).toBe(
      true,
    );
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Holiday Hours' }))).toBe(true);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Independence Day Festival' }))).toBe(false);
  });

  it('still blocks actual training sessions', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Employee Training Session' }))).toBe(true);
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Fire Safety Training Program' }))).toBe(true);
  });

  it('allows races without training in the name', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Stone Stairs of Death Race' }))).toBe(false);
    expect(isEventBlocked(makeEvent({ calendarTitle: '5K Fun Run' }))).toBe(true);
  });
});

describe('isEventBlocked - expanded patterns', () => {
  it('blocks art exhibitions and gallery openings', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Abstract Art Exhibition Opening' }))).toBe(
      true,
    );
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Gallery Opening Reception' }))).toBe(true);
  });

  it('blocks academic lectures and presentations', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Guest Lecture: Modern Art History' }))).toBe(
      true,
    );
    expect(
      isEventBlocked(makeEvent({ calendarTitle: 'Research Presentation: Climate Change' })),
    ).toBe(true);
  });

  it('allows food truck rally despite "training" keyword', () => {
    expect(
      isEventBlocked(makeEvent({ calendarTitle: 'Food Truck Rally - Training Day Special' })),
    ).toBe(false);
  });

  it('allows vendor market events', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Spring Vendor Market' }))).toBe(false);
  });

  it('allows community festivals', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Community Fall Festival' }))).toBe(false);
  });

  it('does not block First Friday Art Walk (scoring, not blocking)', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'First Friday Art Walk' }))).toBe(false);
  });

  it('blocks gallery opening without reception keyword', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'New Gallery Opening' }))).toBe(true);
  });

  it('blocks gallery show events', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Contemporary Gallery Show' }))).toBe(true);
  });

  it('blocks art gallery events', () => {
    expect(isEventBlocked(makeEvent({ calendarTitle: 'Art Gallery Reception' }))).toBe(true);
  });
});

describe('comprehensive pattern verification', () => {
  describe('should PASS (not blocked)', () => {
    const passCases = [
      'Farmers Market',
      'Food Truck Festival',
      'Concert in the Park',
      'First Friday',
      'Jazz Festival',
      'Art Festival',
      'Live Music Event',
      'Block Party',
      'BBQ Cookout',
    ];

    for (const title of passCases) {
      it(`allows "${title}"`, () => {
        expect(isEventBlocked(makeEvent({ calendarTitle: title }))).toBe(false);
      });
    }
  });

  describe('should be BLOCKED (hard block)', () => {
    const blockedCases = [
      'Swim Lessons for Kids',
      'Art Class for Beginners',
      'Cooking Class',
      'Workshop',
      'Meeting',
      'Wedding Ceremony',
      'Gallery Opening',
    ];

    for (const title of blockedCases) {
      it(`blocks "${title}"`, () => {
        const event = makeEvent({ calendarTitle: title });
        expect(isEventBlocked(event)).toBe(true);
      });
    }
  });
});
