import { parseIntersectionStreets, buildQuery } from '@/lib/utils/geocoding/overpass';

describe('overpass pure functions', () => {
  describe('parseIntersectionStreets', () => {
    it('parses intersection with & separator', () => {
      const result = parseIntersectionStreets('Main St & Broad St, Savannah, GA');
      expect(result).toEqual({
        street1: 'Main St',
        street2: 'Broad St',
        city: 'Savannah',
        state: 'GA',
      });
    });

    it('parses intersection with and separator', () => {
      const result = parseIntersectionStreets('Main St and Broad St, Savannah, GA');
      expect(result).toEqual({
        street1: 'Main St',
        street2: 'Broad St',
        city: 'Savannah',
        state: 'GA',
      });
    });

    it('parses intersection without city/state', () => {
      const result = parseIntersectionStreets('Main St & Broad St');
      expect(result).toEqual({
        street1: 'Main St',
        street2: 'Broad St',
        city: '',
        state: '',
      });
    });

    it('returns null for empty string', () => {
      expect(parseIntersectionStreets('')).toBeNull();
    });

    it('returns null for non-intersection address', () => {
      expect(parseIntersectionStreets('123 Main St, Savannah, GA')).toBeNull();
    });

    it('returns null for intersection with only one street', () => {
      const result = parseIntersectionStreets('Main St & , Savannah, GA');
      expect(result?.street1).toBe('Main St');
      expect(result?.street2).toBe(', Savannah, GA');
    });

    it('handles extra whitespace', () => {
      const result = parseIntersectionStreets('Main St & Broad St, Savannah, GA');
      expect(result?.street1).toBe('Main St');
      expect(result?.street2).toBe('Broad St');
    });

    it('handles multi-word city names', () => {
      const result = parseIntersectionStreets('Main St & Broad St, Los Angeles, CA');
      expect(result?.city).toBe('Los Angeles');
      expect(result?.state).toBe('CA');
    });
  });

  describe('buildQuery', () => {
    it('builds valid Overpass QL query', () => {
      const query = buildQuery('Main St', 'Broad St', 'Savannah');
      expect(query).toContain('[out:json]');
      expect(query).toContain('[timeout:10]');
      expect(query).toContain('area[name="Savannah"]');
      expect(query).toContain('way[highway][name="Main St"]');
      expect(query).toContain('way[highway][name="Broad St"]');
    });

    it('generates node intersection query', () => {
      const query = buildQuery('Main St', 'Broad St', 'Savannah');
      expect(query).toContain('node(w.w1)(w.w2)');
      expect(query).toContain('out;');
    });
  });
});
