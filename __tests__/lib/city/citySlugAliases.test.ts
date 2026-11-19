import { describe, expect, it } from '@jest/globals';
import { canonicalCitySlug, cityPathRedirect } from '@/lib/city/citySlugAliases';

describe('canonicalCitySlug', () => {
  it('maps retired town spellings to the current slug', () => {
    expect(canonicalCitySlug('mt-pleasant-sc')).toBe('mount-pleasant-sc');
    expect(canonicalCitySlug('mtholly-nc')).toBe('mount-holly-nc');
    expect(canonicalCitySlug('saint-simons-island-ga')).toBe('st-simons-island-ga');
  });

  it('leaves current slugs alone', () => {
    expect(canonicalCitySlug('mount-pleasant-sc')).toBe('mount-pleasant-sc');
    expect(canonicalCitySlug('toString')).toBe('toString');
  });
});

describe('cityPathRedirect', () => {
  it('sends the city index to the trucks hub', () => {
    expect(cityPathRedirect('/city')).toBe('/trucks');
    expect(cityPathRedirect('/city/')).toBe('/trucks');
  });

  it('moves bare city slugs under /city', () => {
    expect(cityPathRedirect('/columbia-sc')).toBe('/city/columbia-sc');
  });

  it('redirects retired city pages in one hop', () => {
    expect(cityPathRedirect('/city/mt-pleasant-sc')).toBe('/city/mount-pleasant-sc');
    expect(cityPathRedirect('/city/mt-gilead-nc/')).toBe('/city/mount-gilead-nc');
    expect(cityPathRedirect('/city/saint-simons-island-ga')).toBe('/city/st-simons-island-ga');
  });

  it('does not redirect current pages or other routes', () => {
    expect(cityPathRedirect('/city/mount-pleasant-sc')).toBeNull();
    expect(cityPathRedirect('/city/columbia-sc')).toBeNull();
    expect(cityPathRedirect('/city/mt-pleasant-sc/extra')).toBeNull();
    expect(cityPathRedirect('/tacos-costa-grande')).toBeNull();
  });
});
