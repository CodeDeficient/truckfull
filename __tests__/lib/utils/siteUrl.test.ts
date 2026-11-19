import { resolveSiteUrl } from '@/lib/utils/siteUrl';

describe('resolveSiteUrl', () => {
  it('prefers NEXT_PUBLIC_APP_URL when set', () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_APP_URL: 'https://www.truckfull.food',
        NEXT_PUBLIC_SITE_URL: 'https://truckfull.food',
      }),
    ).toBe('https://www.truckfull.food');
  });

  it('falls back to NEXT_PUBLIC_SITE_URL when APP_URL is unset', () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://legacy.example' })).toBe(
      'https://legacy.example',
    );
  });

  it('falls back to the apex origin when neither var is set', () => {
    expect(resolveSiteUrl({})).toBe('https://truckfull.food');
  });
});
