import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const { MapErrorState } = await import('@/components/map/MapErrorState');

describe('MapErrorState', () => {
  it('renders without crashing', () => {
    const { container } = render(<MapErrorState />);
    expect(container).toBeDefined();
  });

  it('displays map unavailable heading', () => {
    render(<MapErrorState />);
    expect(screen.getByText('Map Unavailable')).toBeInTheDocument();
  });

  it('displays configuration instructions', () => {
    render(<MapErrorState />);
    expect(
      screen.getByText('Please configure your Mapbox access token to enable the map.'),
    ).toBeInTheDocument();
  });

  it('displays link to get Mapbox token', () => {
    render(<MapErrorState />);
    const link = screen.getByRole('link', { name: 'Get Mapbox Token' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://account.mapbox.com/');
  });

  it('opens Mapbox link in new tab', () => {
    render(<MapErrorState />);
    const link = screen.getByRole('link', { name: 'Get Mapbox Token' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
