import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const { MobileLoadingSpinner, MobilePageLoader } =
  await import('@/components/mobile/MobileLoadingSpinner');

describe('MobileLoadingSpinner', () => {
  it('renders with default props', () => {
    render(<MobileLoadingSpinner />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<MobileLoadingSpinner message="Please wait" />);
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });

  it('does not render message when empty string', () => {
    render(<MobileLoadingSpinner message="" />);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('applies size class for sm', () => {
    const { container } = render(<MobileLoadingSpinner size="sm" />);
    const spinner = container.querySelector('.w-4');
    expect(spinner).toBeInTheDocument();
  });

  it('applies size class for md by default', () => {
    const { container } = render(<MobileLoadingSpinner />);
    const spinner = container.querySelector('.w-8');
    expect(spinner).toBeInTheDocument();
  });

  it('applies size class for lg', () => {
    const { container } = render(<MobileLoadingSpinner size="lg" />);
    const spinner = container.querySelector('.w-12');
    expect(spinner).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<MobileLoadingSpinner className="my-custom" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('my-custom');
  });
});

describe('MobilePageLoader', () => {
  it('renders with default message', () => {
    render(<MobilePageLoader />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<MobilePageLoader message="Fetching data..." />);
    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
  });
});
