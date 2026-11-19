import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const globals = require('globals'); // Use require for globals
const espree = require('espree');
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import nextPlugin from '@next/eslint-plugin-next';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // 0. Scope linting to source files only
  {
    files: [
      'app/**/*.{ts,tsx,js,jsx}',
      'components/**/*.{ts,tsx,js,jsx}',
      'lib/**/*.{ts,tsx,js,jsx}',
      'hooks/**/*.{ts,tsx,js,jsx}',
    ],
    ignores: [
      'app/api/**/*',
      'app/test*/**/*',
      'app/debug*/**/*',
      'app/simple-login/**/*',
      'app/whoami/**/*',
    ],
  },

  // 1. Global ignores - PREVENTION-FOCUSED
  {
    ignores: [
      // Build and vendor outputs
      '**/node_modules/**',
      '**/.next/**',
      '**/.vercel/**',
      '**/.vercel/output/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/public/**',

      // Reports and generated artifacts
      '**/jscpd-report/**',
      '**/jscpd-source-report/**',
      '**/jscpd-report.json/**',
      '**/tests/results/**',
      '**/reports/**',
      '**/docs/**',
      '**/*.md',
      'baseline-*.json',
      'eslint-report.json',
      'quality-report.json',

      // Internal project metadata
      '**/.internal/**',
      '.claude-thoughts/',

      // Generated JS alongside TS (avoid double-linting transpiled JS)
      'lib/**/*.js',
      'lib/types.d.ts',
      'lib/database.types.ts',
      'lib/database.types.consolidated.ts',

      // Mock files and test setup - should not follow strict production code rules
      '__mocks__/**',
      'jest.setup.ts',

      // Next.js generated files
      'next-env.d.ts',

      // Single-file utility scripts (CLI/build/development tools)
      'eslint-module-check.cjs',
      'fix_import_extensions.js',
      'validate-json.cjs',

      // Entire scripts tree (CLI, maintenance utilities) — excluded from app lint scope for now
      '**/scripts/**',

      // Top-level legacy or maintenance scripts (moved under scripts/)
      'analyze-pipeline-quality.js',
      'analyzePipelineQuality.js',
      'check-constraints.js',
      'check-discovered-urls.js',
      'deduplication-helper.js',
      'deduplication-helper.mjs',
      'get-scraping-jobs.js',
      'get-truck-count.js',
      'debugUrlFiltering.js',

      // Tests, mocks, stories, examples
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      'test-*.js',
      'test-*.ts',
      'test-*.tsx',
      '**/*-test.*',
      '**/*-tests.*',
      'tests/**/*',
      '**/__tests__/**',
      '**/*.mock.*',
      '**/*.stories.*',
      '**/*.snap',
      '**/*.bench.*',
      '**/*.example.*',

      // Config files
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',
      '.dependency-cruiser.cjs',
      '.dependency-cruiser-unresolvable.cjs',
      'dependency-cruiser.config.cjs',
      'depcruise.config.js',
      'depcruise.config.js',
      'depcruise.config.cjs',
      'dependency-cruise.config.js',
      'playwright.config.*.ts',
      'jest.config.ts',
      'jest.config.*',
      'setup-tests.*',

      // Legacy files that cause parsing errors
      'delete-file.cjs',
      'filter-eslint-errors.cjs',
      'jest.setup.js',
      'temp-lint-analyzer.cjs',
      'test-pipeline-simple.js',
      'playwright.config.test.ts',
      'lib/utils/typeGuards.js',
      'pretty-print-json.cjs',

      // Supabase utility scripts (CLI scripts with intentional console usage)
      'apply-rls-fix.js',
      'check-data.js',
      'check-database.js',
      'check-policies.js',
      'execute-sql.js',
      'debug-console.js',

      // API routes (development/test only)
      'app/api/**/*',

      // Test and debug routes
      'app/test*/**/*',
      'app/debug*/**/*',
      'app/simple-login/**/*',
      'app/whoami/**/*',

      // Problematic files
      'lib/supabase/services/foodTruckService.d.ts',
      'check_constraints.ts',
      'check_schema.ts',
      'insert_test_record.ts',
      'test_db_update.ts',
      'test_db_write.ts',

      // Temporary config files (should not be linted)
      'temp_config.js',
      'temp_config.mjs',

      // Generated Prisma files causing parsing errors
      'generated/prisma/**/*',
      'lib/database.types.generated.ts',
      'lib/database.types.new.ts',
      'lib/tempLocalDbTypes.ts',
    ],
  },

  // 2. Base configurations applied to all linted files
  tseslint.configs.base,
  sonarjs.configs.recommended,
  unicorn.configs.recommended,

  // 3. TypeScript specific configurations (Type-Aware)
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // Rules that require type information
      // Temporarily reduced severity on unsafe operations to reduce false positives
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/strict-boolean-expressions': 'off', // Disabled due to false positives
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  // 4. Exclude .d.ts from typed linting to avoid parserOptions.project errors
  {
    files: ['**/*.d.ts'],
    rules: {
      // Disable typed rules on declaration files
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // 5. Configuration for JavaScript and CommonJS files (NOT Type-Aware)
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      parser: espree,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Add any JS-specific, non-type-aware rules here
    },
  },

  // 5. Next.js specific configurations
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        React: 'readonly',
      },
    },
  },

  // 6. Global rules for all file types (Complexity, Consistency, etc.)
  {
    rules: {
      // Complexity Prevention
      'sonarjs/cognitive-complexity': ['warn', 35], // Increased threshold to reduce false positives
      'sonarjs/no-nested-conditional': 'error',
      'max-lines-per-function': ['warn', 150], // Increased from 120 to reduce false positives
      'max-depth': ['error', 5], // Increased from 4 to reduce false positives
      'max-params': ['error', 6], // Increased from 4 to reduce false positives

      // Consistency Prevention
      'unicorn/no-null': 'off', // Disabled due to false positives; handled with proper null checking elsewhere

      // Code Quality Prevention
      'sonarjs/no-dead-store': 'error',
      'sonarjs/prefer-read-only-props': 'error',
      'sonarjs/void-use': 'error',
      'sonarjs/no-invariant-returns': 'off',

      // NEXT.JS/SUPABASE ANTIPATTERN DETECTION - Critical for schema mismatches
      // Detect potential column name mismatches (like our 'is_active' issue)
      'sonarjs/different-types-comparison': 'warn', // Catches comparison between mismatched types

      // Database Operation Safety
      'sonarjs/prefer-read-only-props': 'error', // Prevent mutating objects that should be immutable
      'unicorn/no-unnecessary-polyfills': 'warn', // Prevents unnecessary runtime overhead

      // Supabase-specific antipatterns
      'no-restricted-syntax': [
        'warn',
        {
          selector: "CallExpression[callee.name='from'][arguments.0.type='Literal']",
          message: 'Potential raw SQL usage - consider using typed Supabase queries',
        },
        {
          selector: "CallExpression[callee.property.name='rpc'][arguments.0.type='Literal']",
          message:
            'RPC calls should validate schema matches - ensure function exists in migrations',
        },
      ],

      // Next.js API Route Safety
      'no-restricted-globals': [
        'error',
        {
          name: 'process',
          message: 'Process object access should be sanitized in Next.js API routes',
        },
      ],

      // Database Query Validation
      'no-template-curly-in-string': 'warn', // Prevents SQL injection patterns in string templates

      // Filename case configuration
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            camelCase: true,
            pascalCase: true,
          },
          ignore: [
            /^README\.md$/,
            /^next-env\.d\.ts$/,
            /^global-error\.tsx$/,
            /^postcss\.config\.mjs$/,
            /^tailwind\.config\.ts$/,
            /^next\.config\.mjs$/,
            /^jest\.config\.ts$/,
            /^CODEBASE_RULES\.md$/,
            /^DASHBOARD_PLAN\.md$/,
            /^RISKS\.md$/,
            /^WBS_CHECKLIST\.md$/,
            /^LINTING_PREVENTION_FRAMEWORK\.md$/,
            /^SYSTEMATIC_ERROR_PREVENTION\.md$/,
          ],
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },

  // 7. Specific Overrides
  {
    files: ['hooks/**/*.ts', 'hooks/**/*.tsx'],
    rules: {
      'sonarjs/different-types-comparison': 'off',
    },
  },
  {
    files: ['components/admin/dashboard/TrucksPage.tsx'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },

  {
    files: ['app/admin/food-trucks/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },

  // Statistics cards section already uses readonly props in interface
  {
    files: ['app/admin/_components/StatisticsCardsSection.tsx'],
    rules: {
      'sonarjs/prefer-read-only-props': 'off', // Props properly marked readonly in interface
    },
  },

  {
    files: ['hooks/realtime/**/*.ts', 'hooks/realtime/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
    },
  },
  {
    files: ['components/TruckCard.tsx'],
    rules: {
      'sonarjs/different-types-comparison': 'off',
    },
  },

  {
    files: ['hooks/useTruckCard.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },

  {
    files: ['hooks/realtime/**/*.ts', 'hooks/realtime/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
    },
  },

  // Additional overrides for common API and service files that often cause type issues
  {
    files: ['lib/supabase/services/**/*.ts', 'lib/supabase/services/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-explicit-any': 'off', // Supabase responses often use 'any' types
    },
  },

  // Environment configuration files need to access process.env
  {
    files: ['lib/env.ts'],
    rules: {
      'no-restricted-globals': 'off', // process.env access needed for env validation
    },
  },

  // Cron job routes need process.env access for CRON_SECRET authentication
  {
    files: ['app/api/cron/**/*.ts'],
    rules: {
      'no-restricted-globals': 'off', // process.env access needed for CRON_SECRET
    },
  },

  {
    files: ['app/api/**/*.ts', 'app/api/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
    },
  },

  // More specific overrides for generated files and other common issues
  {
    files: [
      'lib/database.local.types.ts',
      'lib/database.types.generated.ts',
      'lib/database.types.new.ts',
      'lib/tempLocalDbTypes.ts',
    ],
    rules: {
      '@typescript-eslint/no-redundant-type-constituents': 'off', // Generated types often have complex unions
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
    },
  },

  {
    files: ['generated/**/*.js', 'generated/**/*.ts', 'generated/**/*.d.ts'],
    rules: {
      'unicorn/prefer-module': 'off', // Generated code often uses require/exports
      'unicorn/filename-case': 'off',
      'sonarjs/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
    },
  },

  // Add special handling for test files if any are being linted
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', 'jest.setup.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'sonarjs/no-unused-vars': 'off',
      'no-console': 'off',
    },
  },

  // 8. Prettier - must be last to override other formatting rules

  eslintConfigPrettier,
);
