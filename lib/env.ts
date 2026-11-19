/**
 * Environment Variable Validator
 *
 * This module provides runtime validation for environment variables,
 * ensuring all required variables are present and properly configured.
 * It throws descriptive errors early to prevent runtime issues.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { logError, logWarning, logMessage } from '@/lib/logging';

const HTTPS_PROTOCOL = /^(?:https):\/\//;
const HTTP_ONLY_PROTOCOL = /^(?:http):\/\//;
const ENV_KEY = /^[A-Z_][A-Z0-9_]*$/;

// Type definitions for environment variables
interface RequiredEnvVars {
  // Supabase Core (Required)
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // Authentication
  CRON_SECRET: string;
}

interface OptionalEnvVars {
  // Database
  DATABASE_PASSWORD?: string;
  DATABASE_URL?: string;
  SUPABASE_DB_PASSWORD?: string;

  // Research
  SEARXNG_URL?: string;
  TAVILY_API_KEY?: string;
  EXA_API_KEY?: string;
  BRAVE_API_KEY?: string;
  RESEARCH_DISABLE_EXA?: string;

  OPENROUTER_API_KEY?: string;

  // Google Services
  GOOGLE_API_KEY?: string;
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string;

  // Social Media APIs
  YELP_API_KEY?: string;
  YELP_CLIENT_ID?: string;
  FACEBOOK_AUTH_APP_ID?: string;
  FACEBOOK_AUTH_APP_SECRET?: string;
  FACEBOOK_BUSINESS_APP_ID?: string;
  FACEBOOK_BUSINESS_APP_SECRET?: string;

  // Meta/Facebook Webhooks
  FACEBOOK_BUSINESS_WEBHOOK_VERIFY_TOKEN?: string;
  FACEBOOK_BUSINESS_WEBHOOK_APP_SECRET?: string;
  META_WEBHOOK_VERIFY_TOKEN?: string;
  META_WEBHOOK_APP_SECRET?: string;

  // Monitoring
  NEXT_PUBLIC_VERCEL_ANALYTICS_ID?: string;
  SLACK_WEBHOOK_URL?: string;

  // Development/Debug
  DEBUG_DATABASE?: string;
  USE_MOCK_DATA?: string;
  MOCK_DELAY?: string;

  // Vercel
  VERCEL_OIDC_TOKEN?: string;

  // Backup & Maintenance
  BACKUP_SCHEDULE?: string;
  BACKUP_RETENTION_DAYS?: string;
  BACKUP_STORAGE_URL?: string;
  MAINTENANCE_WINDOW_START?: string;
  MAINTENANCE_WINDOW_END?: string;
  MAINTENANCE_TIMEZONE?: string;
}

interface ConfigurableEnvVars {
  // Environment
  NODE_ENV: 'development' | 'production' | 'test';

  // URLs
  NEXT_PUBLIC_APP_URL: string;
  BASE_URL: string;

  // Scheduling
  SCHEDULE_DATA_QUALITY_CHECK: string;
  SCHEDULE_LOCATION_UPDATES: string;

  // Feature Flags
  ENABLE_DATA_QUALITY_MONITORING: string;
  ENABLE_REAL_TIME_UPDATES: string;
  FEATURE_AI_PROCESSING: string;
  FEATURE_GEOSPATIAL_QUERIES: string;
  FEATURE_REAL_TIME_NOTIFICATIONS: string;
  FEATURE_USER_REVIEWS: string;
  FEATURE_TRUCK_OWNER_DASHBOARD: string;

  // Security & Rate Limiting
  API_RATE_LIMIT_REQUESTS: string;
  API_RATE_LIMIT_WINDOW: string;
  CORS_ORIGINS: string;

  // Logging
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
}

type AllEnvVars = RequiredEnvVars & OptionalEnvVars & ConfigurableEnvVars;

class EnvironmentValidator {
  private errors: string[] = [];
  private warnings: string[] = [];
  private missingFromExample: string[] = [];
  private extraInLocal: string[] = [];

  /**
   * Validates all environment variables
   */
  public validate(): void {
    logMessage('🔍 Starting environment variable validation...\n');

    // Check required variables
    this.validateRequiredVars();

    // Check configurable variables with defaults
    this.validateConfigurableVars();

    // Compare with .env.local.example
    this.compareWithExample();

    // Validate specific configurations
    this.validateSpecificConfigs();

    // Report results
    this.reportResults();
  }

  /**
   * Validates required environment variables
   */
  private validateRequiredVars(): void {
    const required: (keyof RequiredEnvVars)[] = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'CRON_SECRET',
    ];

    for (const key of required) {
      const value = process.env[key];

      if (value == undefined || value.trim() === '') {
        this.errors.push(`❌ Missing required variable: ${key}`);
      } else if (this.isPlaceholder(value)) {
        this.errors.push(`❌ Placeholder value detected for: ${key} (value: "${value}")`);
      }
    }
  }

  /**
   * Validates configurable environment variables with defaults
   */
  private validateConfigurableVars(): void {
    const configurableDefaults: Partial<ConfigurableEnvVars> = {
      NODE_ENV: 'development',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      BASE_URL: 'http://localhost:3000',
      LOG_LEVEL: 'info',
      API_RATE_LIMIT_REQUESTS: '100',
      API_RATE_LIMIT_WINDOW: '900000',
      CORS_ORIGINS: 'http://localhost:3000',
    };

    for (const [key, defaultValue] of Object.entries(configurableDefaults)) {
      const value = process.env[key];

      if (value == undefined || value.trim() === '') {
        this.warnings.push(
          `⚠️ Missing configurable variable: ${key} (will use default: "${defaultValue}")`,
        );
        // Set the default value
        process.env[key] = defaultValue;
      }
    }
  }

  /**
   * Compares current environment with .env.local.example
   */
  private compareWithExample(): void {
    const examplePath = path.resolve(process.cwd(), '.env.local.example');
    const localPath = path.resolve(process.cwd(), '.env.local');

    if (!existsSync(examplePath)) {
      this.warnings.push('⚠️ .env.local.example file not found for comparison');
      return;
    }

    // Parse example file
    const exampleVars = this.parseEnvFile(examplePath);
    const exampleKeys = new Set(Object.keys(exampleVars));

    // Parse local file if it exists
    if (existsSync(localPath)) {
      const localVars = this.parseEnvFile(localPath);
      const localKeys = new Set(Object.keys(localVars));

      // Find missing keys (in example but not in local)
      for (const key of exampleKeys) {
        if (!localKeys.has(key) && (process.env[key] == undefined || process.env[key] === '')) {
          // Check if it's commented out as optional
          if (this.isOptionalInExample(key, exampleVars)) {
            continue;
          }
          this.missingFromExample.push(key);
        }
      }

      // Find extra keys (in local but not in example)
      for (const key of localKeys) {
        if (!exampleKeys.has(key)) {
          this.extraInLocal.push(key);
        }
      }
    } else {
      this.errors.push('❌ .env.local file not found!');
    }
  }

  /**
   * Validates specific configuration requirements
   */
  private validateSpecificConfigs(): void {
    // Validate Supabase URL format
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (
      supabaseUrl != undefined &&
      supabaseUrl !== '' &&
      !supabaseUrl.includes('.supabase.co') &&
      !supabaseUrl.includes('localhost')
    ) {
      this.warnings.push(
        `⚠️ NEXT_PUBLIC_SUPABASE_URL doesn't look like a valid Supabase URL: ${supabaseUrl}`,
      );
    }

    // Validate Supabase keys format
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anonKey != undefined && anonKey !== '' && anonKey.length < 100) {
      this.warnings.push('⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY seems too short to be valid');
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey != undefined && serviceKey !== '' && serviceKey.length < 100) {
      this.warnings.push('⚠️ SUPABASE_SERVICE_ROLE_KEY seems too short to be valid');
    }

    // Validate NODE_ENV
    const nodeEnv = process.env.NODE_ENV;
    if (
      typeof nodeEnv === 'string' &&
      nodeEnv.length > 0 &&
      !['development', 'production', 'test'].includes(nodeEnv)
    ) {
      this.errors.push(
        `❌ Invalid NODE_ENV value: ${nodeEnv} (must be 'development', 'production', or 'test')`,
      );
    }

    // Validate boolean flags
    const booleanFlags = [
      'ENABLE_DATA_QUALITY_MONITORING',
      'ENABLE_REAL_TIME_UPDATES',
      'FEATURE_AI_PROCESSING',
      'FEATURE_GEOSPATIAL_QUERIES',
      'FEATURE_REAL_TIME_NOTIFICATIONS',
      'FEATURE_USER_REVIEWS',
      'FEATURE_TRUCK_OWNER_DASHBOARD',
      'DEBUG_DATABASE',
      'USE_MOCK_DATA',
    ];

    for (const flag of booleanFlags) {
      const value = process.env[flag];
      if (
        value != undefined &&
        value !== '' &&
        !['true', 'false', '1', '0'].includes(value.toLowerCase())
      ) {
        this.warnings.push(
          `⚠️ Invalid boolean value for ${flag}: "${value}" (should be 'true' or 'false')`,
        );
      }
    }

    // Validate numeric values
    const numericVars = ['API_RATE_LIMIT_REQUESTS', 'API_RATE_LIMIT_WINDOW', 'MOCK_DELAY'];

    for (const varName of numericVars) {
      const value = process.env[varName];
      if (value != undefined && value !== '' && Number.isNaN(Number(value))) {
        this.warnings.push(`⚠️ Invalid numeric value for ${varName}: "${value}"`);
      }
    }

    // Validate CORS origins
    const corsOrigins = process.env.CORS_ORIGINS;
    if (corsOrigins != undefined && corsOrigins !== '') {
      const origins = corsOrigins.split(',');
      for (const origin of origins) {
        const originStr = origin.trim();
        if (!HTTPS_PROTOCOL.test(originStr) && !HTTP_ONLY_PROTOCOL.test(originStr)) {
          this.warnings.push(
            `⚠️ Invalid CORS origin format: "${origin.trim()}" (should start with http:// or https://)`,
          );
        }
      }
    }
  }

  /**
   * Reports validation results
   */
  private reportResults(): void {
    const hasErrors = this.errors.length > 0;
    const hasWarnings = this.warnings.length > 0;
    const hasMissing = this.missingFromExample.length > 0;
    const hasExtra = this.extraInLocal.length > 0;

    // Report errors
    if (hasErrors) {
      logError('\n🚨 CRITICAL ERRORS:');
      for (const error of this.errors) logError(error);
    }

    // Report warnings
    if (hasWarnings) {
      logWarning('\n⚠️ WARNINGS:');
      for (const warning of this.warnings) logWarning(warning);
    }

    // Report missing from example
    if (hasMissing) {
      logWarning('\n📋 Variables in .env.local.example but missing from .env.local:');
      for (const key of this.missingFromExample) logWarning(`  - ${key}`);
    }

    // Report extra in local
    if (hasExtra) {
      logMessage('\n➕ Extra variables in .env.local (not in .env.local.example):');
      for (const key of this.extraInLocal) logMessage(`  - ${key}`);
    }

    // Summary
    logMessage('\n' + '='.repeat(60));
    if (hasErrors) {
      logError(`\n❌ Validation FAILED with ${this.errors.length} critical error(s)`);
      logError('Please fix the errors above before running the application.\n');
      throw new Error('Environment validation failed');
    } else if (hasWarnings || hasMissing) {
      logWarning(
        `\n⚠️ Validation completed with ${this.warnings.length} warning(s) and ${this.missingFromExample.length} missing variable(s)`,
      );
      logWarning('The application may run, but some features might not work correctly.\n');
    } else {
      logMessage('\n✅ Environment validation PASSED!');
      logMessage('All required environment variables are properly configured.\n');
    }
  }

  /**
   * Parses an environment file
   */
  private parseEnvFile(filePath: string): Record<string, string> {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const vars: Record<string, string> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Parse key=value without potentially slow regex
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        const raw = trimmed.slice(eqIndex + 1);
        if (ENV_KEY.test(key)) {
          let v = raw.trim();
          const startsWithQuote = v.startsWith('"') ?? v.startsWith("'");
          const endsWithQuote = v.endsWith('"') ?? v.endsWith("'");
          if (startsWithQuote && endsWithQuote && v.length >= 2) {
            v = v.slice(1, -1);
          }
          vars[key] = v;
        }
      }
    }

    return vars;
  }

  /**
   * Checks if a value is a placeholder
   */
  private isPlaceholder(value: string): boolean {
    const placeholders = [
      '<projectid>',
      'your-',
      'YOUR_',
      'xxx',
      'XXX',
      '...',
      'placeholder',
      'PLACEHOLDER',
      'example',
      'EXAMPLE',
    ];

    return placeholders.some((placeholder) => value.includes(placeholder));
  }

  /**
   * Checks if a key is marked as optional in the example file
   */
  private isOptionalInExample(key: string, exampleVars: Record<string, string>): boolean {
    // Check if the key starts with common optional prefixes or is empty in example
    const value = exampleVars[key];
    return (
      key.startsWith('BACKUP_') ||
      key.startsWith('MAINTENANCE_') ||
      key.includes('OPTIONAL') ||
      (value === '' || value === '""' || value === "''")
    );
  }

  /**
   * Gets validation summary for documentation
   */
  public getValidationSummary(): {
    errors: string[];
    warnings: string[];
    missingFromExample: string[];
    extraInLocal: string[];
    timestamp: string;
  } {
    return {
      errors: this.errors,
      warnings: this.warnings,
      missingFromExample: this.missingFromExample,
      extraInLocal: this.extraInLocal,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
const envValidator = new EnvironmentValidator();

// Auto-validate on import (can be disabled by setting SKIP_ENV_VALIDATION=true)
if (process.env.SKIP_ENV_VALIDATION !== 'true') {
  try {
    envValidator.validate();
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      // In production, we want to fail fast
      throw error;
    } else {
      // In development, we log the error but continue
      logError('Environment validation error:', error);
    }
  }
}

// Export for manual validation and testing
export { envValidator, EnvironmentValidator };

// Export type definitions
export type { RequiredEnvVars, OptionalEnvVars, ConfigurableEnvVars, AllEnvVars };
