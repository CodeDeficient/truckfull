import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';
import { MobileNavLink } from '../components/MobileNavLink';

export default function Owner_profile_settings() {
  return (
    <>
      <CommonPageHead title="TruckFull - Profile Settings" />
      <style type="text/tailwindcss">{`
      :root {
        --primary-color: #ea2a2a;
      }
      .glassmorphism {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
    `}</style>
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div
        className="relative flex size-full min-h-screen flex-col bg-[#111111] dark group/design-root overflow-x-hidden"
       
      >
        <div className="flex-1">
          <header className="sticky top-0 z-10 glassmorphism">
            <div className="flex items-center p-4">
              <button className="text-white">
                <span className="material-symbols-outlined"> arrow_back_ios_new </span>
              </button>
              <h1 className="text-white text-xl font-bold flex-1 text-center pr-8">Settings</h1>
            </div>
          </header>
          <main className="p-4 space-y-8">
            <div>
              <h2 className="text-white text-lg font-bold mb-4">Account</h2>
              <div className="space-y-2">
                <MobileNavLink
                  className="flex items-center gap-4 p-4 rounded-lg glassmorphism transition-all duration-300 hover:bg-[rgba(234,42,42,0.1)]"
                  href="/@mobile/owner_profile_settings/contact_information"
                >
                  <div className="text-white flex items-center justify-center rounded-lg bg-[rgba(234,42,42,0.2)] shrink-0 size-12">
                    <span className="material-symbols-outlined"> phone </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-base font-medium">Contact Information</p>
                    <p className="text-gray-400 text-sm font-normal">
                      Update your contact information
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-gray-500"> chevron_right </span>
                </MobileNavLink>
                <MobileNavLink
                  className="flex items-center gap-4 p-4 rounded-lg glassmorphism transition-all duration-300 hover:bg-[rgba(234,42,42,0.1)]"
                  href="/@mobile/owner_profile_settings/business_details"
                >
                  <div className="text-white flex items-center justify-center rounded-lg bg-[rgba(234,42,42,0.2)] shrink-0 size-12">
                    <span className="material-symbols-outlined"> briefcase </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-base font-medium">Business Details</p>
                    <p className="text-gray-400 text-sm font-normal">
                      Manage your business details
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-gray-500"> chevron_right </span>
                </MobileNavLink>
                <MobileNavLink
                  className="flex items-center gap-4 p-4 rounded-lg glassmorphism transition-all duration-300 hover:bg-[rgba(234,42,42,0.1)]"
                  href="/@mobile/owner_profile_settings/change_password"
                >
                  <div className="text-white flex items-center justify-center rounded-lg bg-[rgba(234,42,42,0.2)] shrink-0 size-12">
                    <span className="material-symbols-outlined"> lock </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-base font-medium">Password</p>
                    <p className="text-gray-400 text-sm font-normal">Change your password</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-500"> chevron_right </span>
                </MobileNavLink>
              </div>
            </div>
          </main>
        </div>
        <footer className="sticky bottom-0 z-10 glassmorphism" style={{ touchAction: 'none' }}>
          <nav className="flex justify-around items-center py-2 px-4">
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-gray-400"
              href="/@mobile/discover_food_trucks"
            >
              <span className="material-symbols-outlined"> home </span>
              <p className="text-xs font-medium">Home</p>
            </MobileNavLink>
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-gray-400"
              href="/@mobile/search_and_filter"
            >
              <span className="material-symbols-outlined"> search </span>
              <p className="text-xs font-medium">Search</p>
            </MobileNavLink>
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-gray-400"
              href="/@mobile/discover_food_trucks"
            >
              <span className="material-symbols-outlined"> map </span>
              <p className="text-xs font-medium">Map</p>
            </MobileNavLink>
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-[var(--primary-color)]"
              href="/@mobile/user_profile"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {' '}
                person{' '}
              </span>
              <p className="text-xs font-medium">Profile</p>
            </MobileNavLink>
          </nav>
          <div className="h-safe-area-bottom bg-transparent" />
        </footer>
      </div>
    </>
  );
}
