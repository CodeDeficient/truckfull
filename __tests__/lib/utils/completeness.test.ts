import { describe, it, expect } from '@jest/globals';
import { isTruckCompleteForMVP } from '../../../lib/utils/completeness';

describe('isTruckCompleteForMVP', () => {
  it('should return false for null', () => {
    expect(isTruckCompleteForMVP(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isTruckCompleteForMVP(undefined)).toBe(false);
  });

  it('should return false for primitive values', () => {
    expect(isTruckCompleteForMVP('string' as unknown)).toBe(false);
    expect(isTruckCompleteForMVP(123 as unknown)).toBe(false);
    expect(isTruckCompleteForMVP(true as unknown)).toBe(false);
  });

  it('should return false for empty object', () => {
    expect(isTruckCompleteForMVP({})).toBe(false);
  });

  it('should return false for object missing id', () => {
    expect(isTruckCompleteForMVP({ name: 'Truck Name' })).toBe(false);
  });

  it('should return false for object missing name', () => {
    expect(isTruckCompleteForMVP({ id: 'truck-1' })).toBe(false);
  });

  it('should return false for object with empty id string', () => {
    expect(isTruckCompleteForMVP({ id: '', name: 'Truck Name' })).toBe(false);
  });

  it('should return false for object with empty name string', () => {
    expect(isTruckCompleteForMVP({ id: 'truck-1', name: '' })).toBe(false);
  });

  it('should return false for object with non-string id', () => {
    expect(isTruckCompleteForMVP({ id: 123, name: 'Truck Name' })).toBe(false);
  });

  it('should return false for object with non-string name', () => {
    expect(isTruckCompleteForMVP({ id: 'truck-1', name: 123 })).toBe(false);
  });

  it('should return true for valid truck with id and name', () => {
    expect(isTruckCompleteForMVP({ id: 'truck-1', name: 'Truck Name' })).toBe(true);
  });

  it('should return true for truck with additional properties', () => {
    expect(
      isTruckCompleteForMVP({
        id: 'truck-1',
        name: 'Truck Name',
        location: '123 Main St',
        rating: 4.5,
      }),
    ).toBe(true);
  });

  it('should treat whitespace-only strings as valid (function does not trim)', () => {
    expect(isTruckCompleteForMVP({ id: '   ', name: 'Truck' })).toBe(true);
    expect(isTruckCompleteForMVP({ id: 'truck-1', name: '   ' })).toBe(true);
  });

  it('should handle whitespace-trimmed strings as valid', () => {
    expect(isTruckCompleteForMVP({ id: 'truck-1', name: 'Truck Name' })).toBe(true);
  });
});