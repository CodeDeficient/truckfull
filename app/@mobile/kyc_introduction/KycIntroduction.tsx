import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';
import { MobileNavLink } from '../components/MobileNavLink';

export default function Kyc_introduction() {
  return (
    <>
      <CommonPageHead title="TruckFull - Verify Identity" />
      <style type="text/tailwindcss">{`
    :root {
      --primary-color: #ea2a2a;
    }
    .glassmorphism {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
  `}</style>
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div className="relative flex size-full min-h-screen flex-col justify-between group/design-root overflow-x-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-100px] left-[-100px] w-64 h-64 bg-[var(--primary-color)]/20 rounded-full filter blur-3xl opacity-50 animate-pulse" />
          <div className="absolute bottom-[-100px] right-[-100px] w-64 h-64 bg-[var(--primary-color)]/20 rounded-full filter blur-3xl opacity-50 animate-pulse delay-2000" />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <header className="flex items-center p-4 pb-2 justify-between">
            <div />
            <h1 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
              TruckFull
            </h1>
            <div className="flex w-12 items-center justify-end">
              <button className="flex items-center justify-center rounded-full h-10 w-10 bg-white/10 text-white hover:bg-white/20 transition-colors">
                <span className="material-symbols-outlined text-2xl">help</span>
              </button>
            </div>
          </header>
          <main className="flex-grow flex flex-col items-center justify-center p-6 text-center">
            <div className="glassmorphism rounded-3xl p-8 max-w-sm w-full space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-[var(--primary-color)]/20 rounded-full">
                  <span className="material-symbols-outlined text-4xl text-[var(--primary-color)]">
                    verified_user
                  </span>
                </div>
              </div>
              <h2 className="text-white text-3xl font-bold leading-tight tracking-tight">
                Let&apos;s Verify Your Identity
              </h2>
              <p className="text-gray-300 text-base font-normal leading-relaxed">
                To ensure the security of your account and transactions, we need to verify your
                identity. This process helps protect you and other users.
              </p>
              <button className="w-full h-14 px-6 bg-[var(--primary-color)] text-white text-lg font-bold leading-normal tracking-wide rounded-xl shadow-[0_4px_20px_rgba(234,42,42,0.3)] hover:bg-red-600 transition-all duration-300 ease-in-out transform hover:scale-105">
                Begin Verification
              </button>
            </div>
          </main>
        </div>
        <footer className="relative z-10">
          <div className="flex justify-around border-t border-white/10 bg-black/30 backdrop-blur-sm px-2 py-3">
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-[var(--primary-color)]"
              href="/@mobile/discover_food_trucks"
            >
              <span className="material-symbols-outlined text-2xl">home</span>
              <span className="text-xs font-medium">Home</span>
            </MobileNavLink>
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-white transition-colors"
              href="/@mobile/search_and_filter"
            >
              <span className="material-symbols-outlined text-2xl">search</span>
              <span className="text-xs font-medium">Search</span>
            </MobileNavLink>
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-white transition-colors"
              href="/@mobile/find_&_claim_screen"
            >
              <span className="material-symbols-outlined text-2xl">add_box</span>
              <span className="text-xs font-medium">Post</span>
            </MobileNavLink>
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-white transition-colors"
              href="/@mobile/favorites"
            >
              <span className="material-symbols-outlined text-2xl">bookmark</span>
              <span className="text-xs font-medium">Saved</span>
            </MobileNavLink>
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-white transition-colors"
              href="/@mobile/user_profile"
            >
              <span className="material-symbols-outlined text-2xl">person</span>
              <span className="text-xs font-medium">Profile</span>
            </MobileNavLink>
          </div>
          <div className="h-5 bg-black/30" />
        </footer>
      </div>
    </>
  );
}
