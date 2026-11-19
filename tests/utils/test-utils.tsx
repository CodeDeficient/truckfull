import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthContext } from '@/app/auth/AuthProvider';
import { SWRConfig } from 'swr';

// -----------------------------------------------------------------------------
// Mock Auth Provider
// -----------------------------------------------------------------------------
const mockSignOut = jest.fn();

export const MockAuthProvider = ({
  children,
  user = null,
  loading = false,
}: {
  children: React.ReactNode;
  user?: any;
  loading?: boolean;
}) => {
  const value = {
    user,
    loading,
    signOut: mockSignOut,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// -----------------------------------------------------------------------------
// Test Wrapper
// -----------------------------------------------------------------------------

// SWR Config for testing (disable cache to prevent test leakage)
const swrConfig = {
  provider: () => new Map(),
  dedupingInterval: 0,
  shouldRetryOnError: false,
};

interface WrapperProps {
  children: React.ReactNode;
}

export function createWrapper() {
  return function Wrapper({ children }: WrapperProps) {
    return (
      <SWRConfig value={swrConfig}>
        <MockAuthProvider>{children}</MockAuthProvider>
      </SWRConfig>
    );
  };
}

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: createWrapper(), ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };
