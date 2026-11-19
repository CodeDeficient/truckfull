import 'server-only';
import { hasSignedInClaims } from '@/lib/auth/requestUser.server';

export async function isSignedInRequest(): Promise<boolean> {
  try {
    return await hasSignedInClaims();
  } catch {
    return false;
  }
}
