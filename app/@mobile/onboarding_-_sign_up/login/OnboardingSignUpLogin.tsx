import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';
import { MobileNavLink } from '../../components/MobileNavLink';

export default function Onboarding_sign_up_login() {
  return (
    <>
      <CommonPageHead title="TruckFull Onboarding" />
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div
        className="relative flex size-full min-h-screen flex-col justify-between group/design-root"
        style={{
          backgroundImage:
            'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBpPK3A-saOK0AIuwgpONDEnePE7y7bv82kTi46ryr_-ty3QQM8GYqGNLnCAInkJD8vnK0e83BBVnKihVc3WX4cYrqd4kPC4EHfnDWjn-l8z3Q9xE-86RDAKyXjhSCw3XL1NnH2lDSeHfEczo-Kfqr6BYwUIqON_H8btaXnx-UD-UFu8i-89MWHyH1CKTzlx4nZu2HKtFS6zgcWmjqeEp2tmCCCZJSEFi7g-lMf0SqKp6TQ4RqrZNiu6awrUaGMCpWSRxvgMblXWeKd")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 flex flex-col justify-end flex-grow p-6">
          <div className="flex flex-col items-center justify-center flex-grow text-center">
            <h1 className="text-5xl font-bold tracking-tighter text-white">TruckFull</h1>
          </div>
          <div className="glassmorphism rounded-3xl p-6 mt-8">
            <h2 className="text-3xl font-bold tracking-tight text-white">Welcome aboard!</h2>
            <p className="mt-2 text-base font-normal text-gray-300">
              Find food trucks near you. Create an account or log in to get started.
            </p>
            <div className="mt-8 flex flex-col gap-4">
              <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-[var(--primary-color)] text-white text-lg font-bold leading-normal tracking-wide transition-colors hover:bg-red-700 w-full">
                <span className="truncate">Create Account</span>
              </button>
              <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-white/10 text-white text-lg font-bold leading-normal tracking-wide transition-colors hover:bg-white/20 w-full">
                <span className="truncate">Log In</span>
              </button>
            </div>
          </div>
        </div>
        <div className="relative z-10 p-6 pt-0">
          <p className="text-xs font-normal leading-normal text-center text-gray-400">
            By continuing, you agree to our{' '}
            <MobileNavLink className="underline" href="/@mobile/terms">
              Terms of Service
            </MobileNavLink>{' '}
            and{' '}
            <MobileNavLink className="underline" href="/@mobile/privacy">
              Privacy Policy
            </MobileNavLink>
            .
          </p>
        </div>
      </div>
    </>
  );
}
