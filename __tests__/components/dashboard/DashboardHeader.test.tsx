import { jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Setup unstable_mockModule for ES modules (since the project uses --experimental-vm-modules)
jest.unstable_mockModule('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.unstable_mockModule('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(),
}));

describe('DashboardHeader Component', () => {
  let DashboardHeader: any;
  let useRouter: any;
  let createBrowserClient: any;

  const mockPush = jest.fn();
  const mockSignOut = jest.fn();

  beforeAll(async () => {
    // Dynamic import inside beforeAll avoids top-level await syntax errors in environments that don't support it
    const Navigation = await import('next/navigation');
    const SupabaseSSR = await import('@supabase/ssr');
    const HeaderModule = await import('../../../components/dashboard/DashboardHeader');

    useRouter = Navigation.useRouter;
    createBrowserClient = SupabaseSSR.createBrowserClient;
    DashboardHeader = HeaderModule.DashboardHeader;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

    // Set up router mock
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    // Set up supabase mock
    (createBrowserClient as jest.Mock).mockReturnValue({
      auth: {
        signOut: mockSignOut,
      },
    });

    // Spy on console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the header correctly', () => {
    render(
      <DashboardHeader
        icon={<span data-testid="test-icon">icon</span>}
        title="Test Dashboard"
        welcomeName="John Doe"
      />
    );

    expect(screen.getByText('Test Dashboard')).toBeDefined();
    expect(screen.getByText('Welcome, John Doe')).toBeDefined();
    expect(screen.getByTestId('test-icon')).toBeDefined();
  });

  it('calls supabase.auth.signOut and router.push on successful logout', async () => {
    mockSignOut.mockResolvedValueOnce(undefined);

    render(
      <DashboardHeader
        icon={<span>icon</span>}
        title="Test Dashboard"
        welcomeName="John Doe"
      />
    );

    const signOutButton = screen.getByRole('button', { name: /Sign Out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('calls optional onSignOut prop, supabase.auth.signOut and router.push', async () => {
    const customOnSignOut = jest.fn().mockResolvedValueOnce(undefined);
    mockSignOut.mockResolvedValueOnce(undefined);

    render(
      <DashboardHeader
        icon={<span>icon</span>}
        title="Test Dashboard"
        welcomeName="John Doe"
        onSignOut={customOnSignOut}
      />
    );

    const signOutButton = screen.getByRole('button', { name: /Sign Out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(customOnSignOut).toHaveBeenCalled();
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('catches and logs errors from supabase.auth.signOut', async () => {
    const error = new Error('Sign out failed');
    mockSignOut.mockRejectedValueOnce(error);

    render(
      <DashboardHeader
        icon={<span>icon</span>}
        title="Test Dashboard"
        welcomeName="John Doe"
      />
    );

    const signOutButton = screen.getByRole('button', { name: /Sign Out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Error logging out:', error);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
