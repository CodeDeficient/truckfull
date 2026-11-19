'use client';

import React from 'react';
import NavigationBar from '@/components/ui/organisms/NavigationBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function OnboardingSignUp() {
  return (
    <div
      className="relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-x-hidden"
     
    >
      <div className="flex-grow">
        <NavigationBar title="TruckFull" />

        <div className="px-4 pb-4">
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-white mb-6">Sign Up</h2>

            <div className="space-y-4">
              <Input
                placeholder="Full Name"
                className="w-full bg-white/5 text-white placeholder:text-gray-400 border-none rounded-full h-12"
              />
              <Input
                placeholder="Email"
                className="w-full bg-white/5 text-white placeholder:text-gray-400 border-none rounded-full h-12"
              />
              <Input
                placeholder="Password"
                type="password"
                className="w-full bg-white/5 text-white placeholder:text-gray-400 border-none rounded-full h-12"
              />
            </div>

            <div className="mt-8">
              <Button className="w-full h-12 rounded-full bg-[var(--primary-color)] text-white font-bold">
                Create Account
              </Button>
            </div>

            <div className="mt-6 text-gray-400 text-sm">
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => (globalThis.location.href = '/@mobile/onboarding_-_sign_up/login')}
                  className="text-[var(--primary-color)] hover:underline"
                >
                  Log in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
