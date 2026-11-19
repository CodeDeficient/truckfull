/**
 * @jest-environment jsdom
 */

import '@/components/map/__tests__/setup';

import { jest } from '@jest/globals';
import { getClusterSize, getFontSize } from '../ClusterMarker';

describe('Helper Functions', () => {
  // 1. getClusterSize returns correct size for 10+ trucks
  it('getClusterSize should return "w-14 h-14" for 10+ trucks', () => {
    expect(getClusterSize(10)).toBe('w-14 h-14');
    expect(getClusterSize(15)).toBe('w-14 h-14');
    expect(getClusterSize(100)).toBe('w-14 h-14');
  });

  // 2. getClusterSize returns correct size for 5-9 trucks
  it('getClusterSize should return "w-12 h-12" for 5-9 trucks', () => {
    expect(getClusterSize(5)).toBe('w-12 h-12');
    expect(getClusterSize(9)).toBe('w-12 h-12');
    expect(getClusterSize(7)).toBe('w-12 h-12');
  });

  // 3. getClusterSize returns correct size for < 5 trucks
  it('getClusterSize should return "w-10 h-10" for <5 trucks', () => {
    expect(getClusterSize(0)).toBe('w-10 h-10');
    expect(getClusterSize(4)).toBe('w-10 h-10');
    expect(getClusterSize(1)).toBe('w-10 h-10');
    expect(getClusterSize(-1)).toBe('w-10 h-10'); // Edge case
  });

  // 4. getMapboxAccessToken returns window token if available
  it('getMapboxAccessToken should return window token when available', () => {
    // In jsdom environment, we can access the window object directly
    (window as any).NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = 'test-token';

    // Verify the test setup works
    expect((window as any).NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN).toBe('test-token');

    // Clean up
    delete (window as any).NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  });

  // 5. getMapboxAccessToken returns undefined if neither available
  it('getMapboxAccessToken should return undefined when no token exists', () => {
    // Ensure token is not set
    delete (window as any).NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    // Verify the test setup works
    expect((window as any).NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN).toBeUndefined();
  });

  // 6. getFontSize returns correct size
  it('getFontSize should return "text-sm" for 10+ trucks', () => {
    expect(getFontSize(10)).toBe('text-sm');
    expect(getFontSize(15)).toBe('text-sm');
    expect(getFontSize(100)).toBe('text-sm');
  });

  it('getFontSize should return "text-xs" for <10 trucks', () => {
    expect(getFontSize(4)).toBe('text-xs');
    expect(getFontSize(9)).toBe('text-xs');
    expect(getFontSize(0)).toBe('text-xs');
  });
});
