import React from 'react';
import UserProfileSection from './_components/UserProfileSection';
import RewardsSection from './_components/RewardsSection';
import EarningPointsSection from './_components/EarningPointsSection';
import BottomNavigation from './_components/BottomNavigation';

export default function Loyalty_and_rewards() {
  return (
    <>
      <meta charSet="utf-8" />
      <title>Stitch Design</title>
      <link href="data:image/x-icon;base64," rel="icon" type="image/x-icon" />
      <style type="text/tailwindcss">{`
      :root {
        --primary-color: #ea2a2a;
      }
    `}</style>
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div
        className="relative flex size-full min-h-screen flex-col bg-[#181111] dark justify-between group/design-root overflow-x-hidden"
       
      >
        <div className="flex flex-col">
          <header className="flex items-center p-4 pb-2 justify-between">
            <button className="text-white flex size-10 shrink-0 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
              <span className="material-symbols-outlined"> arrow_back </span>
            </button>
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
              Rewards
            </h2>
          </header>
          <UserProfileSection />
          <RewardsSection />
          <EarningPointsSection />
          <BottomNavigation />
        </div>
      </div>
    </>
  );
}
