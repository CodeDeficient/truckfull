/**
 * DashboardSidebar Component Tests
 *
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/owner-dashboard',
}));

jest.unstable_mockModule('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.unstable_mockModule('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

const { DashboardSidebar } = await import('@/app/owner-dashboard/_components/dashboard/sidebar');

describe('DashboardSidebar', () => {
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the sidebar without crashing', () => {
    render(<DashboardSidebar className="test-class" />);
    expect(screen.getByText('TruckFull')).toBeInTheDocument();
  });

  it('should render navigation items', () => {
    render(<DashboardSidebar />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('My Trucks')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should call onNavigate when close button is clicked', () => {
    render(<DashboardSidebar onNavigate={mockOnNavigate} />);
    const closeButton = screen.getByLabelText('Close sidebar');
    fireEvent.click(closeButton);
    expect(mockOnNavigate).toHaveBeenCalledTimes(1);
  });

  it('should render tier-gated items with tier badges', () => {
    render(<DashboardSidebar />);
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getAllByText('Pro').length).toBeGreaterThan(0);
  });

  it('should render external links', () => {
    render(<DashboardSidebar />);
    const supportLink = screen.getByText('Get Support');
    expect(supportLink).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<DashboardSidebar className="custom-sidebar-class" />);
    const aside = screen.getByRole('complementary');
    expect(aside).toHaveClass('custom-sidebar-class');
  });
});