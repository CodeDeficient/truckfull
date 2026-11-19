/**
 * Stripe Configuration
 *
 * Centralized configuration for Stripe integration
 */

export const STRIPE_CONFIG = {
  // API Keys (set in environment variables)
   
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
   
  secretKey: process.env.STRIPE_RESTRICTED_KEY ?? '',
   
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',

  // Product/Price IDs (will be set after creating products in Stripe Dashboard)
  prices: {
    pro: {
       
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY ?? '',
       
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY ?? '',
      // For founding member discount (50% off)
       
      foundingMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_FOUNDING ?? '',
      foundingMonthlyLegacy:
        process.env.STRIPE_PRICE_PRO_FOUNDING_LEGACY?.split(',')
          .map((priceId) => priceId.trim())
          .filter(Boolean) ?? [],

      foundingYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY_FOUNDING ?? '',
      foundingYearlyLegacy:
        process.env.STRIPE_PRICE_PRO_YEARLY_FOUNDING_LEGACY?.split(',')
          .map((priceId) => priceId.trim())
          .filter(Boolean) ?? [],
    },
  },

  // Stripe settings
  currency: 'usd',
  billingCycle: 'monthly',

  // Success/Cancel URLs
  urls: {
    success: (() => {
       
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      return baseUrl
        ? `${baseUrl}/owner-dashboard?payment=success`
        : 'http://localhost:3000/owner-dashboard?payment=success';
    })(),
    cancel: (() => {
       
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      return baseUrl
        ? `${baseUrl}/owner-dashboard?payment=cancelled`
        : 'http://localhost:3000/owner-dashboard?payment=cancelled';
    })(),
  },
} as const;

/**
 * Validate that required Stripe config is present
 */
export function validateStripeConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!STRIPE_CONFIG.publishableKey) {
    missing.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  }
  if (!STRIPE_CONFIG.secretKey) {
    missing.push('STRIPE_RESTRICTED_KEY');
  }
  if (!STRIPE_CONFIG.webhookSecret) {
    missing.push('STRIPE_WEBHOOK_SECRET');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
