import { describe, expect, it } from '@jest/globals';

import {
  createSignedFacebookBusinessState,
  verifySignedFacebookBusinessState,
} from '@/lib/facebook/businessOAuthState';

describe('businessOAuthState helpers', () => {
  it('creates and verifies signed state payload', () => {
    const signed = createSignedFacebookBusinessState(
      {
        userId: 'user-123',
        returnPath: '/owner-dashboard/facebook',
        truckId: 'truck-456',
        nonce: 'nonce-abc',
        issuedAt: 1730000000,
      },
      'test-secret',
    );

    const verified = verifySignedFacebookBusinessState(signed, 'test-secret', {
      nowEpochSeconds: 1730000100,
      maxAgeSeconds: 600,
    });

    expect(verified.valid).toBe(true);
    expect(verified.payload).toEqual({
      userId: 'user-123',
      returnPath: '/owner-dashboard/facebook',
      truckId: 'truck-456',
      nonce: 'nonce-abc',
      issuedAt: 1730000000,
    });
  });

  it('rejects tampered state signatures', () => {
    const signed = createSignedFacebookBusinessState(
      {
        userId: 'user-123',
        returnPath: '/owner-dashboard/facebook',
        nonce: 'nonce-abc',
        issuedAt: 1730000000,
      },
      'test-secret',
    );

    const tampered = `${signed}tamper`;

    const verified = verifySignedFacebookBusinessState(tampered, 'test-secret', {
      nowEpochSeconds: 1730000100,
      maxAgeSeconds: 600,
    });

    expect(verified.valid).toBe(false);
    expect(verified.error).toBe('invalid_signature');
  });

  it('rejects expired state', () => {
    const signed = createSignedFacebookBusinessState(
      {
        userId: 'user-123',
        returnPath: '/owner-dashboard/facebook',
        nonce: 'nonce-abc',
        issuedAt: 1730000000,
      },
      'test-secret',
    );

    const verified = verifySignedFacebookBusinessState(signed, 'test-secret', {
      nowEpochSeconds: 1730001000,
      maxAgeSeconds: 300,
    });

    expect(verified.valid).toBe(false);
    expect(verified.error).toBe('expired_state');
  });
});
