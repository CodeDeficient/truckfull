import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';
import { MobileNavLink } from '../components/MobileNavLink';

export default function Faq_and_help_2() {
  return (
    <>
      <CommonPageHead title="FAQ and Help" />
      <style type="text/tailwindcss">{`
    :root {
      --primary-color: #ea2a2a;
      --background-start: #1a1a1a;
      --background-end: #0d0d0d;
      --glass-bg: rgba(255, 255, 255, 0.05);
      --glass-border: rgba(255, 255, 255, 0.1);
      --text-primary: #ffffff;
      --text-secondary: #a8a8a8;
      --red-accent: #ea2a2a;
    }
    body {
    }
    .glass-effect {
      background: var(--glass-bg);
      backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
    }
  `}</style>
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div className="relative flex size-full min-h-screen flex-col overflow-x-hidden">
        <div className="flex-grow">
          <header className="sticky top-0 z-10 glass-effect p-4">
            <div className="flex items-center justify-between">
              <button className="flex items-center gap-2 text-[var(--text-primary)]">
                <span className="material-symbols-outlined">arrow_back_ios</span>
              </button>
              <h1 className="text-xl font-bold text-center flex-1">Help &amp; FAQs</h1>
              <div className="w-8" />
            </div>
          </header>
          <main className="p-4 space-y-6">
            <div className="relative">
              <input
                className="w-full h-12 pl-10 pr-4 rounded-xl glass-effect text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--red-accent)]"
                placeholder="Search FAQs"
                type="text"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                search
              </span>
            </div>
            <section>
              <h2 className="text-lg font-bold mb-4">Common Questions</h2>
              <div className="space-y-2">
                <MobileNavLink
                  className="flex items-center justify-between p-4 rounded-xl glass-effect hover:bg-[var(--glass-border)] transition-colors duration-200"
                  href="/@mobile/discover_food_trucks"
                >
                  <span className="flex-1">How do I find food trucks?</span>
                  <span className="material-symbols-outlined text-[var(--text-secondary)]">
                    chevron_right
                  </span>
                </MobileNavLink>
                <MobileNavLink
                  className="flex items-center justify-between p-4 rounded-xl glass-effect hover:bg-[var(--glass-border)] transition-colors duration-200"
                  href="/@mobile/search_and_filter"
                >
                  <span className="flex-1">Can I filter trucks by cuisine?</span>
                  <span className="material-symbols-outlined text-[var(--text-secondary)]">
                    chevron_right
                  </span>
                </MobileNavLink>
                <MobileNavLink
                  className="flex items-center justify-between p-4 rounded-xl glass-effect hover:bg-[var(--glass-border)] transition-colors duration-200"
                  href="/@mobile/favorites"
                >
                  <span className="flex-1">How do I save my favorite trucks?</span>
                  <span className="material-symbols-outlined text-[var(--text-secondary)]">
                    chevron_right
                  </span>
                </MobileNavLink>
                <MobileNavLink
                  className="flex items-center justify-between p-4 rounded-xl glass-effect hover:bg-[var(--glass-border)] transition-colors duration-200"
                  href="/@mobile/discover_food_trucks"
                >
                  <span className="flex-1">What if a truck is not at its listed location?</span>
                  <span className="material-symbols-outlined text-[var(--text-secondary)]">
                    chevron_right
                  </span>
                </MobileNavLink>
                <MobileNavLink
                  className="flex items-center justify-between p-4 rounded-xl glass-effect hover:bg-[var(--glass-border)] transition-colors duration-200"
                  href="/@mobile/contact_support"
                >
                  <span className="flex-1">How do I report an issue?</span>
                  <span className="material-symbols-outlined text-[var(--text-secondary)]">
                    chevron_right
                  </span>
                </MobileNavLink>
              </div>
            </section>
            <section>
              <h2 className="text-lg font-bold mb-4">Contact Support</h2>
              <div className="space-y-2">
                <MobileNavLink
                  className="flex items-center justify-between p-4 rounded-xl glass-effect hover:bg-[var(--glass-border)] transition-colors duration-200"
                  href="/@mobile/contact_support"
                >
                  <span className="flex-1">Email Support</span>
                  <span className="material-symbols-outlined text-[var(--text-secondary)]">
                    chevron_right
                  </span>
                </MobileNavLink>
                <MobileNavLink
                  className="flex items-center justify-between p-4 rounded-xl glass-effect hover:bg-[var(--glass-border)] transition-colors duration-200"
                  href="/@mobile/contact_support"
                >
                  <span className="flex-1">Call Support</span>
                  <span className="material-symbols-outlined text-[var(--text-secondary)]">
                    chevron_right
                  </span>
                </MobileNavLink>
              </div>
            </section>
          </main>
        </div>
        <footer className="sticky bottom-0 z-10 glass-effect p-2" style={{ touchAction: 'none' }}>
          <nav className="flex justify-around">
            <MobileNavLink
              className="flex flex-col items-center gap-1 text-[var(--text-secondary)] w-1/4"
              href="/@mobile/discover_food_trucks"
            >
              <span className="material-symbols-outlined">map</span>
              <span className="text-xs">Map</span>
            </MobileNavLink>
            <MobileNavLink
              className="flex flex-col items-center gap-1 text-[var(--text-secondary)] w-1/4"
              href="/@mobile/food_truck_list"
            >
              <span className="material-symbols-outlined">list</span>
              <span className="text-xs">List</span>
            </MobileNavLink>
            <MobileNavLink
              className="flex flex-col items-center gap-1 text-[var(--text-secondary)] w-1/4"
              href="/@mobile/favorites"
            >
              <span className="material-symbols-outlined">favorite</span>
              <span className="text-xs">Favorites</span>
            </MobileNavLink>
            <MobileNavLink
              className="flex flex-col items-center gap-1 text-[var(--red-accent)] w-1/4"
              href="/@mobile/user_profile"
            >
              <span className="material-symbols-outlined">person</span>
              <span className="text-xs">Profile</span>
            </MobileNavLink>
          </nav>
        </footer>
      </div>
    </>
  );
}
