import { describe, it, expect } from '@jest/globals';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EventHero } from '@/components/event/EventHero';
import { detectEventCategory, getEventHero } from '@/lib/events/eventHero';
import { getConfidenceBadge } from '@/lib/events/confidenceBadge';

describe('EventHero', () => {
  it('uses the events-page Vortex treatment and never a city photo', () => {
    const hero = getEventHero(detectEventCategory('Daffin Park Farmers Market'));
    const { container } = render(
      <EventHero
        title="Daffin Park Farmers Market"
        subtitle="Savannah, GA · Daffin Park"
        dateLine="Saturday, July 11, 2026"
        hero={hero}
        badge={getConfidenceBadge(70)}
      />,
    );
    const bgs = Array.from(container.querySelectorAll('div[aria-hidden="true"]'));
    const imageBg = bgs.find((el) =>
      (el.getAttribute('style') ?? '').includes('background-image: url('),
    );
    expect(imageBg).toBeUndefined();
    const gradient = bgs.find((el) => (el.getAttribute('style') ?? '').includes('140,23,28'));
    expect(gradient).toBeDefined();
    expect(container.textContent).toContain('Daffin Park Farmers Market');
  });

  it('getEventHero maps the category to its label and color', () => {
    expect(getEventHero('market')).toEqual({
      category: 'market',
      categoryLabel: 'Farmers Market',
      categoryColor: '#f59e0b',
    });
  });

  it('renders both confidence badge variants as the label only, with no tooltip', () => {
    const hero = getEventHero('general');
    for (const badge of [getConfidenceBadge(89), getConfidenceBadge(20)]) {
      const { container, unmount } = render(
        <EventHero title="Test Event" subtitle="" dateLine="" hero={hero} badge={badge} />,
      );
      expect(container.textContent).toContain(badge.label);
      expect(container.querySelector('span[title]')).toBeNull();
      unmount();
    }
  });
});
