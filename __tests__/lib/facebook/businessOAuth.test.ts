import { describe, expect, it } from '@jest/globals';

import {
  FACEBOOK_BUSINESS_REQUIRED_SCOPES,
  buildFacebookBusinessOAuthUrl,
  decodeFacebookBusinessState,
  encodeFacebookBusinessState,
  hasAllRequiredBusinessScopes,
} from '@/lib/facebook/businessOAuth';

describe('businessOAuth helpers', () => {
  it('builds Facebook business OAuth URL with expected params and scopes', () => {
    const redirectUri = 'https://truckfull.food/api/owner/facebook/oauth/callback';
    const state = 'signed-state-token';

    const url = buildFacebookBusinessOAuthUrl({
      appId: '123456',
      redirectUri,
      state,
    });

    expect(url.origin).toBe('https://www.facebook.com');
    expect(url.pathname).toBe('/v25.0/dialog/oauth');
    expect(url.searchParams.get('client_id')).toBe('123456');
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri);
    expect(url.searchParams.get('state')).toBe(state);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe(FACEBOOK_BUSINESS_REQUIRED_SCOPES.join(','));
  });

  it('encodes and decodes state payload losslessly', () => {
    const encoded = encodeFacebookBusinessState({
      userId: 'user-123',
      returnPath: '/owner-dashboard/facebook',
      truckId: 'truck-456',
      nonce: 'nonce-789',
      issuedAt: 1730000000,
    });

    const decoded = decodeFacebookBusinessState(encoded);

    expect(decoded).toEqual({
      userId: 'user-123',
      returnPath: '/owner-dashboard/facebook',
      truckId: 'truck-456',
      nonce: 'nonce-789',
      issuedAt: 1730000000,
    });
  });

  it('returns null for malformed state payloads', () => {
    expect(decodeFacebookBusinessState('not-base64')).toBeNull();
    expect(decodeFacebookBusinessState(Buffer.from('{"userId":1}', 'utf8').toString('base64url'))).toBeNull();
  });

  it('validates required business scopes', () => {
    const granted = [...FACEBOOK_BUSINESS_REQUIRED_SCOPES, 'email'];
    expect(hasAllRequiredBusinessScopes(granted)).toEqual({
      valid: true,
      missing: [],
    });

    expect(hasAllRequiredBusinessScopes(['public_profile'])).toEqual({
      valid: false,
      missing: FACEBOOK_BUSINESS_REQUIRED_SCOPES.filter((scope) => scope !== 'public_profile'),
    });
  });
});
