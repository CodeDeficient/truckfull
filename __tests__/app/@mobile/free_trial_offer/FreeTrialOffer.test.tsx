import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

const FreeTrialOffer = (await import('@/app/@mobile/free_trial_offer/FreeTrialOffer')).default;

describe('FreeTrialOffer', () => {
  it('renders without crashing', () => {
    render(<FreeTrialOffer />);
  });

  it('renders the main heading', () => {
    render(<FreeTrialOffer />);
    expect(screen.getByText('Unlock Premium for 30 Days')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<FreeTrialOffer />);
    expect(
      screen.getByText(
        'Get access to exclusive features and take your food truck business to the next level.'
      )
    ).toBeInTheDocument();
  });

  it('renders feature list items', () => {
    render(<FreeTrialOffer />);
    expect(screen.getByText('Event Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Deep Analytics')).toBeInTheDocument();
    expect(screen.getByText('Exclusive Discounts')).toBeInTheDocument();
    expect(screen.getByText('Priority Support')).toBeInTheDocument();
  });

  it('renders the call to action button', () => {
    render(<FreeTrialOffer />);
    expect(screen.getByText('Start My Free Trial')).toBeInTheDocument();
  });

  it('renders TruckFull branding', () => {
    render(<FreeTrialOffer />);
    expect(screen.getByText('TruckFull')).toBeInTheDocument();
  });
});
