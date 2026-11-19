/**
 * Mock for supercluster library
 * Provides realistic mock that maintains Supercluster API contracts
 */

import { jest } from '@jest/globals';

/**
 * Mock the default export of supercluster
 * Returns a mock Supercluster instance with all required methods
 */
jest.mock('supercluster', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      load: jest.fn(),
      getClusters: jest.fn(() => []),
      getLeaves: jest.fn(() => []),
      getClusterExpansionZoom: jest.fn(() => 14),
    })),
  };
});

/**
 * This file can be imported in test files that need specific supercluster behavior
 * Most tests should rely on the mock defined in setup.ts
 */
