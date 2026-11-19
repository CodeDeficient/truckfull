/**
 * Location Extraction Tests
 *
 * Phase 3.2.2: Test location extraction from post content
 * Verifies extraction of location information (address, landmarks, coordinates)
 */

import { test, expect } from '@playwright/test';

// Mock location extraction function
const MockLocationExtractor = {
  extractLocation: (
    content: string,
  ): { address?: string; landmark?: string; coordinates?: { lat: number; lng: number } } => {
    const lowerContent = content.toLowerCase();

    // Patterns for address extraction
    const addressPatterns = [
      /(\d+)\s+([a-zA-Z]+\s+)+(street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|court|ct|place|pl|circle|cir|way|wy|terrace|ter)\b/i,
      /(\d+)\s+([a-zA-Z]+\s+)+(road|rd|street|st)\b/i,
      /(\d+)\s+([a-zA-Z]+\s+)+(avenue|ave|blvd|boulevard)\b/i,
      /(\d+)\s+([a-zA-Z]+\s+)+(drive|dr|lane|ln)\b/i,
      /([a-zA-Z]+\s+)+(street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|court|ct|place|pl|circle|cir|way|wy|terrace|ter)\s+(\d+)\b/i,
    ];

    // Patterns for landmark extraction
    const landmarkPatterns = [
      /(next to|near|by|beside|across from|opposite)\s+(the\s+)?([a-zA-Z]+\s+)?([a-zA-Z]+)/i,
      /(at|on)\s+(the\s+)?([a-zA-Z]+\s+)?([a-zA-Z]+)/i,
      /(inside|in)\s+(the\s+)?([a-zA-Z]+\s+)?([a-zA-Z]+)/i,
    ];

    // Known landmarks and places
    const knownLandmarks = [
      'park',
      'library',
      'school',
      'hospital',
      'clinic',
      'church',
      'temple',
      'mosque',
      'market',
      'mall',
      'shopping center',
      'plaza',
      'square',
      'fountain',
      'statue',
      'monument',
      'museum',
      'theater',
      'cinema',
      'stadium',
      'arena',
      'university',
      'college',
      'campus',
      'airport',
      'train station',
      'bus stop',
      'subway',
      'metro',
      'harbor',
      'pier',
      'beach',
      'lake',
      'river',
      'bridge',
      'tunnel',
      'highway',
      'freeway',
    ];

    // Patterns for coordinates (latitude, longitude)
    const coordinatePatterns = [
      /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/, // e.g., "40.7128, -74.0060"
      /(-?\d+\.\d+)\s+(-?\d+\.\d+)/, // e.g., "40.7128 -74.0060"
      /lat\s*[:=]?\s*(-?\d+\.\d+)/i, // e.g., "lat: 40.7128"
      /lng\s*[:=]?\s*(-?\d+\.\d+)/i, // e.g., "lng: -74.0060"
      /longitude\s*[:=]?\s*(-?\d+\.\d+)/i, // e.g., "longitude: -74.0060"
      /latitude\s*[:=]?\s*(-?\d+\.\d+)/i, // e.g., "latitude: 40.7128"
    ];

    // Extract address
    let address: string | undefined;
    for (const pattern of addressPatterns) {
      const match = content.match(pattern);
      if (match) {
        address = match[0];
        break;
      }
    }

    // Extract landmark
    let landmark: string | undefined;
    for (const pattern of landmarkPatterns) {
      const match = content.match(pattern);
      if (match) {
        // Extract the relevant part (usually the last word group)
        landmark = match[match.length - 1];
        break;
      }
    }

    // Check for known landmarks in content
    if (!landmark) {
      for (const knownLandmark of knownLandmarks) {
        if (lowerContent.includes(knownLandmark)) {
          landmark = knownLandmark;
          break;
        }
      }
    }

    // Extract coordinates
    let coordinates: { lat: number; lng: number } | undefined;
    for (const pattern of coordinatePatterns) {
      const match = content.match(pattern);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2] || match[1]); // Handle both patterns
        if (!isNaN(lat) && !isNaN(lng)) {
          coordinates = { lat, lng };
          break;
        }
      }
    }

    const result: {
      address?: string;
      landmark?: string;
      coordinates?: { lat: number; lng: number };
    } = {};
    if (address) result.address = address;
    if (landmark) result.landmark = landmark;
    if (coordinates) result.coordinates = coordinates;

    return result;
  },

  validateAddress: (address: string): boolean => {
    const patterns = [
      /\d+\s+[a-zA-Z]+\s+(street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|court|ct|place|pl|circle|cir|way|wy|terrace|ter)/i,
      /\d+\s+[a-zA-Z]+\s+(street|st|avenue|ave|boulevard|blvd|road|rd)/i,
    ];
    return patterns.some((pattern) => pattern.test(address));
  },

  validateCoordinates: (lat: number, lng: number): boolean => {
    // Latitude must be between -90 and 90
    // Longitude must be between -180 and 180
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  },

  detectLocationType: (content: string, extracted: any): string => {
    const lowerContent = content.toLowerCase();

    if (extracted.coordinates) {
      return 'precise';
    }

    if (extracted.address) {
      return 'address';
    }

    if (extracted.landmark) {
      return 'landmark';
    }

    if (
      lowerContent.includes('near') ||
      lowerContent.includes('next to') ||
      lowerContent.includes('by')
    ) {
      return 'relative';
    }

    return 'general';
  },
};

