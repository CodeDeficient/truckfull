import { describe, it, expect } from '@jest/globals';
import {
  getMobileGridCols,
  getTabTouchTargetClass,
  getCollapseBtnClass,
  MOBILE_TAB_MIN_HEIGHT_PX,
  COLLAPSE_BTN_MIN_SIZE_PX,
} from '@/app/owner-dashboard/_components/eventsTabLayout';

describe('eventsTabLayout - mobile touch target helpers', () => {
  describe('MOBILE_TAB_MIN_HEIGHT_PX', () => {
    it('is at least 44px (Apple HIG minimum touch target)', () => {
      expect(MOBILE_TAB_MIN_HEIGHT_PX).toBeGreaterThanOrEqual(44);
    });
  });

  describe('COLLAPSE_BTN_MIN_SIZE_PX', () => {
    it('is at least 44px (Apple HIG minimum touch target)', () => {
      expect(COLLAPSE_BTN_MIN_SIZE_PX).toBeGreaterThanOrEqual(44);
    });
  });

  describe('getMobileGridCols', () => {
    it('returns 4-column grid for 6 tabs (standard free tier)', () => {
      const result = getMobileGridCols(6);
      expect(result).toContain('grid-cols-4');
    });

    it('returns 4-column grid with span-2 for 7 tabs (pro tier)', () => {
      const result = getMobileGridCols(7);
      expect(result).toContain('grid-cols-4');
    });

    it('includes gap class for spacing between buttons', () => {
      const result = getMobileGridCols(6);
      expect(result).toContain('gap-2');
    });

    it('includes justify items center class', () => {
      const result = getMobileGridCols(6);
      expect(result).toContain('justify-items-center');
    });
  });

  describe('getTabTouchTargetClass', () => {
    it('returns class with min-h-16 for adequate touch target (64px)', () => {
      const result = getTabTouchTargetClass();
      expect(result).toContain('min-h-16');
    });

    it('includes w-full for full width tap area', () => {
      const result = getTabTouchTargetClass();
      expect(result).toContain('w-full');
    });

    it('includes rounded-lg for visual consistency', () => {
      const result = getTabTouchTargetClass();
      expect(result).toContain('rounded-lg');
    });
  });

  describe('getCollapseBtnClass', () => {
    it('returns class with minimum 44px touch target size', () => {
      const result = getCollapseBtnClass();
      expect(result).toMatch(/min-w-\[44px\]|min-h-\[44px\]/);
    });

    it('includes self-center for alignment', () => {
      const result = getCollapseBtnClass();
      expect(result).toContain('self-center');
    });

    it('includes padding for easier tapping', () => {
      const result = getCollapseBtnClass();
      expect(result).toMatch(/p-\d/);
    });
  });
});
