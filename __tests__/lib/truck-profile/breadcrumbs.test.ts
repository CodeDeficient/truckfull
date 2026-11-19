import { describe, expect, it } from '@jest/globals';
import { buildTruckBreadcrumbs, truckBreadcrumbJsonLd } from '@/lib/truck-profile/breadcrumbs';

describe('buildTruckBreadcrumbs', () => {
  it('links the city hub and the truck city page between home and the truck', () => {
    const crumbs = buildTruckBreadcrumbs({
      name: 'Brick City Soul',
      slug: 'brick-city-soul',
      city: 'Augusta',
      state: 'GA',
    });
    expect(crumbs).toEqual([
      { name: 'Home', path: '/' },
      { name: 'Food Trucks by City', path: '/trucks' },
      { name: 'Augusta Food Trucks', path: '/city/augusta-ga' },
      { name: 'Brick City Soul', path: '/brick-city-soul' },
    ]);
  });

  it('keeps multi-word cities that round-trip through the city slug', () => {
    const crumbs = buildTruckBreadcrumbs({
      name: 'T',
      slug: 't',
      city: 'North Augusta',
      state: 'SC',
    });
    expect(crumbs[2]).toEqual({
      name: 'North Augusta Food Trucks',
      path: '/city/north-augusta-sc',
    });
  });

  it.each([
    { city: null, state: 'GA' },
    { city: 'Augusta', state: null },
    { city: 'St. Matthews', state: 'SC' },
    { city: 'Augusta', state: 'Georgia' },
  ])('omits the city crumb when no matching city page exists for %o', ({ city, state }) => {
    const crumbs = buildTruckBreadcrumbs({ name: 'T', slug: 't', city, state });
    expect(crumbs.map((crumb) => crumb.path)).toEqual(['/', '/t']);
  });
});

describe('truckBreadcrumbJsonLd', () => {
  it('emits absolute positioned list items', () => {
    const jsonLd = truckBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Augusta Food Trucks', path: '/city/augusta-ga' },
      { name: 'Brick City Soul', path: '/brick-city-soul' },
    ]);
    expect(jsonLd).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.truckfull.food' },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Augusta Food Trucks',
          item: 'https://www.truckfull.food/city/augusta-ga',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Brick City Soul',
          item: 'https://www.truckfull.food/brick-city-soul',
        },
      ],
    });
  });
});
