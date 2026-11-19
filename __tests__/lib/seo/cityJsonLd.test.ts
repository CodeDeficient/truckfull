import { describe, it, expect } from '@jest/globals';
import { generateCityPageJsonLd, cityJsonLdString } from '@/lib/seo/cityJsonLd';

describe('generateCityPageJsonLd', () => {
  const input = {
    cityName: 'Augusta',
    stateName: 'GA',
    stateAbbr: 'GA',
    slug: 'augusta-ga',
    truckCount: 42,
    cuisines: ['American', 'Mexican', 'Italian'],
    pageUrl: 'https://www.truckfull.food/city/augusta-ga',
    baseUrl: 'https://www.truckfull.food',
  };

  it('should generate City schema with containedInPlace State', () => {
    const result = generateCityPageJsonLd(input);
    const city = result.find((s) => s['@type'] === 'City');
    expect(city).toBeDefined();
    expect(city!.name).toBe('Augusta');
    expect(city!.containedInPlace).toBeDefined();
    expect(city!.containedInPlace['@type']).toBe('State');
    expect(city!.containedInPlace.name).toBe('GA');
    expect(city!.url).toBe('https://www.truckfull.food/city/augusta-ga');
  });

  it('should generate ItemList with correct number of items', () => {
    const result = generateCityPageJsonLd(input);
    const itemList = result.find((s) => s['@type'] === 'ItemList');
    expect(itemList).toBeDefined();
    expect(itemList!.name).toBe('Food trucks in Augusta GA');
    expect(itemList!.numberOfItems).toBe(42);
    expect(itemList!.url).toBe('https://www.truckfull.food/city/augusta-ga');
  });

  it('should include a FoodEstablishment schema', () => {
    const result = generateCityPageJsonLd(input);
    const fe = result.find((s) => s['@type'] === 'FoodEstablishment');
    expect(fe).toBeDefined();
    expect(fe!.name).toBe('Food Trucks in Augusta, GA');
    expect(fe!.description).toContain('42');
    expect(fe!.description).toContain('American');
    expect(fe!.description).toContain('Italian');
    expect(fe!.url).toBe('https://www.truckfull.food/city/augusta-ga');
  });

  it('should have FoodEstablishment areaServed with City and containedInPlace', () => {
    const result = generateCityPageJsonLd(input);
    const fe = result.find((s) => s['@type'] === 'FoodEstablishment');
    expect(fe).toBeDefined();
    expect(fe!.areaServed).toBeDefined();
    expect(fe!.areaServed['@type']).toBe('City');
    expect(fe!.areaServed.name).toBe('Augusta');
    expect(fe!.areaServed.containedInPlace).toBeDefined();
    expect(fe!.areaServed.containedInPlace['@type']).toBe('State');
    expect(fe!.areaServed.containedInPlace.name).toBe('GA');
  });

  it('should have FoodEstablishment @id with #foodestablishment suffix', () => {
    const result = generateCityPageJsonLd(input);
    const fe = result.find((s) => s['@type'] === 'FoodEstablishment');
    expect(fe).toBeDefined();
    expect(fe!['@id']).toBe('https://www.truckfull.food/city/augusta-ga#foodestablishment');
  });

  it('should have FoodEstablishment parentOrganization with @id referencing Organization', () => {
    const result = generateCityPageJsonLd(input);
    const fe = result.find((s) => s['@type'] === 'FoodEstablishment');
    expect(fe).toBeDefined();
    expect(fe!.parentOrganization).toBeDefined();
    expect(fe!.parentOrganization['@id']).toBe('https://www.truckfull.food/#organization');
  });

  it('should return three schemas (City, FoodEstablishment, ItemList)', () => {
    const result = generateCityPageJsonLd(input);
    expect(result).toHaveLength(3);
  });

  it('should handle 0 trucks gracefully', () => {
    const result = generateCityPageJsonLd({ ...input, truckCount: 0 });
    const itemList = result.find((s) => s['@type'] === 'ItemList');
    expect(itemList.numberOfItems).toBe(0);
  });

  it('should serialize to valid JSON string', () => {
    const schemas = generateCityPageJsonLd(input);
    const str = cityJsonLdString(schemas);
    expect(typeof str).toBe('string');
    const parsed = JSON.parse(str);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]['@type']).toBe('City');
    expect(parsed[1]['@type']).toBe('FoodEstablishment');
  });
});
