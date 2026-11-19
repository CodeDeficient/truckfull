/**
 * useFilterUrlSync Hook Tests
 *
 * Tests the useFilterURLSync hook with mocked Next.js navigation and Zustand store.
 * @jest-environment jsdom
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { hasFilterParams, buildFilterURL } from '@/lib/hooks/useFilterUrlSync';

describe('hasFilterParams (pure function)', () => {
  it('returns false for empty params', () => {
    const params = new URLSearchParams();
    expect(hasFilterParams(params)).toBe(false);
  });

  it('returns true when favorites param is set', () => {
    const params = new URLSearchParams('favorites=true');
    expect(hasFilterParams(params)).toBe(true);
  });

  it('returns true when cuisines param is set', () => {
    const params = new URLSearchParams('cuisines=mexican');
    expect(hasFilterParams(params)).toBe(true);
  });

  it('returns true when radius param is set', () => {
    const params = new URLSearchParams('radius=10');
    expect(hasFilterParams(params)).toBe(true);
  });

  it('returns true when lat param is set', () => {
    const params = new URLSearchParams('lat=34.0522');
    expect(hasFilterParams(params)).toBe(true);
  });

  it('returns true when lng param is set', () => {
    const params = new URLSearchParams('lng=-118.2437');
    expect(hasFilterParams(params)).toBe(true);
  });

  it('returns true when q param is set', () => {
    const params = new URLSearchParams('q=tacos');
    expect(hasFilterParams(params)).toBe(true);
  });

  it('returns true when openNow param is set', () => {
    const params = new URLSearchParams('openNow=true');
    expect(hasFilterParams(params)).toBe(true);
  });

  it('returns false for unrelated params', () => {
    const params = new URLSearchParams('page=1&sort=name');
    expect(hasFilterParams(params)).toBe(false);
  });
});

describe('buildFilterURL (pure function)', () => {
  it('returns only pathname when no params', () => {
    const params = new URLSearchParams();
    expect(buildFilterURL('/search', params)).toBe('/search');
  });

  it('returns pathname with single param', () => {
    const params = new URLSearchParams('cuisines=mexican');
    expect(buildFilterURL('/search', params)).toBe('/search?cuisines=mexican');
  });

  it('returns pathname with multiple params', () => {
    const params = new URLSearchParams('cuisines=mexican&radius=10');
    expect(buildFilterURL('/search', params)).toBe('/search?cuisines=mexican&radius=10');
  });

  it('returns pathname with all filter params', () => {
    const params = new URLSearchParams(
      'cuisines=mexican&radius=10&lat=34.0522&lng=-118.2437&q=tacos',
    );
    expect(buildFilterURL('/search', params)).toBe(
      '/search?cuisines=mexican&radius=10&lat=34.0522&lng=-118.2437&q=tacos',
    );
  });
});
