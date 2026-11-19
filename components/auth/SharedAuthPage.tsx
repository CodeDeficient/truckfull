'use client';

import React from 'react';
import { LoginForm } from './LoginForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const handleLogin = (_credentials: { email: string; password: string }): void => {
  // Implement actual login functionality with Supabase Auth
  // For now, just redirect to main app
  globalThis.location.href = '/';
};

const handleRegister = (_credentials: { email: string; password: string; name: string }): void => {
  // Implement actual registration functionality with Supabase Auth
  // For now, just redirect to main app
  globalThis.location.href = '/';
};

const handleForgotPassword = (_email?: string): void => {
  // Implement actual forgot password functionality with Supabase Auth
  // For now, just show success message
  alert('Password reset instructions sent to your email');
};

const handleBack = (): void => {
  globalThis.history.back();
};

export interface SharedAuthPageProps {
  readonly mode: 'login' | 'register';
  readonly title: string;
  readonly linkText?: string;
  readonly linkHref?: string;
  readonly onLogin?: (_credentials: { email: string; password: string }) => void;
  readonly onRegister?: (_credentials: { email: string; password: string; name: string }) => void;
  readonly onForgotPassword?: (_email?: string) => void;
}

export function SharedAuthPage({
  mode,
  title,
  linkText,
  linkHref,
  onLogin = handleLogin,
  onRegister = handleRegister,
  onForgotPassword = handleForgotPassword,
}: SharedAuthPageProps) {
  const actualHandleLogin = (credentials: { email: string; password: string }): void => {
    onLogin(credentials);
  };

  const actualHandleRegister = (credentials: {
    email: string;
    password: string;
    name: string;
  }): void => {
    onRegister(credentials);
  };

  const actualHandleForgotPassword = (email?: string): void => {
    onForgotPassword(email);
  };

  return (
    <div
      className="relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-x-hidden"
     
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <LoginForm
            onLogin={actualHandleLogin}
            onRegister={actualHandleRegister}
            onForgotPassword={actualHandleForgotPassword}
            mode={mode}
          />

          {/* Additional mobile-specific actions */}
          {linkText && linkHref && (
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm mb-4">
                {linkText}{' '}
                <button
                  onClick={() => (globalThis.location.href = linkHref)}
                  className="text-[var(--primary-color)] hover:underline"
                >
                  {mode === 'login' ? 'Sign up here' : 'Sign in here'}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
