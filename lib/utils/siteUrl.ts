export type SiteUrlEnv = Readonly<Record<string, string | undefined>>;

const APEX_SITE_URL = 'https://truckfull.food';

export function resolveSiteUrl(env: SiteUrlEnv): string {
  return env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL || APEX_SITE_URL;
}