test.describe('Location Extraction', () => {
  test.describe('Address Extraction', () => {
    test('extracts full street addresses', () => {
      const testCases = [
        { content: 'Located at 123 Main Street', expected: '123 Main Street' },
        { content: 'Find us at 456 Oak Avenue', expected: '456 Oak Avenue' },
        { content: 'On 789 Pine Boulevard', expected: '789 Pine Boulevard' },
        { content: 'Address: 321 Maple Road', expected: '321 Maple Road' },
      ];

      testCases.forEach(({ content, expected }) => {
        const result = MockLocationExtractor.extractLocation(content);
        expect(result.address).toBe(expected);
      });
    });

    test('extracts abbreviated street names', () => {
      const testCases = [
        { content: 'At 123 Main St', expected: '123 Main St' },
        { content: 'On 456 Oak Ave', expected: '456 Oak Ave' },
        { content: 'By 789 Pine Blvd', expected: '789 Pine Blvd' },
      ];

      testCases.forEach(({ content, expected }) => {
        const result = MockLocationExtractor.extractLocation(content);
        expect(result.address).toBe(expected);
      });
    });

    test('extracts addresses with directionals', () => {
      const testCases = [
        { content: 'West 123 Main Street', expected: 'West 123 Main Street' },
        { content: 'North 456 Oak Avenue', expected: 'North 456 Oak Avenue' },
      ];

      testCases.forEach(({ content, expected }) => {
        const result = MockLocationExtractor.extractLocation(content);
        expect(result.address).toBe(expected);
      });
    });
  });

  test.describe('Landmark Extraction', () => {
    test('extracts landmarks from relative location phrases', () => {
      const testCases = [
        { content: 'Located next to the park', expected: 'park' },
        { content: 'Find us near the library', expected: 'library' },
        { content: 'By the school', expected: 'school' },
        { content: 'Across from the hospital', expected: 'hospital' },
      ];

      testCases.forEach(({ content, expected }) => {
        const result = MockLocationExtractor.extractLocation(content);
        expect(result.landmark).toBe(expected);
      });
    });

    test('extracts landmarks from location phrases', () => {
      const testCases = [
        { content: 'At the shopping mall', expected: 'mall' },
        { content: 'On Main Street', expected: 'Main' },
        { content: 'In the park', expected: 'park' },
      ];

      testCases.forEach(({ content, expected }) => {
        const result = MockLocationExtractor.extractLocation(content);
        expect(result.landmark).toBe(expected);
      });
    });

    test('extracts known landmarks from content', () => {
      const testCases = [
        { content: 'We are near the university', expected: 'university' },
        { content: 'Located by the beach', expected: 'beach' },
        { content: 'Next to the market', expected: 'market' },
      ];

      testCases.forEach(({ content, expected }) => {
        const result = MockLocationExtractor.extractLocation(content);
        expect(result.landmark).toBe(expected);
      });
    });
  });

  test.describe('Coordinate Extraction', () => {
    test('extracts latitude and longitude pairs', () => {
      const testCases = [
        { content: 'Coordinates: 40.7128, -74.0060', expected: { lat: 40.7128, lng: -74.006 } },
        { content: 'Location: 34.0522, -118.2437', expected: { lat: 34.0522, lng: -118.2437 } },
        { content: 'At 51.5074, -0.1278', expected: { lat: 51.5074, lng: -0.1278 } },
      ];

      testCases.forEach(({ content, expected }) => {
        const result = MockLocationExtractor.extractLocation(content);
        expect(result.coordinates).toEqual(expected);
      });
    });

    test('extracts coordinates without comma separator', () => {
      const testCases = [
        { content: 'Location: 40.7128 -74.0060', expected: { lat: 40.7128, lng: -74.006 } },
      ];

      testCases.forEach(({ content, expected }) => {
        const result = MockLocationExtractor.extractLocation(content);
        expect(result.coordinates).toEqual(expected);
      });
    });

    test('extracts coordinates with labels', () => {
      const testCases = [
        { content: 'Lat: 40.7128, Lng: -74.0060', expected: { lat: 40.7128, lng: -74.006 } },
        {
          content: 'Latitude: 40.7128 Longitude: -74.0060',
          expected: { lat: 40.7128, lng: -74.006 },
        },
      ];

      testCases.forEach(({ content, expected }) => {
        const result = MockLocationExtractor.extractLocation(content);
        expect(result.coordinates).toEqual(expected);
      });
    });
  });

  test.describe('Address Validation', () => {
    test('validates proper street addresses', () => {
      const validAddresses = [
        '123 Main Street',
        '456 Oak Avenue',
        '789 Pine Boulevard',
        '321 Maple Road',
        '999 Elm Drive',
        '111 Cedar Lane',
      ];

      validAddresses.forEach((address) => {
        expect(MockLocationExtractor.validateAddress(address)).toBe(true);
      });
    });

    test('rejects invalid addresses', () => {
      const invalidAddresses = [
        'Main Street', // No number
        '123 Main', // No street type
        '123', // Just a number
        '', // Empty string
        'Main 123', // Wrong order
      ];

      invalidAddresses.forEach((address) => {
        expect(MockLocationExtractor.validateAddress(address)).toBe(false);
      });
    });
  });

  test.describe('Coordinate Validation', () => {
    test('validates valid coordinates', () => {
      const validCoordinates = [
        { lat: 40.7128, lng: -74.006 }, // New York
        { lat: 34.0522, lng: -118.2437 }, // Los Angeles
        { lat: 51.5074, lng: -0.1278 }, // London
        { lat: 0, lng: 0 }, // Equator/Prime Meridian
        { lat: -90, lng: -180 }, // South Pole
        { lat: 90, lng: 180 }, // North Pole
      ];

      validCoordinates.forEach(({ lat, lng }) => {
        expect(MockLocationExtractor.validateCoordinates(lat, lng)).toBe(true);
      });
    });

    test('rejects invalid coordinates', () => {
      const invalidCoordinates = [
        { lat: 91, lng: -74.006 }, // Lat too high
        { lat: -91, lng: -74.006 }, // Lat too low
        { lat: 40.7128, lng: 181 }, // Lng too high
        { lat: 40.7128, lng: -181 }, // Lng too low
        { lat: NaN, lng: -74.006 }, // NaN
        { lat: 40.7128, lng: NaN }, // NaN
      ];

      invalidCoordinates.forEach(({ lat, lng }) => {
        expect(MockLocationExtractor.validateCoordinates(lat, lng)).toBe(false);
      });
    });
  });

  test.describe('Location Type Detection', () => {
    test('detects precise locations (coordinates)', () => {
      const content = 'Meet us at coordinates 40.7128, -74.0060';
      const extracted = MockLocationExtractor.extractLocation(content);
      const type = MockLocationExtractor.detectLocationType(content, extracted);

      expect(type).toBe('precise');
    });

    test('detects address locations', () => {
      const content = 'Located at 123 Main Street';
      const extracted = MockLocationExtractor.extractLocation(content);
      const type = MockLocationExtractor.detectLocationType(content, extracted);

      expect(type).toBe('address');
    });

    test('detects landmark locations', () => {
      const content = 'Near the park';
      const extracted = MockLocationExtractor.extractLocation(content);
      const type = MockLocationExtractor.detectLocationType(content, extracted);

      expect(type).toBe('landmark');
    });

    test('detects relative locations', () => {
      const content = 'Find us near the library';
      const extracted = MockLocationExtractor.extractLocation(content);
      const type = MockLocationExtractor.detectLocationType(content, extracted);

      expect(type).toBe('relative');
    });

    test('detects general locations', () => {
      const content = 'We are in the downtown area';
      const extracted = MockLocationExtractor.extractLocation(content);
      const type = MockLocationExtractor.detectLocationType(content, extracted);

      expect(type).toBe('general');
    });
  });

  test.describe('Edge Cases', () => {
    test('handles content with no location information', () => {
      const content = 'We are open today!';
      const result = MockLocationExtractor.extractLocation(content);

      expect(result).toEqual({});
    });

    test('handles multiple location references (extracts first)', () => {
      const content = 'At 123 Main St, near the park';
      const result = MockLocationExtractor.extractLocation(content);

      expect(result.address).toBe('123 Main St');
      expect(result.landmark).toBe('park');
    });

    test('handles international addresses', () => {
      const content = 'Located at 123 Rue de la Paix, Paris';
      const result = MockLocationExtractor.extractLocation(content);

      // Should extract street number and name
      expect(result.address).toContain('123');
      expect(result.address).toContain('Rue');
    });

    test('handles addresses with units or apartments', () => {
      const content = 'Apt 4B at 123 Main Street';
      const result = MockLocationExtractor.extractLocation(content);

      // May or may not extract apartment info, but should extract address
      expect(result.address).toBeTruthy();
      expect(result.address).toContain('123');
    });

    test('handles ambiguous location phrases', () => {
      const content = 'Located by the water';
      const result = MockLocationExtractor.extractLocation(content);

      // Should extract landmark even if ambiguous
      expect(result.landmark).toBe('water');
    });

    test('handles mixed case and special characters', () => {
      const content = 'Location: 123 main ST. (near the park!)';
      const result = MockLocationExtractor.extractLocation(content);

      expect(result.address).toContain('123');
      expect(result.landmark).toBe('park');
    });
  });

  test.describe('Integration Scenarios', () => {
    test('extracts multiple location components from complex post', () => {
      const content = 'We are at 123 Main Street, near the park and next to the library!';
      const result = MockLocationExtractor.extractLocation(content);

      expect(result.address).toBe('123 Main Street');
      expect(result.landmark).toBeTruthy();
      expect(['park', 'library']).toContain(result.landmark);
    });

    test('prioritizes coordinates over other location types', () => {
      const content = 'Located at 123 Main St, coordinates: 40.7128, -74.0060';
      const result = MockLocationExtractor.extractLocation(content);

      expect(result.coordinates).toEqual({ lat: 40.7128, lng: -74.006 });
      expect(result.address).toBe('123 Main St');
    });

    test('validates extracted coordinates', () => {
      const content = 'Meet at 40.7128, -74.0060';
      const result = MockLocationExtractor.extractLocation(content);

      if (result.coordinates) {
        const isValid = MockLocationExtractor.validateCoordinates(
          result.coordinates.lat,
          result.coordinates.lng,
        );
        expect(isValid).toBe(true);
      }
    });
  });
});
