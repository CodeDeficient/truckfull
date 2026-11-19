import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import { MobileSkeleton, MobileTruckCardSkeleton, MobileProfileSkeleton, MobileTruckDetailsSkeleton } from '@/components/mobile/MobileSkeleton';

describe('MobileSkeleton', () => {
  it('renders without crashing', () => {
    render(React.createElement(MobileSkeleton));
  });

  it('renders with animate-pulse class', () => {
    render(React.createElement(MobileSkeleton));
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('accepts className prop', () => {
    const { container } = render(React.createElement(MobileSkeleton, { className: 'custom-class' }));
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});

describe('MobileTruckCardSkeleton', () => {
  it('renders without crashing', () => {
    render(React.createElement(MobileTruckCardSkeleton));
  });
});

describe('MobileProfileSkeleton', () => {
  it('renders without crashing', () => {
    render(React.createElement(MobileProfileSkeleton));
  });
});

describe('MobileTruckDetailsSkeleton', () => {
  it('renders without crashing', () => {
    render(React.createElement(MobileTruckDetailsSkeleton));
  });
});
