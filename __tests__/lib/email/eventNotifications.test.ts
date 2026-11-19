function escapeHtml(text: string): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replaceAll(/[&<>"']/g, (m) => map[m]);
}

describe('eventNotifications pure functions', () => {
  describe('escapeHtml', () => {
    it('escapes ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('escapes less than', () => {
      expect(escapeHtml('a < b')).toBe('a &lt; b');
    });

    it('escapes greater than', () => {
      expect(escapeHtml('a > b')).toBe('a &gt; b');
    });

    it('escapes double quotes', () => {
      expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
    });

    it('escapes single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#039;s');
    });

    it('escapes all special characters together', () => {
      expect(escapeHtml('a & b < c > d "e" \'f\'')).toBe(
        'a &amp; b &lt; c &gt; d &quot;e&quot; &#039;f&#039;'
      );
    });

    it('returns empty string for empty input', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('returns empty string for null/undefined', () => {
      expect(escapeHtml(null as unknown as string)).toBe('');
      expect(escapeHtml(undefined as unknown as string)).toBe('');
    });

    it('returns text unchanged if no special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    it('handles already escaped content', () => {
      expect(escapeHtml('&amp; &lt;')).toBe('&amp;amp; &amp;lt;');
    });
  });
});
