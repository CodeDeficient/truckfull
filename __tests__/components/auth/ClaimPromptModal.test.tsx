import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

jest.unstable_mockModule('next/image', () => ({
  default: jest.fn(() => null),
}));

jest.unstable_mockModule('lucide-react', () => ({
  X: jest.fn(() => <div data-testid="x-icon" />),
  Truck: jest.fn(() => <div data-testid="truck-icon" />),
  CheckCircle: jest.fn(() => <div data-testid="check-icon" />),
  XCircle: jest.fn(() => <div data-testid="xcircle-icon" />),
  Loader2: jest.fn(() => <div data-testid="loader-icon" />),
}));

const { ClaimPromptModal } = await import('../../../components/auth/ClaimPromptModal');

describe('ClaimPromptModal', () => {
  const mockTruck = {
    id: 'truck-1',
    name: 'Test Food Truck',
    photo_url: null,
    cuisine_type: ['Mexican', 'Tacos'],
  };

  const mockOnClaim = jest.fn().mockResolvedValue(undefined);
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(
      <ClaimPromptModal
        truck={mockTruck}
        isOpen={false}
        onClaim={mockOnClaim}
        onDismiss={mockOnDismiss}
      />,
    );
    expect(screen.queryByText('Is this your truck?')).not.toBeInTheDocument();
  });

  it('renders modal content when isOpen is true', () => {
    render(
      <ClaimPromptModal
        truck={mockTruck}
        isOpen={true}
        onClaim={mockOnClaim}
        onDismiss={mockOnDismiss}
      />,
    );
    expect(screen.getByText('Is this your truck?')).toBeInTheDocument();
    expect(screen.getByText('Test Food Truck')).toBeInTheDocument();
    expect(screen.getByText('Mexican, Tacos')).toBeInTheDocument();
  });

  it('calls onClaim when claim button is clicked', async () => {
    render(
      <ClaimPromptModal
        truck={mockTruck}
        isOpen={true}
        onClaim={mockOnClaim}
        onDismiss={mockOnDismiss}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Yes, this is my truck!' }));

    await Promise.resolve();
    expect(mockOnClaim).toHaveBeenCalledWith('truck-1');
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    render(
      <ClaimPromptModal
        truck={mockTruck}
        isOpen={true}
        onClaim={mockOnClaim}
        onDismiss={mockOnDismiss}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'No, continue as customer' }));
    expect(mockOnDismiss).toHaveBeenCalledWith('truck-1');
  });

  it('calls onDismiss when close button is clicked', () => {
    render(
      <ClaimPromptModal
        truck={mockTruck}
        isOpen={true}
        onClaim={mockOnClaim}
        onDismiss={mockOnDismiss}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(mockOnDismiss).toHaveBeenCalledWith('truck-1');
  });

  it('displays error message when claim fails', async () => {
    mockOnClaim.mockRejectedValueOnce(new Error('Claim failed'));
    render(
      <ClaimPromptModal
        truck={mockTruck}
        isOpen={true}
        onClaim={mockOnClaim}
        onDismiss={mockOnDismiss}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Yes, this is my truck!' }));

    await waitFor(() => {
      expect(screen.getByText('Failed to claim truck. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows loading state when claiming', async () => {
    mockOnClaim.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
    render(
      <ClaimPromptModal
        truck={mockTruck}
        isOpen={true}
        onClaim={mockOnClaim}
        onDismiss={mockOnDismiss}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Yes, this is my truck!' }));

    expect(screen.getByText('Claiming...')).toBeInTheDocument();
  });

  it('disables buttons when loading', async () => {
    mockOnClaim.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
    render(
      <ClaimPromptModal
        truck={mockTruck}
        isOpen={true}
        onClaim={mockOnClaim}
        onDismiss={mockOnDismiss}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Yes, this is my truck!' }));

    expect(screen.getByRole('button', { name: 'Claiming...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'No, continue as customer' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
  });

  it('displays truck photo when photo_url is provided', () => {
    const truckWithPhoto = {
      ...mockTruck,
      photo_url: '/truck-photo.jpg',
    };
    const { container } = render(
      <ClaimPromptModal
        truck={truckWithPhoto}
        isOpen={true}
        onClaim={mockOnClaim}
        onDismiss={mockOnDismiss}
      />,
    );
    expect(container.querySelector('.rounded-full.overflow-hidden')).toBeInTheDocument();
  });

  it('uses default cuisine text when cuisine_type is null', () => {
    const truckNoCuisine = { ...mockTruck, cuisine_type: null };
    render(
      <ClaimPromptModal
        truck={truckNoCuisine}
        isOpen={true}
        onClaim={mockOnClaim}
        onDismiss={mockOnDismiss}
      />,
    );
    expect(screen.getByText('Food Truck')).toBeInTheDocument();
  });
});
