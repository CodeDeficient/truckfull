import { FACEBOOK_GRAPH_API_VERSION } from '@/lib/facebook/constants';

export const FACEBOOK_BUSINESS_REQUIRED_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_manage_metadata',
  'pages_read_engagement',
  'business_management',
] as const;

export interface FacebookBusinessStatePayload {
  userId: string;
  returnPath: string;
  truckId?: string;
  nonce: string;
  issuedAt: number;
}

interface BuildFacebookBusinessOAuthUrlArgs {
  appId: string;
  redirectUri: string;
  state: string;
}

export function buildFacebookBusinessOAuthUrl(args: BuildFacebookBusinessOAuthUrlArgs): URL {
  const url = new URL(`https://www.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/dialog/oauth`);
  url.searchParams.set('client_id', args.appId);
  url.searchParams.set('redirect_uri', args.redirectUri);
  url.searchParams.set('state', args.state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', FACEBOOK_BUSINESS_REQUIRED_SCOPES.join(','));
  return url;
}

export function encodeFacebookBusinessState(payload: FacebookBusinessStatePayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeFacebookBusinessState(state: string): FacebookBusinessStatePayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as
      | FacebookBusinessStatePayload
      | null;

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.returnPath !== 'string' ||
      typeof parsed.nonce !== 'string' ||
      typeof parsed.issuedAt !== 'number'
    ) {
      return null;
    }

    if (parsed.truckId != null && typeof parsed.truckId !== 'string') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function hasAllRequiredBusinessScopes(grantedScopes: readonly string[]): {
  valid: boolean;
  missing: string[];
} {
  const scopeSet = new Set(grantedScopes);
  const missing = FACEBOOK_BUSINESS_REQUIRED_SCOPES.filter((scope) => !scopeSet.has(scope));
  return {
    valid: missing.length === 0,
    missing,
  };
}
