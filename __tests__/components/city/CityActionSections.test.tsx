import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BookDirectSection, CityEventsSection } from '@/components/city/CityActionSections';

const event = {
  id: 'e1',
  title: 'Food Truck Friday',
  path: '/events/augusta-ga/food-truck-friday-2026-11-06',
  startDate: '2026-11-06',
  endDate: null,
  address: '1 Broad St, Augusta, GA',
};

describe('CityEventsSection', () => {
  it('renders nothing when the city has no upcoming events', () => {
    const { container } = render(
      <CityEventsSection
        cityName="Augusta"
        citySlug="augusta-ga"
        events={{ total: 0, upcoming: [] }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('links each event and the full city events page with the real total', () => {
    render(
      <CityEventsSection
        cityName="Augusta"
        citySlug="augusta-ga"
        events={{ total: 7, upcoming: [event] }}
      />,
    );
    expect(screen.getByRole('link', { name: /Food Truck Friday/ })).toHaveAttribute(
      'href',
      event.path,
    );
    expect(
      screen.getByRole('link', { name: 'See all 7 upcoming Augusta food truck events' }),
    ).toHaveAttribute('href', '/events/augusta-ga');
  });
});

describe('BookDirectSection', () => {
  it('states the phone count and links to the phone filter', () => {
    render(<BookDirectSection cityName="Augusta" withPhone={5} total={12} />);
    expect(screen.getByText(/5 of the 12 Augusta listings include a phone number\./)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Show trucks with a phone number' })).toHaveAttribute(
      'href',
      '#book-direct',
    );
  });

  it('drops the count and the filter link when no listing has a phone', () => {
    render(<BookDirectSection cityName="Evans" withPhone={0} total={2} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText(/include a phone number/)).not.toBeInTheDocument();
  });
});
