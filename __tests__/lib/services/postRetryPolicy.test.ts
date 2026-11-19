import { describe, expect, it } from '@jest/globals';
import { resolveManualRetryAction } from '@/lib/services/postRetryPolicy';

describe('resolveManualRetryAction', () => {
  it('routes pending posts straight to processing', () => {
    expect(resolveManualRetryAction('pending')).toBe('process');
  });

  it('routes failed posts to the atomic requeue', () => {
    expect(resolveManualRetryAction('failed')).toBe('requeue');
  });

  it('rejects pending_confirmation posts', () => {
    expect(resolveManualRetryAction('pending_confirmation')).toBe('non-retryable');
  });

  it('rejects pending_review posts', () => {
    expect(resolveManualRetryAction('pending_review')).toBe('non-retryable');
  });

  it('rejects processing posts', () => {
    expect(resolveManualRetryAction('processing')).toBe('non-retryable');
  });

  it('rejects processed posts', () => {
    expect(resolveManualRetryAction('processed')).toBe('non-retryable');
  });

  it('rejects rejected posts', () => {
    expect(resolveManualRetryAction('rejected')).toBe('non-retryable');
  });

  it('rejects unknown statuses', () => {
    expect(resolveManualRetryAction(undefined)).toBe('non-retryable');
    expect(resolveManualRetryAction('expired')).toBe('non-retryable');
  });
});
