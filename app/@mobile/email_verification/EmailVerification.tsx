import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';
import { MobileNavLink } from '../components/MobileNavLink';

export default function Email_verification() {
  return (
    <>
      <CommonPageHead title="Email Verification" />
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div
        className="relative flex size-full min-h-screen flex-col bg-cover bg-center"
        style={{
          backgroundImage:
            'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD0uXPXFvGAng2nxqlENhMr7OdXipDxyLDsuKX3IlFXHReamVNZtmE6GGJRbbDKH-zMvTMWaYy_ogM4taOrAsLAUddKzaZszI6kkywBqz40Ft464VGCeqE4KDqixgzwv6yp0L00MJwvO7TfQo4mwZ8nrjz8jWdyC16tuuKTme-0_ySCVoTrXRIXq_SXnm7nooN9G_Wz_9QKmXDMUocV6UblctKO4aXBOrHKQKRSuShiN9S0LTUzx2pI5MN7o-bIY514rj2FJ09SH3S9")',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex flex-col justify-between h-full min-h-screen">
          <header className="flex items-center justify-between p-4">
            <button className="text-white">
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h1 className="text-lg font-bold text-white">TruckFull</h1>
            <div className="w-8" />
          </header>
          <main className="flex-grow flex flex-col items-center justify-center text-center px-4">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl w-full max-w-sm">
              <div className="mb-6">
                <span className="material-symbols-outlined text-white text-5xl">
                  mark_email_unread
                </span>
              </div>
              <h2 className="text-white text-3xl font-bold mb-3">Verify Your Email</h2>
              <p className="text-white/80 mb-8">
                We&apos;ve sent a verification link to your email. Please check your inbox and click
                the link to complete your registration.
              </p>
              <button className="w-full bg-[#ea2a2a] text-white font-bold py-3 rounded-lg text-lg mb-4 hover:bg-[#c82424] transition-colors duration-300">
                Resend Email
              </button>
              <MobileNavLink
                className="text-white/70 underline hover:text-white transition-colors duration-300"
                href="/@mobile/contact_support"
              >
                Contact Support
              </MobileNavLink>
            </div>
          </main>
          <footer className="bg-black/30 backdrop-blur-lg">
            <nav className="flex justify-around items-center p-2">
              <MobileNavLink
                className="flex flex-col items-center text-white gap-1"
                href="/@mobile/discover_food_trucks"
              >
                <span className="material-symbols-outlined text-3xl">home</span>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center text-white/60 gap-1"
                href="/@mobile/search_and_filter"
              >
                <span className="material-symbols-outlined text-3xl">search</span>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center text-white/60 gap-1"
                href="/@mobile/find_&_claim_screen"
              >
                <span className="material-symbols-outlined text-3xl">add_box</span>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center text-white/60 gap-1"
                href="/@mobile/favorites"
              >
                <span className="material-symbols-outlined text-3xl">favorite</span>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center text-white/60 gap-1"
                href="/@mobile/user_profile"
              >
                <span className="material-symbols-outlined text-3xl">person</span>
              </MobileNavLink>
            </nav>
          </footer>
        </div>
      </div>
    </>
  );
}
