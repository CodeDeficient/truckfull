import { describe, expect, it } from '@jest/globals';
import { generateFoodTruckJsonLd, jsonLdScriptContent } from '@/lib/seo/jsonLd';
import { generateCityPageJsonLd, cityJsonLdString } from '@/lib/seo/cityJsonLd';
import {
  generateSiteJsonLd,
  jsonLdScriptContent as siteJsonLdScriptContent,
} from '@/lib/seo/siteJsonLd';

interface SerializerCase {
  readonly name: string;
  readonly serialize: (payload: string) => { source: unknown; output: string };
}

const serializers: SerializerCase[] = [
  {
    name: 'truck profiles',
    serialize: (payload: string): { source: unknown; output: string } => {
      const source = generateFoodTruckJsonLd(
        {
          id: 'json-ld-regression',
          name: payload,
          description: payload,
          created_at: '',
          updated_at: '',
          current_location: null,
          contact_info: {},
          social_media: {},
          has_menu: true,
          is_active: true,
          menu_items: [{ name: payload, description: payload, category: payload, price: 5 }],
        },
        'https://example.invalid/truck',
      );
      return { source, output: jsonLdScriptContent(source) };
    },
  },
  {
    name: 'city landing pages',
    serialize: (payload: string): { source: unknown; output: string } => {
      const source = generateCityPageJsonLd({
        cityName: payload,
        stateName: 'Georgia',
        stateAbbr: 'GA',
        slug: 'city-ga',
        truckCount: 2,
        cuisines: [payload],
        pageUrl: 'https://example.invalid/city',
      });
      return { source, output: cityJsonLdString(source) };
    },
  },
  {
    name: 'site layout',
    serialize: (payload: string): { source: unknown; output: string } => {
      const source = generateSiteJsonLd('https://example.invalid');
      source['@graph'][0].name = payload;
      source['@graph'][1].name = payload;
      return { source, output: siteJsonLdScriptContent(source) };
    },
  },
];

describe.each(serializers)('$name JSON-LD script safety', ({ serialize }) => {
  it.each([
    '</script><script data-xss-probe>void 0</script>',
    '</ScRiPt><img data-xss-probe src=x onerror="void 0">',
    '<!--<script></script><img data-xss-probe src=x>',
  ])('keeps %s inside the JSON-LD script', (payload) => {
    const { source, output } = serialize(payload);
    const parsed = new DOMParser().parseFromString(
      `<html><head><script type="application/ld+json">${output}</script></head><body></body></html>`,
      'text/html',
    );
    expect(parsed.querySelectorAll('script')).toHaveLength(1);
    expect(parsed.querySelector('[data-xss-probe]')).toBeNull();
    expect(output).not.toMatch(/[<>]/);
    expect(JSON.parse(parsed.querySelector('script')?.textContent ?? '')).toEqual(source);
  });

  it('preserves schema values including punctuation and Unicode', () => {
    const { source, output } = serialize('José & Jenn’s < Vegan > "menu"\u2028\u2029');
    expect(JSON.parse(output)).toEqual(source);
  });
});
