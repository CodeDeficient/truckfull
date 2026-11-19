import { describe, it, expect } from '@jest/globals';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AboutSection } from '@/components/events/AboutSection';

const baseInfo = [
  { label: 'When', value: 'Saturday, September 12, 2026' },
  { label: 'Where', value: '123 Main St' },
];

describe('AboutSection', () => {
  it('preserves real line breaks in multiline descriptions', () => {
    const { container } = render(
      <AboutSection description={'Line one\n\nLine two after a blank line'} info={baseInfo} />,
    );
    const paragraph = container.querySelector('p');
    expect(paragraph?.className).toContain('whitespace-pre-line');
    expect(paragraph?.textContent).toContain('Line one');
    expect(paragraph?.textContent).toContain('Line two after a blank line');
  });

  it('renders a single-line description without the pre-line affecting content', () => {
    const { container } = render(
      <AboutSection description="One solid paragraph." info={baseInfo} />,
    );
    const paragraph = container.querySelector('p');
    expect(paragraph?.textContent).toBe('One solid paragraph.');
  });

  it('keeps the info column and organizer link intact alongside the description', () => {
    const { container } = render(
      <AboutSection
        description="Details here."
        info={[
          ...baseInfo,
          { label: 'Organizer', value: 'Example Org', href: 'https://example.com' },
        ]}
      />,
    );
    expect(container.textContent).toContain('Saturday, September 12, 2026');
    const link = container.querySelector('a[href="https://example.com"]');
    expect(link).toBeDefined();
  });
});

describe('blank-description fallback decision (pure logic)', () => {
  // Mirrors the page.tsx decision: null/undefined/blank/whitespace-only
  // descriptions fall back; real text (even with surrounding whitespace)
  // uses the source description.
  function pick(description: string | null, fallback: string): string {
    const trimmed = description?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : fallback;
  }

  it('null description falls back', () => {
    expect(pick(null, 'FALLBACK')).toBe('FALLBACK');
  });

  it('empty string falls back (unlike the previous ?? operator)', () => {
    expect(pick('', 'FALLBACK')).toBe('FALLBACK');
  });

  it('whitespace-only falls back', () => {
    expect(pick('   \n\t  ', 'FALLBACK')).toBe('FALLBACK');
  });

  it('real text is used trimmed', () => {
    expect(pick('  Real description.  ', 'FALLBACK')).toBe('Real description.');
  });

  it('multiline text is preserved', () => {
    expect(pick('Line one\nLine two', 'FALLBACK')).toBe('Line one\nLine two');
  });
});
