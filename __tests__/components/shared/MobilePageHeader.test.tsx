import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

jest.unstable_mockModule('lucide-react', () => ({
  ArrowLeft: jest.fn(() => <div data-testid="arrow-left-icon" />),
}));

const MobilePageHeader = (await import('@/components/shared/MobilePageHeader')).default;

describe('MobilePageHeader', () => {
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title', () => {
    render(<MobilePageHeader title="Settings" onBack={mockOnBack} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders back button with text', () => {
    render(<MobilePageHeader title="Test" onBack={mockOnBack} />);
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<MobilePageHeader title="Test" onBack={mockOnBack} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('renders rightElement when provided', () => {
    render(
      <MobilePageHeader
        title="Test"
        onBack={mockOnBack}
        rightElement={<button data-testid="right-btn">Action</button>}
      />,
    );
    expect(screen.getByTestId('right-btn')).toBeInTheDocument();
  });

  it('renders spacer div when rightElement is not provided', () => {
    const { container } = render(<MobilePageHeader title="Test" onBack={mockOnBack} />);
    const spacer = container.querySelector('.w-16');
    expect(spacer).toBeInTheDocument();
  });
});
