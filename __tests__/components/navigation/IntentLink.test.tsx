import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import IntentLink, { resolvePrefetch } from '@/components/navigation/IntentLink';

describe('resolvePrefetch', () => {
  it('holds every link back until the visitor shows intent', () => {
    expect(resolvePrefetch(undefined, false)).toBe(false);
    expect(resolvePrefetch(null, false)).toBe(false);
    expect(resolvePrefetch(true, false)).toBe(false);
  });

  it('uses the link default once the visitor hovers, touches or focuses it', () => {
    expect(resolvePrefetch(undefined, true)).toBeNull();
    expect(resolvePrefetch(null, true)).toBeNull();
    expect(resolvePrefetch(true, true)).toBe(true);
  });

  it('never prefetches a link that opted out', () => {
    expect(resolvePrefetch(false, true)).toBe(false);
  });
});

describe('IntentLink', () => {
  it('renders a normal link and still runs the caller handlers', () => {
    const seen: string[] = [];
    render(
      <IntentLink
        href="/trucks"
        onMouseEnter={() => seen.push('hover')}
        onTouchStart={() => seen.push('touch')}
        onFocus={() => seen.push('focus')}
      >
        Trucks
      </IntentLink>,
    );
    const link = screen.getByRole('link', { name: 'Trucks' });
    expect(link.getAttribute('href')).toBe('/trucks');
    fireEvent.mouseEnter(link);
    fireEvent.touchStart(link);
    fireEvent.focus(link);
    expect(seen).toEqual(['hover', 'touch', 'focus']);
  });
});
