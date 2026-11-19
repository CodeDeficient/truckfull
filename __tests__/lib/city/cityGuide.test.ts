import { describe, expect, it } from '@jest/globals';
import {
  buildCityGuideStats,
  buildCityIntro,
  countCuisines,
  filterCuisineNames,
} from '@/lib/city/cityGuide';
import { generateCityFaq } from '@/lib/seo/keywords';

const trucks = [
  { cuisine_type: ['BBQ', 'Southern'] },
  { cuisine_type: ['BBQ', 'BBQ'] },
  { cuisine_type: ['Mexican'] },
  { cuisine_type: null },
];

describe('countCuisines', () => {
  it('counts each truck once per cuisine and sorts by count then name', () => {
    expect(countCuisines(trucks)).toEqual([
      ['BBQ', 2],
      ['Mexican', 1],
      ['Southern', 1],
    ]);
  });
});

describe('buildCityGuideStats', () => {
  it('reports listings, cuisine count and the most common cuisine', () => {
    expect(buildCityGuideStats(4, countCuisines(trucks))).toEqual({
      listingCount: 4,
      cuisineCount: 3,
      topCuisine: 'BBQ',
    });
  });

  it('has no top cuisine when no truck lists one', () => {
    expect(buildCityGuideStats(1, []).topCuisine).toBeNull();
  });
});

describe('buildCityIntro', () => {
  it('states the exact listing count and the top three cuisines', () => {
    const cuisines = countCuisines(trucks);
    expect(buildCityIntro('Augusta', 'GA', buildCityGuideStats(4, cuisines), cuisines)).toMatch(
      /^TruckFull lists 4 food trucks and mobile vendors in Augusta, GA, serving BBQ, Mexican and Southern\./,
    );
  });

  it('uses the singular and omits cuisines when none are listed', () => {
    expect(buildCityIntro('Evans', 'GA', buildCityGuideStats(1, []), [])).toMatch(
      /^TruckFull lists 1 food truck or mobile vendor in Evans, GA\. /,
    );
  });
});

describe('generateCityFaq', () => {
  it('states the listed count without inflating it', () => {
    const text = generateCityFaq('Augusta', 'GA', 12, ['BBQ'])
      .map((item) => item.answer)
      .join(' ');
    expect(text).toContain('TruckFull lists 12 food trucks in Augusta');
    expect(text).not.toMatch(/over 12|operating in/);
  });

  it('uses the singular for a city with one listing', () => {
    const text = generateCityFaq('Evans', 'GA', 1, [])
      .map((item) => item.answer)
      .join(' ');
    expect(text).toContain('TruckFull lists 1 food truck in Evans');
    expect(text).not.toContain('1 food trucks');
  });
});

describe('generateCityFaq signals', () => {
  it('gives the direct-booking answer with the real phone count', () => {
    const booking = generateCityFaq('Augusta', 'GA', 12, ['BBQ'], {
      withPhone: 5,
      eventCount: 0,
    }).find((item) => item.question.startsWith('How do I book'));
    expect(booking?.answer).toBe(
      'Contact the truck directly to agree on the menu, date and price. 5 of the 12 Augusta listings on TruckFull include a phone number. TruckFull is not a booking agency and adds no fees.',
    );
  });

  it('adds an events question only when the city has events', () => {
    const question = 'Are there food truck events in Augusta?';
    const withEvents = generateCityFaq('Augusta', 'GA', 12, [], { withPhone: 0, eventCount: 1 });
    expect(withEvents.find((item) => item.question === question)?.answer).toBe(
      'Yes. TruckFull lists 1 upcoming food truck event in Augusta, with the date and location for each.',
    );
    expect(generateCityFaq('Augusta', 'GA', 12, []).map((item) => item.question)).not.toContain(
      question,
    );
  });
});

describe('filterCuisineNames', () => {
  const names = ['BBQ', 'Mexican', 'Tex-Mex', 'Southern'];

  it('matches case-insensitively anywhere in the name', () => {
    expect([...filterCuisineNames(names, '  mex ')]).toEqual(['Mexican', 'Tex-Mex']);
  });

  it('keeps every cuisine for a blank query', () => {
    expect(filterCuisineNames(names, '   ').size).toBe(4);
  });
});
