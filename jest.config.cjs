// Jest configuration for comprehensive testing infrastructure
/** @type {import('jest').Config} */
module.exports = {
  // Core preset - using ts-jest for TypeScript support with ESM compatibility
  preset: 'ts-jest/presets/default-esm',
  // Inject globals (jest, expect, etc.) to avoid "jest is not defined"
  injectGlobals: true,

  // Test environments - use standard jsdom environment for browser-like testing
  testEnvironment: 'jest-environment-jsdom',

  // Setup files - consolidated setup in one file with proper ESM/CJS handling
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts', '<rootDir>/tests/config/setup-dev-mode.cjs'],

  // Setup files for environment variables - loads them before tests run
  setupFiles: ['<rootDir>/tests/config/setup-env.cjs'],

  // Module mapping for alias resolution
  moduleNameMapper: {
    '^sanitize-html$': '<rootDir>/tests/config/sanitize-html.cjs',
    '^@/lib/supabase/build-client$': '<rootDir>/tests/__mocks__/build-client.ts',
    '^@/(.*)$': '<rootDir>/$1',
    // Handle ESM module compatibility properly
    '^uuid$': require.resolve('uuid'),
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    '^.+\\.(css|sass|scss)$': 'identity-obj-proxy',
    // Mock server-only to allow testing server components in Jest
    'server-only': '<rootDir>/tests/__mocks__/server-only.ts',
    // Mock next/cache for API route tests
    '^next/cache$': '<rootDir>/tests/__mocks__/next-cache.ts',
    // Map Supabase client files to ensure proper mocking
    '^@/lib/supabase/client$': '<rootDir>/__mocks__/supabase/client.ts',
    '^@/lib/supabase/admin$': '<rootDir>/__mocks__/supabase/admin.ts',
    '^@upstash/redis$': '<rootDir>/__mocks__/@upstash/redis.cjs',
    // Note: useFavorites mocked via jest.mock() in tests/setup.ts due to ESM issues
    // Note: server mock handled by jest.mock() in test files due to ESM issues
    // Explicitly map components that need to be mocked
    '^next/image$': '<rootDir>/tests/__mocks__/next-image.ts',
    '^next/navigation$': '<rootDir>/tests/__mocks__/next-navigation.ts',
    '^react-map-gl/mapbox$': '<rootDir>/tests/__mocks__/react-map-gl.mjs',
    '^supercluster$': '<rootDir>/tests/__mocks__/supercluster.cjs',
    '^kdbush$': '<rootDir>/tests/__mocks__/kdbush.cjs',
    '^@/components/ui/button$': '<rootDir>/tests/__mocks__/button.tsx',
    '^@/components/ui/dialog$': '<rootDir>/tests/__mocks__/dialog.tsx',
    '^@/components/ui/tabs$': '<rootDir>/tests/__mocks__/tabs.tsx',
    '^@/components/ui/input$': '<rootDir>/tests/__mocks__/input.tsx',
    '^@/components/ui/alert$': '<rootDir>/tests/__mocks__/alert.tsx',
    '^@/components/ui/accordion$': '<rootDir>/tests/__mocks__/accordion.tsx',
    '^@/components/ui/badge$': '<rootDir>/tests/__mocks__/badge.tsx',
    '^@/components/ui/checkbox$': '<rootDir>/tests/__mocks__/checkbox.tsx',
    '^@/components/ui/switch$': '<rootDir>/tests/__mocks__/switch.tsx',
    '^@/components/ui/label$': '<rootDir>/tests/__mocks__/label.tsx',
    '^@/components/ui/skeleton$': '<rootDir>/tests/__mocks__/skeleton.tsx',
    '^@/components/ui/ScrollArea$': '<rootDir>/tests/__mocks__/ScrollArea.tsx',
    '^@/components/owner/ClaimTruckModal$': '<rootDir>/tests/__mocks__/ClaimTruckModal.tsx',
    '^lucide-react$': '<rootDir>/tests/__mocks__/lucide-react.ts',
    '^@/app/auth/AuthProvider$': '<rootDir>/tests/__mocks__/auth-provider.tsx',
    '^@/hooks/useFavorites$': '<rootDir>/tests/__mocks__/use-favorites.ts',
    '^@/app/owner-dashboard/_components/events/useEventClustering$': '<rootDir>/tests/__mocks__/useEventClustering.ts',
  },

  // Transform settings for TypeScript and JSX with ESM support
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          jsx: 'react-jsx',
          jsxImportSource: 'react',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
    '^.+\\.js$': 'babel-jest',
  },

  // Test path patterns - exclude Playwright E2E test suites which run separately
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/docs/',
    '<rootDir>/playwright-report/',
    '<rootDir>/test-results/',
    // EXCLUDE Playwright E2E test suites - they should ONLY run with Playwright Test
    '<rootDir>/tests/pipeline.*.e2e.test.ts',
    '<rootDir>/tests/e2e.test.ts',
    '<rootDir>/tests/playwright.config.test.ts',
    '<rootDir>/tests/.*\\.e2e\\.test\\.ts$',
    '<rootDir>/tests/.*\\.e2e\\.spec\\.ts$',
    '<rootDir>/tests/.*\\.spec\\.ts$', // Exclude all .spec.ts files (these are Playwright tests)
    '<rootDir>/tests/api/.*\\.test\\.ts$', // Many API tests are using Playwright
    '<rootDir>/tests/lib/.*\\.test\\.ts$', // Many lib tests are using Playwright
    '<rootDir>/tests/load/.*\\.test\\.ts$', // Load tests are using Playwright
    '<rootDir>/tests/chaos/.*\\.test\\.ts$', // Chaos tests are using Playwright
    // EXCLUDE quarantined mock-heavy test files — preserved for history only
    '<rootDir>/.*\\.QUARANTINED-MOCK-HEAVY\\..*$',
    '<rootDir>/tests/integration/.*\\.test\\.ts$', // Some integration tests are using Playwright
    '<rootDir>/tests/mobile-ui-tests/.*\\.test\\.ts$', // Mobile UI tests are using Playwright
    '<rootDir>/tests/auth/.*\\.test\\.ts$', // Auth tests are using Playwright
    '<rootDir>/tests/auth/.*\\.spec\\.ts$', // Auth tests are using Playwright
    '<rootDir>/tests/admin-.*\\.test\\.ts$', // Admin tests are using Playwright
    '<rootDir>/tests/owner-dashboard/.*\\.spec\\.ts$', // Owner dashboard tests are using Playwright
    '<rootDir>/tests/notifications/.*\\.spec\\.ts$', // Notification tests are using Playwright
    // Additional patterns to exclude Playwright tests
    '<rootDir>/tests/.*playwright.*\\.test\\.ts$',
    '<rootDir>/tests/.*\\.console-warnings\\.spec\\.ts$',
    '<rootDir>/tests/e2e\\.auth\\.test\\.ts$', // Specific exclusion for this Playwright test
    '<rootDir>/tests/account-deletion\\.test\\.ts$', // Playwright E2E test
    '<rootDir>/tests/account-deauthorize\\.test\\.ts$', // Playwright E2E test
    '<rootDir>/tests/e2e/.*\\.test\\.ts$', // E2E subdirectory - all Playwright
    '<rootDir>/tests/e2e/.*\\.spec\\.ts$', // E2E subdirectory - all Playwright
  ],

  // Coverage collection configuration
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'pages/**/*.{js,jsx,ts,tsx}',
    'contexts/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/*.config.{js,ts}',
    '!**/__mocks__/**',
    '!**/__fixtures__/**',
  ],

  // Test file discovery patterns - avoid picking up Playwright tests
  testMatch: [
    '<rootDir>/**/__tests__/**/*.test.(js|jsx|ts|tsx)',
    '<rootDir>/**/__tests__/**/*.spec.(js|jsx|ts|tsx)',
    '<rootDir>/**/(*.)test.(js|jsx|ts|tsx)',
    // NOTE: spec files are generally for Playwright, so we avoid them here
    // unless they're in __tests__ directories which are meant for Jest
  ],

  // Module file extensions with ESM/CJS compatibility
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'cjs', 'mjs'],

  // ESM support with enhanced transformIgnorePatterns
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Updated to handle ESM packages that need to be transformed
  transformIgnorePatterns: [
    // Don't ignore ESM packages that need transformation
    '/node_modules/(?!(uuid|@supabase|@upstash|isomorphic-ws|@google|date-fns|lucide-react|react-map-gl|@vis.gl|server-only|supercluster|kdbush|vaul)/)',
  ],

  // Coverage thresholds for testing
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Proper module resolution for ESM/CommonJS compatibility
  resolver: undefined,
  errorOnDeprecated: false,
  verbose: true,
  watchPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/playwright-report/',
    '<rootDir>/coverage/',
  ],
};
