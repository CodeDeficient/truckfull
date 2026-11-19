import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const ENCRYPTED_VALUE_VERSION = 'v1';

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update('token-encryption:', 'utf8').update(secret, 'utf8').digest();
}

export function encryptFacebookBusinessToken(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH_BYTES);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTED_VALUE_VERSION,
    iv.toString('base64url'),
    encrypted.toString('base64url'),
    authTag.toString('base64url'),
  ].join('.');
}

export function decryptFacebookBusinessToken(encryptedValue: string, secret: string): string {
  const [version, ivB64, encryptedB64, authTagB64] = encryptedValue.split('.');

  if (
    version !== ENCRYPTED_VALUE_VERSION ||
    !ivB64 ||
    !encryptedB64 ||
    !authTagB64
  ) {
    throw new Error('invalid_encrypted_token_format');
  }

  const iv = Buffer.from(ivB64, 'base64url');
  const encrypted = Buffer.from(encryptedB64, 'base64url');
  const authTag = Buffer.from(authTagB64, 'base64url');

  if (iv.length !== IV_LENGTH_BYTES || authTag.length !== AUTH_TAG_LENGTH_BYTES) {
    throw new Error('invalid_encrypted_token_components');
  }

  const key = deriveKey(secret);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
