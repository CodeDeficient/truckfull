import { describe, expect, it } from '@jest/globals';
import { shouldReuseTruckMenu } from '@/lib/utils/menuLazyLoad';

const MENU_DATA = {
  menu: [{ name: 'Tacos', items: [{ name: 'Beef Taco', price: 5 }] }],
  menu_items: [{ name: 'Beef Taco', price: 5 }],
};

describe('shouldReuseTruckMenu', () => {
  it('should reuse menu data for the same truck ID', () => {
    expect(shouldReuseTruckMenu('truck-1', 'truck-1', MENU_DATA)).toBe(true);
  });

  it('should not reuse menu data for a different truck ID', () => {
    expect(shouldReuseTruckMenu('truck-1', 'truck-2', MENU_DATA)).toBe(false);
  });

  it('should not reuse when there is no menu data', () => {
    expect(shouldReuseTruckMenu('truck-1', 'truck-1', null)).toBe(false);
  });
});
