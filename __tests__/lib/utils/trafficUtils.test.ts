/**
 * Traffic Utilities Tests
 */

import {
  parseLocationName,
  formatAADT,
  formatDistance,
  getTrafficLevelInfo,
} from '@/lib/utils/trafficUtils';

describe('trafficUtils', () => {
  describe('parseLocationName', () => {
    it('should return station ID when description is null', () => {
      expect(parseLocationName(null, '123')).toBe('Station 123');
    });

    it('should return station ID when description is empty', () => {
      expect(parseLocationName('', '456')).toBe('Station 456');
    });

    it('should expand RD to Rd', () => {
      expect(parseLocationName('S- 144 (BETTIS ACADEMY RD) TO S...', '789')).toBe(
        'Bettis Academy Rd to S...',
      );
    });

    it('should expand ST to St', () => {
      expect(parseLocationName('MAIN ST', '123')).toBe('Main St');
    });

    it('should expand AVE to Ave', () => {
      expect(parseLocationName('WASHINGTON AVE', '123')).toBe('Washington Ave');
    });

    it('should expand BLVD to Blvd', () => {
      expect(parseLocationName('MEMORIAL BLVD', '123')).toBe('Memorial Blvd');
    });

    it('should expand DR to Dr', () => {
      expect(parseLocationName('OAK DR', '123')).toBe('Oak Dr');
    });

    it('should expand HWY to Hwy', () => {
      expect(parseLocationName('US HWY 1', '123')).toBe('Us Hwy 1');
    });

    it('should expand LN to Ln', () => {
      expect(parseLocationName('PARK LN', '123')).toBe('Park Ln');
    });

    it('should expand CT to Ct', () => {
      expect(parseLocationName('CENTER CT', '123')).toBe('Center Ct');
    });

    it('should expand PL to Pl', () => {
      expect(parseLocationName('SPRING PL', '123')).toBe('Spring Pl');
    });

    it('should parse DOT location with TO separator', () => {
      expect(parseLocationName('S- 136 (BETHLEHEM RD) TO US 15 (HARTSVILLE HWY)', '123')).toBe(
        'Bethlehem Rd to Hartsville Hwy',
      );
    });

    it('should handle multiple TO separators', () => {
      expect(parseLocationName('A (ROAD 1) TO B (ROAD 2) TO C (ROAD 3)', '123')).toBe(
        'Road 1 to Road 2 to Road 3',
      );
    });

    it('should extract parenthetical content when present', () => {
      expect(parseLocationName('US 1 (COLUMBIA HWY N) TO S- 49...', '123')).toBe(
        'Columbia Hwy N to S- 49...',
      );
    });

    it('should handle description without TO separator', () => {
      expect(parseLocationName('SC 230 (W MARTINTOWN RD)', '123')).toBe('W Martintown Rd');
    });

    it('should ignore NO NAME in parentheticals', () => {
      expect(parseLocationName('S- 144 (NO NAME) TO S...', '123')).toBe('S- 144 to S...');
    });

    it('should handle complex DOT format', () => {
      expect(parseLocationName('SC 230 (W MARTINTOWN RD) TO US...', '123')).toBe(
        'W Martintown Rd to Us...',
      );
    });
  });

  describe('formatAADT', () => {
    it('should format numbers less than 1000 as-is', () => {
      expect(formatAADT(850)).toBe('850');
    });

    it('should format 1000 as 1.0K', () => {
      expect(formatAADT(1000)).toBe('1.0K');
    });

    it('should format 12500 as 12.5K', () => {
      expect(formatAADT(12500)).toBe('12.5K');
    });

    it('should format large numbers with one decimal', () => {
      expect(formatAADT(1500000)).toBe('1500.0K');
    });

    it('should handle edge case of 999', () => {
      expect(formatAADT(999)).toBe('999');
    });

    it('should handle zero', () => {
      expect(formatAADT(0)).toBe('0');
    });
  });

  describe('formatDistance', () => {
    it('should format distance in miles when >= 1 mile', () => {
      expect(formatDistance(1610)).toBe('1.0 mi');
    });

    it('should format 2.5 miles correctly', () => {
      expect(formatDistance(4023)).toBe('2.5 mi');
    });

    it('should format less than 1 mile in feet', () => {
      expect(formatDistance(500)).toBe('1640 ft');
    });

    it('should format 1000 feet correctly', () => {
      expect(formatDistance(304.8)).toBe('1000 ft');
    });

    it('should handle zero meters', () => {
      expect(formatDistance(0)).toBe('0 ft');
    });

    it('should handle very small distances', () => {
      expect(formatDistance(1)).toBe('3 ft');
    });

    it('should format 10 miles correctly', () => {
      expect(formatDistance(16093)).toBe('10.0 mi');
    });
  });

  describe('getTrafficLevelInfo', () => {
    it('should return Very High Traffic for percentile >= 80', () => {
      expect(getTrafficLevelInfo(80)).toEqual({
        label: 'Very High Traffic',
        color: 'bg-red-500 text-white',
      });
      expect(getTrafficLevelInfo(100)).toEqual({
        label: 'Very High Traffic',
        color: 'bg-red-500 text-white',
      });
    });

    it('should return High Traffic for percentile >= 60 and < 80', () => {
      expect(getTrafficLevelInfo(60)).toEqual({
        label: 'High Traffic',
        color: 'bg-orange-500 text-white',
      });
      expect(getTrafficLevelInfo(79)).toEqual({
        label: 'High Traffic',
        color: 'bg-orange-500 text-white',
      });
    });

    it('should return Medium Traffic for percentile >= 40 and < 60', () => {
      expect(getTrafficLevelInfo(40)).toEqual({
        label: 'Medium Traffic',
        color: 'bg-yellow-500 text-black',
      });
      expect(getTrafficLevelInfo(59)).toEqual({
        label: 'Medium Traffic',
        color: 'bg-yellow-500 text-black',
      });
    });

    it('should return Moderate Traffic for percentile >= 20 and < 40', () => {
      expect(getTrafficLevelInfo(20)).toEqual({
        label: 'Moderate Traffic',
        color: 'bg-green-500 text-white',
      });
      expect(getTrafficLevelInfo(39)).toEqual({
        label: 'Moderate Traffic',
        color: 'bg-green-500 text-white',
      });
    });

    it('should return Low Traffic for percentile < 20', () => {
      expect(getTrafficLevelInfo(0)).toEqual({
        label: 'Low Traffic',
        color: 'bg-gray-500 text-white',
      });
      expect(getTrafficLevelInfo(19)).toEqual({
        label: 'Low Traffic',
        color: 'bg-gray-500 text-white',
      });
    });

    it('should handle boundary at exactly 20', () => {
      expect(getTrafficLevelInfo(19)).toEqual({
        label: 'Low Traffic',
        color: 'bg-gray-500 text-white',
      });
      expect(getTrafficLevelInfo(20)).toEqual({
        label: 'Moderate Traffic',
        color: 'bg-green-500 text-white',
      });
    });

    it('should handle boundary at exactly 40', () => {
      expect(getTrafficLevelInfo(39)).toEqual({
        label: 'Moderate Traffic',
        color: 'bg-green-500 text-white',
      });
      expect(getTrafficLevelInfo(40)).toEqual({
        label: 'Medium Traffic',
        color: 'bg-yellow-500 text-black',
      });
    });

    it('should handle boundary at exactly 60', () => {
      expect(getTrafficLevelInfo(59)).toEqual({
        label: 'Medium Traffic',
        color: 'bg-yellow-500 text-black',
      });
      expect(getTrafficLevelInfo(60)).toEqual({
        label: 'High Traffic',
        color: 'bg-orange-500 text-white',
      });
    });

    it('should handle boundary at exactly 80', () => {
      expect(getTrafficLevelInfo(79)).toEqual({
        label: 'High Traffic',
        color: 'bg-orange-500 text-white',
      });
      expect(getTrafficLevelInfo(80)).toEqual({
        label: 'Very High Traffic',
        color: 'bg-red-500 text-white',
      });
    });
  });
});
