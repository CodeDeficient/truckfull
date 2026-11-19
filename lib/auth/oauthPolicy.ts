interface RedirectTargetInput {
  readonly origin: string;
  readonly redirectTo: string;
  readonly userRole: string | null | undefined;
}

export function isSameOriginRelativePath(value: string, origin: string): boolean {
  if (!value.startsWith('/')) return false;
  try {
    const expectedOrigin = new URL(origin).origin;
    return new URL(value, expectedOrigin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

export function getDefaultNewProfileRole(): 'customer' {
  return 'customer';
}

/**
 * The callback route has already validated redirectTo against its allowlist
 * and open-redirect checks before this policy runs. Validated paths in the
 * allowlist are honored for every role; the role-specific defaults below
 * apply only when redirectTo is the fallback '/'.
 */
function isValidatedPath(redirectTo: string): boolean {
  return redirectTo !== '/' && redirectTo !== '';
}

export function getOAuthRedirectTarget({
  origin,
  redirectTo,
  userRole,
}: RedirectTargetInput): string {
  switch (userRole) {
    case 'admin': {
      return `${origin}${redirectTo}`;
    }
    case 'food_truck_owner': {
      return isValidatedPath(redirectTo) ? `${origin}${redirectTo}` : `${origin}/owner-dashboard`;
    }
    case 'customer': {
      return isValidatedPath(redirectTo) ? `${origin}${redirectTo}` : `${origin}/`;
    }
    case 'user': {
      return isValidatedPath(redirectTo) ? `${origin}${redirectTo}` : `${origin}/`;
    }
    default: {
      return `${origin}/unauthorized`;
    }
  }
}
