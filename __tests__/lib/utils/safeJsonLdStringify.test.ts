import { describe, expect, it } from '@jest/globals';
import { safeJsonLdStringify } from '@/lib/utils/jsonUtils';

describe('safeJsonLdStringify', () => {
  it.each([
    { title: '</script><script data-xss-probe>void 0</script>' },
    { description: '</SCRIPT><img data-xss-probe src=x onerror="void 0">' },
    { nested: [{ value: '<!--<script>text</script> & <b>text</b>' }] },
    { text: 'José’s "menu"\u2028\u2029' },
    null,
  ])('preserves JSON values while keeping markup inert: %j', (value) => {
    const serialized = safeJsonLdStringify(value);
    const parsed = new DOMParser().parseFromString(
      `<script type="application/ld+json">${serialized}</script>`,
      'text/html',
    );
    expect(parsed.querySelectorAll('script')).toHaveLength(1);
    expect(parsed.querySelector('[data-xss-probe]')).toBeNull();
    expect(serialized).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(parsed.querySelector('script')?.textContent ?? '')).toEqual(value);
  });

  it('rejects an undefined root instead of returning invalid script content', () => {
    expect(() => safeJsonLdStringify(undefined)).toThrow(TypeError);
  });

  it('retains native JSON failure for circular data', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(() => safeJsonLdStringify(circular)).toThrow(TypeError);
  });
});
