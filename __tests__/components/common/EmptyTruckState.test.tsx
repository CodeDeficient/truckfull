import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmptyTruckState } from '../../../components/common/EmptyTruckState';

describe('EmptyTruckState', () => {
  it('renders default message', () => {
    render(<EmptyTruckState />);
    expect(screen.getByText('No food trucks found in your area.')).toBeInTheDocument();
  });

  it('renders default subMessage', () => {
    render(<EmptyTruckState />);
    expect(screen.getByText('Try expanding your search radius or check back later!')).toBeInTheDocument();
  });

  it('renders custom message when provided', () => {
    render(<EmptyTruckState message="Custom message" />);
    expect(screen.getByText('Custom message')).toBeInTheDocument();
  });

  it('renders custom subMessage when provided', () => {
    render(<EmptyTruckState subMessage="Custom submessage" />);
    expect(screen.getByText('Custom submessage')).toBeInTheDocument();
  });
});