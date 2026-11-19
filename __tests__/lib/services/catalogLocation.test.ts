import { describe, it, expect } from '@jest/globals';
import { toCatalogLocation } from '@/lib/services/catalogLocation';

describe('toCatalogLocation', () => {
  it('keeps only latitude and longitude', () => {
    expect(
      toCatalogLocation({ lat: 33.47, lng: -81.97, address: '123 Broad St', zip: '30901' }),
    ).toEqual({ lat: 33.47, lng: -81.97 });
  });

  it('returns null when either coordinate is missing or not a usable number', () => {
    expect(toCatalogLocation({ lat: 33.47, address: '123 Broad St' })).toBeNull();
    expect(toCatalogLocation({ lat: '33.47', lng: '-81.97' })).toBeNull();
    expect(toCatalogLocation({ lat: Number.NaN, lng: -81.97 })).toBeNull();
  });

  it('returns null for an absent location', () => {
    expect(toCatalogLocation(null)).toBeNull();
    expect(toCatalogLocation(undefined)).toBeNull();
    expect(toCatalogLocation('Augusta, GA')).toBeNull();
  });
});
