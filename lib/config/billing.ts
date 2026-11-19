/**
 * Billing activation gate.
 *
 * Billing is fail-closed: it is enabled ONLY when the environment variable
 * NEXT_PUBLIC_BILLING_ENABLED is exactly "true". Any other value (including a
 * missing variable) leaves billing paused. This is the single source of truth
 * for whether paid Checkout may proceed; the UI and API routes both read it.
 */
function isBillingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true';
}

export const BILLING_CONFIG = {
  get PAUSED() {
    return !isBillingEnabled();
  },
  PAUSED_MESSAGE:
    "We're not accepting payments right now, but we'll let you know as soon as we do. Thanks for your patience!",
} as const;
