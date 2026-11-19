import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

jest.unstable_mockModule('lucide-react', () => ({
  Star: jest.fn(() => <div data-testid="star-icon" />),
}));

const { TruckRatingSection } = await import('../../../components/trucks/TruckRatingSection');

describe('TruckRatingSection', () => {
  it('renders nothing when averageRating is undefined', () => {
    const { container } = render(<TruckRatingSection />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when averageRating is null', () => {
    const { container } = render(
      <TruckRatingSection averageRating={null as unknown as undefined} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders rating section with rating text when averageRating is provided', () => {
    render(<TruckRatingSection averageRating={4.5} />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('Rating')).toBeInTheDocument();
  });

  it('renders review count when provided', () => {
    render(<TruckRatingSection averageRating={4.5} reviewCount={123} />);
    expect(screen.getByText('(123 reviews)')).toBeInTheDocument();
  });

  it('does not render review count when undefined', () => {
    render(<TruckRatingSection averageRating={4.5} reviewCount={undefined} />);
    expect(screen.queryByText(/\(.*reviews\)/)).not.toBeInTheDocument();
  });
});
