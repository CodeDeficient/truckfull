'use client';

import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';
import { MobileNavLink } from '../components/MobileNavLink';

export default function OfflineMode(): React.JSX.Element {
  return (
    <>
      <CommonPageHead title="Offline Mode" />
      <style type="text/tailwindcss">{`
      :root {
        --primary-color: #ea2a2a;
      }
      .glassmorphism {
        background: rgba(38, 28, 28, 0.5);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
    `}</style>
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div
        className="relative flex size-full min-h-screen flex-col bg-[#111111] dark justify-between group/design-root"
       
      >
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDuORlhbHiXvltDAehoi5U6ZKUMQpdDRXCS4hFZAjI2LkF3jtjFIc1Ol-EEIPOOuTNWphLR_SFRnOP5ElfYOq6bvI02lYN0-k9tXIRgqaebr_EE1B4mia96BziUhaHScMHCJJ0NiSAQbOmKYDajE8lGcFtK8u7C78j9VpgFxzMCygM5oooHYZFdZiILtLoj76ycFc8OSaGX0cOMI6MWBRhJP88ASsjnUzQr9GnEr-m5qWcRQrcX1m-PNgfqmMgQ_mY5TxtGHYrbqGgv')",
          }}
        />
        <div className="absolute inset-0 z-10 bg-black/50" />
        <div className="relative z-20 flex h-full flex-1 flex-col justify-between">
          <header className="flex items-center justify-between p-4">
            <div className="text-white">
              <span className="material-symbols-outlined text-3xl"> signal_cellular_off </span>
            </div>
            <h1 className="text-xl font-bold text-white">TruckFull</h1>
            <div className="w-8" />
          </header>
          <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="glassmorphism rounded-3xl p-8 shadow-2xl">
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#ea2a2a]/20">
                  <span className="material-symbols-outlined text-5xl text-[#ea2a2a]">
                    {' '}
                    wifi_off{' '}
                  </span>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white">You&apos;re Offline</h2>
              <p className="mt-2 text-base text-gray-300">
                No internet connection found. Check your connection or try again.
              </p>
              <button
                type="button"
                className="mt-8 w-full cursor-pointer rounded-xl bg-[var(--primary-color)] px-8 py-4 text-lg font-bold text-white transition-transform duration-300 ease-in-out hover:scale-105"
                onClick={() => globalThis.location.reload()}
              >
                Retry
              </button>
            </div>
          </main>
          <footer className="glassmorphism border-t border-white/10">
            <nav className="flex items-center justify-around p-2">
              <MobileNavLink
                className="flex flex-col items-center gap-1 p-2 text-white"
                href="/@mobile/discover_food_trucks"
              >
                <span className="material-symbols-outlined"> home </span>
                <span className="text-xs">Home</span>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center gap-1 p-2 text-gray-400"
                href="/@mobile/search_and_filter"
              >
                <span className="material-symbols-outlined"> search </span>
                <span className="text-xs">Search</span>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center gap-1 p-2 text-gray-400"
                href="/@mobile/discover_food_trucks"
              >
                <span className="material-symbols-outlined"> map </span>
                <span className="text-xs">Map</span>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center gap-1 p-2 text-gray-400"
                href="/@mobile/favorites"
              >
                <span className="material-symbols-outlined"> bookmark </span>
                <span className="text-xs">Saved</span>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center gap-1 p-2 text-gray-400"
                href="/@mobile/user_profile"
              >
                <span className="material-symbols-outlined"> person </span>
                <span className="text-xs">Profile</span>
              </MobileNavLink>
            </nav>
          </footer>
        </div>
      </div>
    </>
  );
}
