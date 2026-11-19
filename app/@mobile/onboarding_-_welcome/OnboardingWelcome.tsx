import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';
import { MobileNavLink } from '../components/MobileNavLink';

export default function Onboarding_welcome() {
  return (
    <>
      <CommonPageHead title="TruckFull Onboarding" />
      <style type="text/tailwindcss">{`
      :root {
        --primary-red: #ea2a2a;
        --background-dark: #121212;
        --text-light: #ffffff;
        --text-secondary: #a0a0a0;
      }
    `}</style>

      <div
        className="relative flex size-full min-h-screen flex-col bg-cover bg-center text-[var(--text-light)]"
        style={{
          backgroundImage:
            'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD4-0LjNUV9ljmH903zVdcLM4Zj7W0WUXNhuIvvKmqx0928xtlbEpVM79ezIl_5tB9X9gCIZA64QuF64rQ5ChfslIl4rJTJtulRzy4Cc-lQ3aH3pampagKiYz56FjYLBlAVjM9XJLIrL12kYY_xMcjjwgZJEuFZrxBrGiwkdZV1F7L5WSMtgA9IHcV86EfKYYcuMoqflxqVYpOcRDeCrvDIn6b9vllSP6TpsoRxi8FavO32u8GXYz5_gLi8RKbmBw7tPgSYnteleQxJ")',
        }}
      >
        <div className="absolute inset-0 bg-[var(--background-dark)] opacity-70" />
        <div className="relative z-10 flex flex-grow flex-col justify-between p-6">
          <div className="flex-grow" />
          <div className="glassmorphism rounded-3xl p-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-light)]">
              Discover, Save, and Browse
            </h2>
            <p className="mt-4 text-base font-normal leading-relaxed text-[var(--text-secondary)]">
              Find food trucks near you, save your favorites, and discover detailed information
              about each truck.
            </p>
          </div>
          <div className="mt-8 flex flex-col items-center">
            <div className="flex w-full flex-row items-center justify-center gap-3 py-5">
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--primary-red)]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--inactive-dot)]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--inactive-dot)]" />
            </div>
            <button className="mt-4 flex w-full max-w-sm cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 bg-[var(--primary-red)] text-[var(--text-light)] text-lg font-bold leading-normal tracking-wide shadow-lg transition-transform duration-300 hover:scale-105">
              <span className="truncate">Next</span>
            </button>
            <MobileNavLink
              className="mt-6 text-sm font-medium text-[var(--text-secondary)] transition-colors duration-300 hover:text-[var(--text-light)]"
              href="/@mobile/discover_food_trucks"
            >
              Skip
            </MobileNavLink>
          </div>
        </div>
      </div>
    </>
  );
}
