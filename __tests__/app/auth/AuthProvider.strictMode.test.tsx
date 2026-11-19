import { describe, expect, it, jest } from '@jest/globals';
import React, { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.unstable_mockModule('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      getUser: async () => ({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

const { AuthProvider, useAuth } = await import('../../../app/auth/AuthProvider');

function LoadingState(): React.JSX.Element {
  const { loading } = useAuth();
  return <span>{loading ? 'loading' : 'ready'}</span>;
}

describe('AuthProvider', () => {
  it('finishes loading when React mounts its effects twice', async () => {
    render(
      <StrictMode>
        <AuthProvider>
          <LoadingState />
        </AuthProvider>
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy());
  });
});
