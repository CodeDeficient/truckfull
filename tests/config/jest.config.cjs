// Consistent Jest configuration for test environment
// This configuration follows the same patterns as the main jest.config.cjs

const customJestConfig = {
  // Use the same ESM preset approach as main config for consistency
  preset: 'ts-jest/presets/default-esm',

  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/../jest.setup.ts'], // Reference the main setup file
  setupFiles: ['<rootDir>/setup-env.js'], // Reference the environment setup file

  // Consistent module mapping with the main config
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^uuid$': require.resolve('uuid'),
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    '^.+\\.(css|sass|scss)$': '<rootDir>/../__mocks__/styleMock.js',
    '^@/lib/supabase/client$': '<rootDir>/../__mocks__/supabase/client.ts',
    '^@/lib/supabase/admin$': '<rootDir>/../__mocks__/supabase/admin.ts',
  },

  // Consistent transform settings with ESM support
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },

  // Ignore patterns to exclude e2e tests that should run with Playwright
  testPathIgnorePatterns: [
    '<rootDir>/tests/e2e.test.ts',
    '<rootDir>/tests/pipeline.*.e2e.test.ts',
    '<rootDir>/tests/playwright.config.test.ts',
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/playwright-report/',
    '<rootDir>/test-results/',
  ],

  // Consistent module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'cjs', 'mjs'],

  // ESM support with enhanced transformIgnorePatterns
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Consistent transform patterns with main config, simplified for better maintenance
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|@supabase|@firecrawl|isomorphic-ws|@google|date-fns|lucide-react)/)',
  ],

  // Coverage settings to match main config
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'pages/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/*.config.{js,ts}',
    '!**/__mocks__/**',
    '!**/__fixtures__/**',
  ],

  // Consistent coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};

module.exports = customJestConfig;
