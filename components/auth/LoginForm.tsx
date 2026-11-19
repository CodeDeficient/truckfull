'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { logError } from '@/lib/logging';

interface LoginFormProps {
  readonly onLogin?: (credentials: { email: string; password: string }) => void | Promise<void>;
  readonly onRegister?: (credentials: {
    email: string;
    password: string;
    name: string;
  }) => void | Promise<void>;
  readonly onForgotPassword?: (email?: string) => void | Promise<void>; // Made compatible with both () => void and (email: string) => void
  readonly mode?: 'login' | 'register';
}

export function LoginForm({
  onLogin,
  onRegister,
  onForgotPassword,
  mode: initialMode = 'login',
}: Readonly<LoginFormProps>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Add name state for registration
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>(initialMode); // Add mode state

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    void (async () => {
      try {
        if (mode === 'register' && onRegister) {
          await Promise.resolve(onRegister({ email, password, name }));
        } else if (mode === 'login' && onLogin) {
          await Promise.resolve(onLogin({ email, password }));
        }
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          {mode === 'register' ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          {mode === 'register' ? 'Sign up for an account' : 'Sign in to your account'}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'register' && (
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Full Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
              placeholder="Enter your full name"
            />
          </div>
        )}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
            placeholder="Enter your email"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            {mode === 'login' && (
              <button
                type="button"
                onClick={async () => {
                  // Call the onForgotPassword callback which might return a Promise
                  try {
                    await Promise.resolve(onForgotPassword?.(email));
                  } catch (error) {
                    logError('Forgot password error:', error);
                  }
                }}
                className="text-sm text-[var(--primary-color)] hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
            placeholder="Enter your password"
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
              loading ? 'bg-gray-400' : 'bg-[var(--primary-color)] hover:bg-red-700'
            } transition-colors`}
          >
            {(() => {
              if (loading) {
                return mode === 'register' ? 'Creating Account...' : 'Signing in...';
              } else {
                return mode === 'register' ? 'Create Account' : 'Sign In';
              }
            })()}
          </button>
        </div>
      </form>
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="text-[var(--primary-color)] hover:underline"
        >
          {mode === 'login' ? 'Sign up' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}
