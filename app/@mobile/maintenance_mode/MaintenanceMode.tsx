import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';
import { MobileNavLink } from '../components/MobileNavLink';

export default function Maintenance_mode() {
  return (
    <>
      <CommonPageHead title="Maintenance Mode" />
      <style type="text/tailwindcss">{`
      :root {
        --primary-color: #ea2a2a;
      }
      body {
      }
    `}</style>
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div className="relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-hidden">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-2xl z-0" />
        <div className="relative z-10 flex flex-col h-full">
          <header className="flex items-center p-4 pb-2 justify-between">
            <div className="w-12" />
            <h1 className="text-white text-lg font-bold">TruckFull</h1>
            <div className="flex w-12 items-center justify-end">
              <button className="flex items-center justify-center h-10 w-10">
                <span className="material-symbols-outlined text-white text-2xl">settings</span>
              </button>
            </div>
          </header>
          <main className="flex-grow flex flex-col items-center justify-center text-center px-6">
            <div className="w-24 h-24 rounded-full bg-[var(--primary-color)]/20 border-2 border-[var(--primary-color)] flex items-center justify-center mb-8">
              <span className="material-symbols-outlined text-[var(--primary-color)] text-5xl">
                build
              </span>
            </div>
            <h2 className="text-white text-3xl font-bold leading-tight mb-4">Under Maintenance</h2>
            <p className="text-white/70 text-base font-normal leading-relaxed max-w-sm">
              We&apos;re currently performing some scheduled maintenance. We&apos;ll be back up and
              running shortly. Thank you for your patience!
            </p>
          </main>
          <footer className="w-full">
            <div className="flex justify-around bg-black/30 backdrop-blur-md border-t border-white/10 p-2 mx-4 mb-4 rounded-full">
              <MobileNavLink
                className="flex flex-col items-center justify-center gap-1 text-white w-16 h-12 rounded-full bg-[var(--primary-color)]"
                href="/@mobile/discover_food_trucks"
              >
                <span className="material-symbols-outlined">home</span>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center justify-center gap-1 text-white/50 w-16 h-12"
                href="/@mobile/search_and_filter"
              >
                <span className="material-symbols-outlined">search</span>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center justify-center gap-1 text-white/50 w-16 h-12"
                href="/@mobile/discover_food_trucks"
              >
                <span className="material-symbols-outlined">map</span>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center justify-center gap-1 text-white/50 w-16 h-12"
                href="/@mobile/favorites"
              >
                <span className="material-symbols-outlined">favorite</span>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center justify-center gap-1 text-white/50 w-16 h-12"
                href="/@mobile/user_profile"
              >
                <span className="material-symbols-outlined">person</span>
              </MobileNavLink>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
