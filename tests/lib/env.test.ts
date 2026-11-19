/**
 * Tests for Environment Variable Validator
 */

import { EnvironmentValidator } from '../../lib/env';

describe('EnvironmentValidator', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let validator: EnvironmentValidator;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear environment for testing
    process.env = {} as NodeJS.ProcessEnv;

    // Create new validator instance
    validator = new EnvironmentValidator();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateRequiredVars', () => {
    it('should detect missing required variables', () => {
      const summary = validator.getValidationSummary();

      // Run validation (will fail due to missing vars)
      expect(() => validator.validate()).toThrow('Environment validation failed');

      // Check that errors were recorded
      const updatedSummary = validator.getValidationSummary();
      expect(updatedSummary.errors.length).toBeGreaterThan(0);
      expect(updatedSummary.errors.some((e) => e.includes('NEXT_PUBLIC_SUPABASE_URL'))).toBe(true);
      expect(updatedSummary.errors.some((e) => e.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'))).toBe(
        true,
      );
      expect(updatedSummary.errors.some((e) => e.includes('SUPABASE_SERVICE_ROLE_KEY'))).toBe(true);
    });

    it('should detect placeholder values', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://<projectid>.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'your-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_KEY';
      process.env.GEMINI_API_KEY = 'placeholder';
      process.env.TAVILY_API_KEY = '...';
      process.env.CRON_SECRET = 'example';
      process.env.JWT_SECRET = 'EXAMPLE_SECRET';

      expect(() => validator.validate()).toThrow('Environment validation failed');

      const summary = validator.getValidationSummary();
      expect(summary.errors.every((e) => e.includes('Placeholder value detected'))).toBe(true);
    });

    it('should pass with valid required variables', () => {
      // Set all required variables with valid values
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://myproject.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
        'test-anon-key-'.padEnd(160, 'x');
      process.env.SUPABASE_SERVICE_ROLE_KEY =
        'test-service-role-key-'.padEnd(160, 'x');
      process.env.GEMINI_API_KEY = 'AIzaSyBfakekey123456789';
      process.env.TAVILY_API_KEY = 'tvly-placeholder';
      process.env.CRON_SECRET = 'secure-cron-secret-123';
      process.env.JWT_SECRET = 'secure-jwt-secret-456';

      // Should not throw with valid variables
      expect(() => validator.validate()).not.toThrow();

      const summary = validator.getValidationSummary();
      expect(summary.errors.length).toBe(0);
    });
  });

  describe('validateConfigurableVars', () => {
    beforeEach(() => {
      // Set required vars to avoid those errors
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://myproject.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
        'test-anon-key-'.padEnd(160, 'x');
      process.env.SUPABASE_SERVICE_ROLE_KEY =
        'test-service-role-key-'.padEnd(160, 'x');
      process.env.GEMINI_API_KEY = 'AIzaSyBfakekey123456789';
      process.env.TAVILY_API_KEY = 'tvly-placeholder';
      process.env.CRON_SECRET = 'secure-cron-secret-123';
      process.env.JWT_SECRET = 'secure-jwt-secret-456';
    });

    it('should set defaults for missing configurable variables', () => {
      validator.validate();

      // Check that defaults were set
      expect(process.env.NODE_ENV).toBe('development');
      expect(process.env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
      expect(process.env.BASE_URL).toBe('http://localhost:3000');
      expect(process.env.LOG_LEVEL).toBe('info');
    });

    it('should warn about missing configurable variables', () => {
      validator.validate();

      const summary = validator.getValidationSummary();
      expect(summary.warnings.some((w) => w.includes('NODE_ENV'))).toBe(true);
      expect(summary.warnings.some((w) => w.includes('will use default'))).toBe(true);
    });
  });

  describe('validateSpecificConfigs', () => {
    beforeEach(() => {
      // Set required vars to avoid those errors
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://myproject.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
        'test-anon-key-'.padEnd(160, 'x');
      process.env.SUPABASE_SERVICE_ROLE_KEY =
        'test-service-role-key-'.padEnd(160, 'x');
      process.env.GEMINI_API_KEY = 'AIzaSyBfakekey123456789';
      process.env.TAVILY_API_KEY = 'tvly-placeholder';
      process.env.CRON_SECRET = 'secure-cron-secret-123';
      process.env.JWT_SECRET = 'secure-jwt-secret-456';
    });

    it('should validate Supabase URL format', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://invalid-url.com';

      validator.validate();

      const summary = validator.getValidationSummary();
      expect(
        summary.warnings.some((w) => w.includes("doesn't look like a valid Supabase URL")),
      ).toBe(true);
    });

    it('should validate NODE_ENV values', () => {
      (process.env as any).NODE_ENV = 'invalid';

      expect(() => validator.validate()).toThrow();

      const summary = validator.getValidationSummary();
      expect(summary.errors.some((e) => e.includes('Invalid NODE_ENV value'))).toBe(true);
    });

    it('should validate boolean flag values', () => {
      process.env.ENABLE_DATA_QUALITY_MONITORING = 'yes';
      process.env.ENABLE_REAL_TIME_UPDATES = 'maybe';

      validator.validate();

      const summary = validator.getValidationSummary();
      expect(summary.warnings.some((w) => w.includes('Invalid boolean value'))).toBe(true);
    });

    it('should validate numeric values', () => {
      process.env.API_RATE_LIMIT_REQUESTS = 'abc';

      validator.validate();

      const summary = validator.getValidationSummary();
      expect(summary.warnings.some((w) => w.includes('Invalid numeric value'))).toBe(true);
    });

    it('should validate CORS origins format', () => {
      process.env.CORS_ORIGINS = 'invalid-origin,ftp://wrong-protocol';

      validator.validate();

      const summary = validator.getValidationSummary();
      expect(summary.warnings.some((w) => w.includes('Invalid CORS origin format'))).toBe(true);
    });
  });

  describe('getValidationSummary', () => {
    it('should return complete validation summary', () => {
      const summary = validator.getValidationSummary();

      expect(summary).toHaveProperty('errors');
      expect(summary).toHaveProperty('warnings');
      expect(summary).toHaveProperty('missingFromExample');
      expect(summary).toHaveProperty('extraInLocal');
      expect(summary).toHaveProperty('timestamp');

      expect(Array.isArray(summary.errors)).toBe(true);
      expect(Array.isArray(summary.warnings)).toBe(true);
      expect(Array.isArray(summary.missingFromExample)).toBe(true);
      expect(Array.isArray(summary.extraInLocal)).toBe(true);
      expect(typeof summary.timestamp).toBe('string');
    });
  });
});
