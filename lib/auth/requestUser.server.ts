import 'server-only';
import { headers } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { usesBearerScheme, readBearerToken } from '@/lib/auth/bearerToken';

async function readAuthorizationHeader(): Promise<string | null> {
  const requestHeaders = await headers();
  return requestHeaders.get('authorization');
}

export async function getRequestUserId(): Promise<string | null> {
  const header = await readAuthorizationHeader();
  if (usesBearerScheme(header)) {
    const token = readBearerToken(header);
    if (token === null) return null;
    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    return error || !data.user ? null : data.user.id;
  }
  const { data, error } = await createServerSupabaseClient().auth.getUser();
  return error || !data.user ? null : data.user.id;
}

export async function hasSignedInClaims(): Promise<boolean> {
  const header = await readAuthorizationHeader();
  if (usesBearerScheme(header)) {
    const token = readBearerToken(header);
    if (token === null) return false;
    const { data } = await getSupabaseAdmin().auth.getClaims(token);
    return typeof data?.claims.sub === 'string';
  }
  const { data } = await createServerSupabaseClient().auth.getClaims();
  return typeof data?.claims.sub === 'string';
}
