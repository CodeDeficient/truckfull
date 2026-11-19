import { describe, expect, it } from '@jest/globals';

import {
  decryptFacebookBusinessToken,
  encryptFacebookBusinessToken,
} from '@/lib/facebook/businessTokenCrypto';

describe('businessTokenCrypto helpers', () => {
  it('encrypts and decrypts token values', () => {
    const encrypted = encryptFacebookBusinessToken('token-abc-123', 'secret-key');
    const decrypted = decryptFacebookBusinessToken(encrypted, 'secret-key');

    expect(encrypted).not.toBe('token-abc-123');
    expect(decrypted).toBe('token-abc-123');
  });

  it('fails decrypt when secret does not match', () => {
    const encrypted = encryptFacebookBusinessToken('token-abc-123', 'secret-key');

    expect(() => decryptFacebookBusinessToken(encrypted, 'wrong-secret')).toThrow();
  });

  it('fails decrypt when encrypted format is invalid', () => {
    expect(() => decryptFacebookBusinessToken('bad-format', 'secret-key')).toThrow(
      'invalid_encrypted_token_format',
    );
  });
});
