/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { STRIPE_CONFIG, validateStripeConfig } from '@/lib/stripe/config';

// Mock environment variables
const originalEnv = process.env;

describe('Stripe Configuration', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('STRIPE_CONFIG', () => {
    it('should have correct structure with all required properties', () => {
      expect(STRIPE_CONFIG).toHaveProperty('publishableKey');
      expect(STRIPE_CONFIG).toHaveProperty('secretKey');
      expect(STRIPE_CONFIG).toHaveProperty('webhookSecret');
      expect(STRIPE_CONFIG).toHaveProperty('prices');
      expect(STRIPE_CONFIG).toHaveProperty('currency');
      expect(STRIPE_CONFIG).toHaveProperty('billingCycle');
      expect(STRIPE_CONFIG).toHaveProperty('urls');
    });

    it('should load publishable key from environment', async () => {
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
      jest.resetModules();
      const { STRIPE_CONFIG: config } = await import('@/lib/stripe/config');
      expect(config.publishableKey).toBe('pk_test_123');
    });

    it('should load secret key from environment', async () => {
      process.env.STRIPE_RESTRICTED_KEY = 'sk_test_456';
      jest.resetModules();
      const { STRIPE_CONFIG: config } = await import('@/lib/stripe/config');
      expect(config.secretKey).toBe('sk_test_456');
    });

    it('should load webhook secret from environment', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_789';
      jest.resetModules();
      const { STRIPE_CONFIG: config } = await import('@/lib/stripe/config');
      expect(config.webhookSecret).toBe('whsec_789');
    });

    it('should default to empty string when publishable key is missing', async () => {
      delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      jest.resetModules();
      const { STRIPE_CONFIG: config } = await import('@/lib/stripe/config');
      expect(config.publishableKey).toBe('');
    });

    it('should default to empty string when secret key is missing', async () => {
      delete process.env.STRIPE_RESTRICTED_KEY;
      jest.resetModules();
      const { STRIPE_CONFIG: config } = await import('@/lib/stripe/config');
      expect(config.secretKey).toBe('');
    });

    it('should default to empty string when webhook secret is missing', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      jest.resetModules();
      const { STRIPE_CONFIG: config } = await import('@/lib/stripe/config');
      expect(config.webhookSecret).toBe('');
    });

    it('should have correct pro price IDs from environment', async () => {
      process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY = 'price_pro_monthly';
      process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY = 'price_pro_yearly';
      process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_FOUNDING = 'price_pro_founding_monthly';
      process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY_FOUNDING = 'price_pro_founding_yearly';
      jest.resetModules();
      const { STRIPE_CONFIG: config } = await import('@/lib/stripe/config');
      expect(config.prices.pro.monthly).toBe('price_pro_monthly');
      expect(config.prices.pro.yearly).toBe('price_pro_yearly');
      expect(config.prices.pro.foundingMonthly).toBe('price_pro_founding_monthly');
      expect(config.prices.pro.foundingYearly).toBe('price_pro_founding_yearly');
    });

    it('should default pro prices to empty strings when missing', async () => {
      delete process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY;
      delete process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY;
      delete process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_FOUNDING;
      delete process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY_FOUNDING;
      jest.resetModules();
      const { STRIPE_CONFIG: config } = await import('@/lib/stripe/config');
      expect(config.prices.pro.monthly).toBe('');
      expect(config.prices.pro.yearly).toBe('');
      expect(config.prices.pro.foundingMonthly).toBe('');
      expect(config.prices.pro.foundingYearly).toBe('');
    });

    it('should have correct currency setting', async () => {
      jest.resetModules();
      const { STRIPE_CONFIG: config } = await import('@/lib/stripe/config');
      expect(config.currency).toBe('usd');
    });

    it('should have correct billing cycle setting', async () => {
      jest.resetModules();
      const { STRIPE_CONFIG: config } = await import('@/lib/stripe/config');
      expect(config.billingCycle).toBe('monthly');
    });

    it('should construct success URL with APP_URL when provided', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
      jest.resetModules();
      const { STRIPE_CONFIG: config } = await import('@/lib/stripe/config');
      expect(config.urls.success).toBe('https://example.com/owner-dashboard?payment=success');
    });

    it('should construct cancel URL with APP_URL when provided', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
      jest.resetModules();
      const { STRIPE_CONFIG: config } = await import('@/lib/stripe/config');
      expect(config.urls.cancel).toBe('https://example.com/owner-dashboard?payment=cancelled');
    });

    it('should default success URL to localhost when APP_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      jest.resetModules();
      const { STRIPE_CONFIG: config } = await import('@/lib/stripe/config');
      expect(config.urls.success).toBe('http://localhost:3000/owner-dashboard?payment=success');
    });

    it('should default cancel URL to localhost when APP_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      jest.resetModules();
      const { STRIPE_CONFIG: config } = await import('@/lib/stripe/config');
      expect(config.urls.cancel).toBe('http://localhost:3000/owner-dashboard?payment=cancelled');
    });

    it('should handle empty APP_URL gracefully', async () => {
      process.env.NEXT_PUBLIC_APP_URL = '';
      jest.resetModules();
      const { STRIPE_CONFIG: config } = await import('@/lib/stripe/config');
      expect(config.urls.success).toBe('http://localhost:3000/owner-dashboard?payment=success');
      expect(config.urls.cancel).toBe('http://localhost:3000/owner-dashboard?payment=cancelled');
    });
  });

  describe('validateStripeConfig()', () => {
    it('should return valid=true when all required env vars are present', async () => {
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
      process.env.STRIPE_RESTRICTED_KEY = 'sk_test_456';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_789';
      jest.resetModules();
      const { validateStripeConfig } = await import('@/lib/stripe/config');
      const result = validateStripeConfig();
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return valid=false when publishable key is missing', async () => {
      delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      process.env.STRIPE_RESTRICTED_KEY = 'sk_test_456';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_789';
      jest.resetModules();
      const { validateStripeConfig } = await import('@/lib/stripe/config');
      const result = validateStripeConfig();
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
    });

    it('should return valid=false when secret key is missing', async () => {
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
      delete process.env.STRIPE_RESTRICTED_KEY;
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_789';
      jest.resetModules();
      const { validateStripeConfig } = await import('@/lib/stripe/config');
      const result = validateStripeConfig();
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('STRIPE_RESTRICTED_KEY');
    });

    it('should return valid=false when webhook secret is missing', async () => {
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
      process.env.STRIPE_RESTRICTED_KEY = 'sk_test_456';
      delete process.env.STRIPE_WEBHOOK_SECRET;
      jest.resetModules();
      const { validateStripeConfig } = await import('@/lib/stripe/config');
      const result = validateStripeConfig();
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('STRIPE_WEBHOOK_SECRET');
    });

    it('should return valid=false when all required env vars are missing', async () => {
      delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      delete process.env.STRIPE_RESTRICTED_KEY;
      delete process.env.STRIPE_WEBHOOK_SECRET;
      jest.resetModules();
      const { validateStripeConfig } = await import('@/lib/stripe/config');
      const result = validateStripeConfig();
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual([
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
        'STRIPE_RESTRICTED_KEY',
        'STRIPE_WEBHOOK_SECRET',
      ]);
    });

    it('should return valid=false when only one env var is missing', async () => {
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
      delete process.env.STRIPE_RESTRICTED_KEY;
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_789';
      jest.resetModules();
      const { validateStripeConfig } = await import('@/lib/stripe/config');
      const result = validateStripeConfig();
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['STRIPE_RESTRICTED_KEY']);
    });

    it('should return valid=false when publishable key is empty string', async () => {
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = '';
      process.env.STRIPE_RESTRICTED_KEY = 'sk_test_456';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_789';
      jest.resetModules();
      const { validateStripeConfig } = await import('@/lib/stripe/config');
      const result = validateStripeConfig();
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
    });

    it('should return valid=false when secret key is empty string', async () => {
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
      process.env.STRIPE_RESTRICTED_KEY = '';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_789';
      jest.resetModules();
      const { validateStripeConfig } = await import('@/lib/stripe/config');
      const result = validateStripeConfig();
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('STRIPE_RESTRICTED_KEY');
    });

    it('should return valid=false when webhook secret is empty string', async () => {
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
      process.env.STRIPE_RESTRICTED_KEY = 'sk_test_456';
      process.env.STRIPE_WEBHOOK_SECRET = '';
      jest.resetModules();
      const { validateStripeConfig } = await import('@/lib/stripe/config');
      const result = validateStripeConfig();
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('STRIPE_WEBHOOK_SECRET');
    });

    it('should return valid=false when all required env vars are empty strings', async () => {
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = '';
      process.env.STRIPE_RESTRICTED_KEY = '';
      process.env.STRIPE_WEBHOOK_SECRET = '';
      jest.resetModules();
      const { validateStripeConfig } = await import('@/lib/stripe/config');
      const result = validateStripeConfig();
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual([
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
        'STRIPE_RESTRICTED_KEY',
        'STRIPE_WEBHOOK_SECRET',
      ]);
    });

    it('should return valid=true when all required env vars have non-empty values', async () => {
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_live_placeholder';
      process.env.STRIPE_RESTRICTED_KEY = 'restricted-key-placeholder';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';
      jest.resetModules();
      const { validateStripeConfig } = await import('@/lib/stripe/config');
      const result = validateStripeConfig();
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });
  });

  describe('Configuration structure', () => {
    it('should have required structure', () => {
      expect(STRIPE_CONFIG).toHaveProperty('publishableKey');
      expect(STRIPE_CONFIG).toHaveProperty('secretKey');
      expect(STRIPE_CONFIG).toHaveProperty('webhookSecret');
      expect(STRIPE_CONFIG).toHaveProperty('prices');
      expect(STRIPE_CONFIG).toHaveProperty('currency');
      expect(STRIPE_CONFIG).toHaveProperty('billingCycle');
      expect(STRIPE_CONFIG).toHaveProperty('urls');
    });
  });
});
