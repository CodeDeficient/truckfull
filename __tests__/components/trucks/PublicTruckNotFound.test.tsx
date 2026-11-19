import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

jest.unstable_mockModule('next/link', () => ({
  default: jest.fn(({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )),
}));

jest.unstable_mockModule('lucide-react', () => ({
  ArrowLeft: jest.fn(() => <div data-testid="arrow-left-icon" />),
}));

const { PublicTruckNotFound } = await import('@/components/trucks/PublicTruckNotFound');

describe('PublicTruckNotFound', () => {
  it('renders not found heading', () => {
    render(<PublicTruckNotFound />);
    expect(screen.getByText('Food Truck Not Found')).toBeInTheDocument();
  });

  it('renders descriptive message', () => {
    render(<PublicTruckNotFound />);
    expect(screen.getByText('The requested food truck could not be found.')).toBeInTheDocument();
  });

  it('renders back to map link', () => {
    render(<PublicTruckNotFound />);
    const link = screen.getByRole('link', { name: /back to map/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });
});
