import { describe, it, expect } from '@jest/globals';
import { render } from '@testing-library/react';
import { SeoPageShell } from '@/components/ui/organisms/SeoPageShell';

import ContactPage from '@/app/contact/page';
import TakedownPage from '@/app/takedown/page';
import TermsPage from '@/app/terms/page';
import PrivacyPage from '@/app/privacy/page';
import LiveLocationPage from '@/app/food-truck-live-location/page';
import TrafficDataPage from '@/app/food-truck-traffic-data/page';
import EventResearchPage from '@/app/food-truck-event-research/page';

function countH1(container: HTMLElement): number {
  return container.querySelectorAll('h1').length;
}

describe('SeoPageShell h1 count', () => {
  it('renders 0 h1 elements', () => {
    const { container } = render(
      <SeoPageShell>
        <div>test content</div>
      </SeoPageShell>,
    );
    expect(countH1(container)).toBe(0);
  });
});

describe('static page h1 count', () => {
  it.each<[string, () => JSX.Element]>([
    ['/contact', ContactPage],
    ['/takedown', TakedownPage],
    ['/terms', TermsPage],
    ['/privacy', PrivacyPage],
    ['/food-truck-live-location', LiveLocationPage],
    ['/food-truck-traffic-data', TrafficDataPage],
    ['/food-truck-event-research', EventResearchPage],
  ])('%s renders exactly 1 h1', (_, Page) => {
    const { container } = render(<Page />);
    expect(countH1(container)).toBe(1);
  });

  it('/features renders exactly 1 h1', async () => {
    const mod = await import('@/app/features/page');
    const { container } = render(<mod.default />);
    expect(countH1(container)).toBe(1);
  });

  it('/for-owners renders exactly 1 h1', async () => {
    const mod = await import('@/app/for-owners/page');
    const { container } = render(<mod.default />);
    expect(countH1(container)).toBe(1);
  });
});
