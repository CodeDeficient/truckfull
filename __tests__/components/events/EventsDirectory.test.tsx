import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { EventsDirectory } from '@/components/events/EventsDirectory';

const cities = [
  { city: 'Savannah', state: 'GA', count: 3 },
  { city: 'Charleston', state: 'SC', count: 1 },
];

describe('EventsDirectory', () => {
  it('keeps the real TruckFull shell and renders data-backed city links', () => {
    render(<EventsDirectory cities={cities} />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByAltText('TruckFull Logo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Savannah, GA/ })).toHaveAttribute(
      'href',
      '/events/savannah-ga',
    );
    expect(screen.getByRole('link', { name: /Charleston, SC/ })).toHaveAttribute(
      'href',
      '/events/charleston-sc',
    );
  });

  it('derives the hero total from the supplied city directory data', () => {
    render(<EventsDirectory cities={cities} />);

    expect(screen.getByText('4+ upcoming events')).toBeInTheDocument();
    expect(screen.getByText('across TruckFull')).toBeInTheDocument();
    expect(screen.getByText('3 upcoming events')).toBeInTheDocument();
    expect(screen.getByText('1 upcoming event')).toBeInTheDocument();
  });

  it('keeps the hero free of CTA links and city-section anchors', () => {
    render(<EventsDirectory cities={cities} />);

    expect(screen.queryByRole('link', { name: 'Browse by city' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Explore \d+\+ events/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Research an event' })).not.toBeInTheDocument();
    expect(screen.getByText('4+ upcoming events')).toBeInTheDocument();
    expect(screen.getByText('across TruckFull')).toBeInTheDocument();
  });

  it('keeps the hero effect contained and city cards free of prototype controls', () => {
    const { container } = render(<EventsDirectory cities={cities} />);

    expect(container.querySelector('[data-events-vortex-hero]')).toBeInTheDocument();
    expect(container.querySelector('canvas[aria-hidden="true"]')).toBeInTheDocument();
    expect(screen.queryByText('↗')).not.toBeInTheDocument();
    expect(screen.queryByText('Watch trailer')).not.toBeInTheDocument();
  });
});
