import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

jest.unstable_mockModule('next/link', () => ({
  default: ({ href, children, className }: any) =>
    React.createElement('a', { href, className }, children),
}));

jest.unstable_mockModule('lucide-react', () => ({
  Home: () => React.createElement('span', { 'data-testid': 'home-icon' }),
  Truck: () => React.createElement('span', { 'data-testid': 'truck-icon' }),
  Users: () => React.createElement('span', { 'data-testid': 'users-icon' }),
  BarChart3: () => React.createElement('span', { 'data-testid': 'barchart-icon' }),
  Settings: () => React.createElement('span', { 'data-testid': 'settings-icon' }),
  Database: () => React.createElement('span', { 'data-testid': 'database-icon' }),
  Activity: () => React.createElement('span', { 'data-testid': 'activity-icon' }),
  Wrench: () => React.createElement('span', { 'data-testid': 'wrench-icon' }),
  Mail: () => React.createElement('span', { 'data-testid': 'mail-icon' }),
  ShieldAlert: () => React.createElement('span', { 'data-testid': 'shield-icon' }),
  ClipboardList: () => React.createElement('span', { 'data-testid': 'clipboard-icon' }),
  Inbox: () => React.createElement('span', { 'data-testid': 'inbox-icon' }),
}));

const { AdminNavLinks } = await import('@/components/admin/AdminNavLinks');

describe('AdminNavLinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Desktop mode (isMobile=false)', () => {
    it('renders without crashing', () => {
      render(React.createElement(AdminNavLinks, { isMobile: false }));
    });

    it('renders category labels', () => {
      render(React.createElement(AdminNavLinks, { isMobile: false }));
      expect(screen.getByText('Main')).toBeInTheDocument();
      expect(screen.getByText('Management')).toBeInTheDocument();
      expect(screen.getByText('Monitoring')).toBeInTheDocument();
    });

    it('renders navigation links', () => {
      render(React.createElement(AdminNavLinks, { isMobile: false }));
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Food Trucks')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
    });
  });

  describe('Mobile mode (isMobile=true)', () => {
    it('renders without crashing', () => {
      render(React.createElement(AdminNavLinks, { isMobile: true }));
    });

    it('renders navigation links without categories', () => {
      render(React.createElement(AdminNavLinks, { isMobile: true }));
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Food Trucks')).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('defaults isMobile to false', () => {
      render(React.createElement(AdminNavLinks, {}));
      expect(screen.getByText('Main')).toBeInTheDocument();
    });
  });
});
