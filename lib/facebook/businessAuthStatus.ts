export type BusinessAuthStatus = 'connected' | 'missing' | 'expired';

interface BusinessAuthStateInput {
  readonly hasBusinessAppId: boolean;
  readonly hasBusinessAppSecret: boolean;
  readonly hasToken: boolean;
  readonly tokenExpiresAt: string | null;
  readonly nowIso: string;
}

export interface BusinessAuthState {
  readonly needsBusinessAuth: boolean;
  readonly authStatus: BusinessAuthStatus;
  readonly isMisconfigured: boolean;
}

export function getBusinessAuthState({
  hasBusinessAppId,
  hasBusinessAppSecret,
  hasToken,
  tokenExpiresAt,
  nowIso,
}: BusinessAuthStateInput): BusinessAuthState {
  if (!hasBusinessAppId || !hasBusinessAppSecret) {
    return {
      needsBusinessAuth: true,
      authStatus: 'missing',
      isMisconfigured: true,
    };
  }

  if (!hasToken) {
    return {
      needsBusinessAuth: true,
      authStatus: 'missing',
      isMisconfigured: false,
    };
  }

  const isExpired = tokenExpiresAt != null && tokenExpiresAt <= nowIso;
  if (isExpired) {
    return {
      needsBusinessAuth: true,
      authStatus: 'expired',
      isMisconfigured: false,
    };
  }

  return {
    needsBusinessAuth: false,
    authStatus: 'connected',
    isMisconfigured: false,
  };
}
