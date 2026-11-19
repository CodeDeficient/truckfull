import { describe, it, expect } from '@jest/globals';
import {
  deriveSourceType,
  getSourceLabel,
  getSourceTypeLabel,
  getSourceUrl,
} from '@/components/map/sourceUtils';

describe('permit sources', () => {
  it('derives arcgis_permits from city permit source names', () => {
    expect(deriveSourceType('durham_permits')).toBe('arcgis_permits');
    expect(deriveSourceType('raleigh_permits')).toBe('arcgis_permits');
  });

  it('labels permit sources as city permits', () => {
    expect(getSourceLabel('durham_permits')).toBe('City Permit');
    expect(getSourceLabel('arcgis_permits')).toBe('City Permit');
    expect(getSourceTypeLabel('raleigh_permits')).toBe('City Permit');
    expect(getSourceTypeLabel('arcgis_permits')).toBe('City Permit');
  });

  it('has no generic link for permit sources but keeps an event link', () => {
    expect(getSourceUrl('durham_permits')).toBeNull();
    expect(getSourceUrl('durham_permits', 'https://example.org/event')).toBe(
      'https://example.org/event',
    );
  });
});
