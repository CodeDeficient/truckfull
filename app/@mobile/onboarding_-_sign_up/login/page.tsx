'use client';

import { SharedAuthPage } from '@/components/auth/SharedAuthPage';

const handleLogin = (_credentials: { email: string; password: string }): void => {
  // Implement actual login functionality with Supabase Auth
  // For now, just redirect to main app
  globalThis.location.href = '/@mobile';
};

const handleRegister = (_credentials: { email: string; password: string; name: string }): void => {
  // Implement actual registration functionality with Supabase Auth
  // For now, just redirect to main app
  globalThis.location.href = '/@mobile';
};

export default function LoginPage() {
  return (
    <SharedAuthPage
      mode="login"
      title="Sign In"
      linkText="Don't have an account?"
      linkHref="/@mobile/onboarding_-_sign_up"
      onLogin={handleLogin}
      onRegister={handleRegister}
    />
  );
}
