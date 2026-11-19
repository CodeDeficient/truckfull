import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import { AnimatedGradientButton } from '../../../components/ui/AnimatedGradientButton';

describe('AnimatedGradientButton', () => {
  it('renders children as text content', () => {
    render(<AnimatedGradientButton>Start Free Trial</AnimatedGradientButton>);
    expect(screen.getByText('Start Free Trial')).toBeInTheDocument();
  });

  it('renders as a button element', () => {
    render(<AnimatedGradientButton>Click Me</AnimatedGradientButton>);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    render(
      <AnimatedGradientButton className="w-full mt-auto">Custom</AnimatedGradientButton>,
    );
    const button = screen.getByRole('button');
    // button should have both its own classes and the passed className
    expect(button.className).toContain('w-full');
    expect(button.className).toContain('mt-auto');
  });

  it('renders the gradient as an animated background on the element', () => {
    render(<AnimatedGradientButton>Test</AnimatedGradientButton>);
    const button = screen.getByRole('button');
    expect(button.style.backgroundImage).toContain('linear-gradient');
    expect(button.style.animation).toContain('gradientShift');
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<AnimatedGradientButton onClick={handleClick}>Click</AnimatedGradientButton>);
    screen.getByRole('button').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders as a link when href prop is provided', () => {
    render(
      <AnimatedGradientButton href="/pricing" onClick={() => {}}>
        Go to Pricing
      </AnimatedGradientButton>,
    );
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
  });

  it('passes href to the anchor element', () => {
    render(
      <AnimatedGradientButton href="/claim-your-truck" onClick={() => {}}>
        Claim
      </AnimatedGradientButton>,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/claim-your-truck');
  });
});
