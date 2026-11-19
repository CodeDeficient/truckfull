import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server.node';
import { CityHub } from '@/components/city/CityHub';
import type { StateCityGroup } from '@/lib/city/cityDirectory';

const CITY_COUNT = 1016;

function groups(): StateCityGroup[] {
  const cities = Array.from({ length: CITY_COUNT }, (_, i) => ({
    city: `Town ${String(i)}`,
    state: 'NC',
    count: 1,
  }));
  return [{ state: 'NC', stateName: 'North Carolina', truckCount: CITY_COUNT, cities }];
}

describe('city hub list markup', () => {
  it('styles city links from the list instead of on every link', () => {
    const html = renderToString(
      <CityHub groups={groups()} backdrop={null} intro={null} topCities={null} />,
    );
    expect(html).toContain('hub-city-list');
    expect(html).toContain('href="/city/town-0-nc"');
    expect(html).not.toMatch(/<a[^>]*class="[^"]*border-b/);
    expect(html.length / CITY_COUNT).toBeLessThan(130);
  });
});
