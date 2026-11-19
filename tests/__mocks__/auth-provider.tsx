/**
 * Mock for AuthProvider to provide mock AuthContext in tests
 * This resolves "useAuth must be used within an AuthProvider" error
 */

import React from 'react';

// Mock User type for testing
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Mock AuthContext type
interface AuthContextType {
  user: typeof mockUser | undefined;
  loading: boolean;
  signOut: () => Promise<void>;
}

// Create mock AuthContext
export const mockAuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Mock AuthProvider component
export function MockAuthProvider({ children }: { readonly children: React.ReactNode }) {
  const value: AuthContextType = {
    user: mockUser,
    loading: false,
    signOut: jest.fn().mockResolvedValue(undefined),
  };

  return React.createElement(mockAuthContext.Provider, { value }, children);
}

// Mock useAuth hook
export function useMockAuth(): AuthContextType {
  const context = React.useContext(mockAuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Default export for AuthProvider
export default MockAuthProvider;
