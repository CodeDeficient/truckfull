import { describe, it, expect } from '@jest/globals';
import { buildCityMetadata } from '@/lib/seo/cityMetadata';

describe('buildCityMetadata', () => {
  const input = {
    slug: 'augusta-ga',
    cityName: 'Augusta',
    stateName: 'GA',
    trucks: [
      { id: '1', name: 'Taco Express', slug: 'taco-express', description: 'Tacos', cuisine_type: ['Mexican', 'Tacos'], city: 'Augusta', state: 'GA', photo_url: null, operating_hours: null, is_claimed: null, view_count: null },
      { id: '2', name: 'Burger Palace', slug: 'burger-palace', description: 'Burgers', cuisine_type: ['American', 'Burgers'], city: 'Augusta', state: 'GA', photo_url: null, operating_hours: null, is_claimed: null, view_count: null },
    ],
  };

  it('should NOT include a month/year date or parentheses in the title', () => {
    const meta = buildCityMetadata(input);
    const title = meta.title as string;
    expect(title).toBe('Food Trucks in Augusta GA: Menus, Hours & Catering | TruckFull');
    expect(title).not.toContain('(');
    expect(title).not.toContain(')');
  });

  it('should include truck count in description', () => {
    const meta = buildCityMetadata(input);
    expect(meta.description).toContain('2');
    expect(meta.description).toContain('Augusta');
    expect(meta.description).toContain('GA');
  });

  it('names events in the title and description only when the city has some', () => {
    const meta = buildCityMetadata({ ...input, eventCount: 1 });
    expect(meta.title).toBe('Food Trucks in Augusta GA: Menus, Catering & Events | TruckFull');
    expect(meta.description).toBe(
      'Find 2 food trucks in Augusta GA serving American, Burgers and Mexican. See menus, hours and contact details, book a truck directly with no middleman fees, and find 1 upcoming food truck event.',
    );
  });

  it('should include canonical URL', () => {
    const meta = buildCityMetadata(input);
    expect(meta.alternates?.canonical).toBe('https://www.truckfull.food/city/augusta-ga');
  });

  it('should have openGraph type website', () => {
    const meta = buildCityMetadata(input);
    expect(meta.openGraph?.type).toBe('website');
  });
});
