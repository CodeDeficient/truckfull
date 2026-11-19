import { jest } from '@jest/globals';
import { getVettingBadgeColor, getPinShape } from '../pinSprites';

describe('pinSprites', () => {
  describe('getVettingBadgeColor', () => {
    it('returns green for score >= 70', () => {
      expect(getVettingBadgeColor(70)).toBe('green');
      expect(getVettingBadgeColor(85)).toBe('green');
      expect(getVettingBadgeColor(100)).toBe('green');
    });

    it('returns yellow for score 40-69', () => {
      expect(getVettingBadgeColor(40)).toBe('yellow');
      expect(getVettingBadgeColor(55)).toBe('yellow');
      expect(getVettingBadgeColor(69)).toBe('yellow');
    });

    it('returns gray for score < 40', () => {
      expect(getVettingBadgeColor(0)).toBe('gray');
      expect(getVettingBadgeColor(20)).toBe('gray');
      expect(getVettingBadgeColor(39)).toBe('gray');
    });

    it('returns gray for null score', () => {
      expect(getVettingBadgeColor(null)).toBe('gray');
      expect(getVettingBadgeColor(undefined as unknown as number)).toBe('gray');
    });
  });

  describe('getPinShape', () => {
    it('returns circle for platform source', () => {
      expect(getPinShape('platform')).toBe('circle');
    });

    it('returns shield for government sources', () => {
      expect(getPinShape('eproval')).toBe('shield');
      expect(getPinShape('civicplus_rss')).toBe('shield');
    });

    it('returns pin for other external sources', () => {
      expect(getPinShape('eventbrite')).toBe('pin');
      expect(getPinShape('tourism_html')).toBe('pin');
      expect(getPinShape('algolia_api')).toBe('pin');
      expect(getPinShape('timely_api')).toBe('pin');
      expect(getPinShape('ical')).toBe('pin');
      expect(getPinShape('aiken_playwright')).toBe('pin');
      expect(getPinShape('simpleview_rss')).toBe('pin');
    });
  });
});
