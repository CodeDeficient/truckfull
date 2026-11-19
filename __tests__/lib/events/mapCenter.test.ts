import { describe, it, expect } from '@jest/globals';
import {
  AUGUSTA_CENTER,
  AUGUSTA_RADIUS_ORIGIN,
  resolveMapCenter,
  resolveRadiusOrigin,
} from '@/lib/events/mapCenter';

describe('AUGUSTA_CENTER', () => {
  it('latitude is 33.4735 (not US center 39.8)', () => {
    expect(AUGUSTA_CENTER.latitude).toBe(33.4735);
  });

  it('longitude is -81.9748 (not US center -98.5)', () => {
    expect(AUGUSTA_CENTER.longitude).toBe(-81.9748);
  });

  it('zoom is 7 (regional Southeast view, not 4 continental)', () => {
    expect(AUGUSTA_CENTER.zoom).toBe(7);
  });
});

describe('AUGUSTA_RADIUS_ORIGIN', () => {
  it('has isFallback: true', () => {
    expect(AUGUSTA_RADIUS_ORIGIN.isFallback).toBe(true);
  });

  it('lat is 33.4735, lng is -81.9748 (matches AUGUSTA_CENTER)', () => {
    expect(AUGUSTA_RADIUS_ORIGIN.lat).toBe(33.4735);
    expect(AUGUSTA_RADIUS_ORIGIN.lng).toBe(-81.9748);
  });
});

describe('resolveMapCenter', () => {
  it('returns GPS coords with zoom 9 when GPS available', () => {
    const gps = { lat: 32.0, lng: -81.0 };
    const result = resolveMapCenter(gps, null);
    expect(result.latitude).toBe(32.0);
    expect(result.longitude).toBe(-81.0);
    expect(result.zoom).toBe(9);
  });

  it('returns IP coords with zoom 9 when GPS null but IP available', () => {
    const ip = { lat: 33.0, lng: -80.0 };
    const result = resolveMapCenter(null, ip);
    expect(result.latitude).toBe(33.0);
    expect(result.longitude).toBe(-80.0);
    expect(result.zoom).toBe(9);
  });

  it('returns AUGUSTA_CENTER when both GPS and IP are null', () => {
    const result = resolveMapCenter(null, null);
    expect(result).toEqual(AUGUSTA_CENTER);
    expect(result.zoom).toBe(7);
  });

  it('GPS takes priority over IP', () => {
    const gps = { lat: 32.0, lng: -81.0 };
    const ip = { lat: 40.0, lng: -100.0 };
    const result = resolveMapCenter(gps, ip);
    expect(result.latitude).toBe(32.0);
    expect(result.longitude).toBe(-81.0);
  });
});

describe('resolveRadiusOrigin', () => {
  it('returns GPS coords with isFallback: false', () => {
    const gps = { lat: 32.0, lng: -81.0 };
    const result = resolveRadiusOrigin(gps, null);
    expect(result.lat).toBe(32.0);
    expect(result.lng).toBe(-81.0);
    expect(result.isFallback).toBe(false);
  });

  it('returns IP coords with isFallback: false', () => {
    const ip = { lat: 33.0, lng: -80.0 };
    const result = resolveRadiusOrigin(null, ip);
    expect(result.lat).toBe(33.0);
    expect(result.lng).toBe(-80.0);
    expect(result.isFallback).toBe(false);
  });

  it('returns AUGUSTA_RADIUS_ORIGIN when both null', () => {
    const result = resolveRadiusOrigin(null, null);
    expect(result.lat).toBe(33.4735);
    expect(result.lng).toBe(-81.9748);
    expect(result.isFallback).toBe(true);
  });

  it('GPS takes priority over IP', () => {
    const gps = { lat: 32.0, lng: -81.0 };
    const ip = { lat: 40.0, lng: -100.0 };
    const result = resolveRadiusOrigin(gps, ip);
    expect(result.lat).toBe(32.0);
    expect(result.lng).toBe(-81.0);
    expect(result.isFallback).toBe(false);
  });

  it('does not mutate AUGUSTA_RADIUS_ORIGIN when returning fallback', () => {
    const original = { ...AUGUSTA_RADIUS_ORIGIN };
    const result = resolveRadiusOrigin(null, null);
    result.lat = 0;
    result.lng = 0;
    result.isFallback = false;
    expect(AUGUSTA_RADIUS_ORIGIN).toEqual(original);
  });

  it('does not mutate AUGUSTA_CENTER when returning fallback', () => {
    const original = { ...AUGUSTA_CENTER };
    const result = resolveMapCenter(null, null);
    result.latitude = 0;
    result.longitude = 0;
    result.zoom = 0;
    expect(AUGUSTA_CENTER).toEqual(original);
  });
});