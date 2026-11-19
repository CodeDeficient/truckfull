import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';
import { MobileNavLink } from '../components/MobileNavLink';

export default function Performance_analytics() {
  return (
    <>
      <CommonPageHead title="Performance Analytics" />
      <style type="text/tailwindcss">{`
      :root {
        --primary-color: #ea2a2a;
      }
    `}</style>
      <div>
        <div className="flex items-center bg-black p-4 pb-2 justify-between sticky top-0 z-10">
          <div
            className="text-white flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10"
            data-icon="ArrowLeft"
            data-size="24px"
            data-weight="regular"
          >
            <svg
              fill="currentColor"
              height="20px"
              viewBox="0 0 256 256"
              width="20px"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z" />
            </svg>
          </div>
          <h1 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
            Analytics
          </h1>
        </div>
        <div className="px-4 space-y-8 py-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-xl font-bold">Sales Trends</h2>
              <div className="flex gap-2 rounded-full bg-white/10 p-1">
                <button className="text-white/50 text-xs font-semibold px-3 py-1 rounded-full">
                  D
                </button>
                <button className="text-white text-xs font-semibold px-3 py-1 rounded-full bg-[var(--primary-color)]">
                  W
                </button>
                <button className="text-white/50 text-xs font-semibold px-3 py-1 rounded-full">
                  M
                </button>
              </div>
            </div>
            <p className="text-white text-4xl font-bold leading-tight">$12,500</p>
            <div className="flex items-center gap-2">
              <p className="text-zinc-400 text-sm">Last 30 Days</p>
              <p className="text-green-500 text-sm font-medium">+15%</p>
            </div>
            <div className="h-48 mt-6">
              <svg
                fill="none"
                height="100%"
                preserveAspectRatio="none"
                viewBox="0 0 472 150"
                width="100%"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V149H0V109Z"
                  fill="url(#paint0_linear_sales)"
                />
                <path
                  d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25"
                  stroke="var(--primary-color)"
                  strokeLinecap="round"
                  strokeWidth={3}
                />
                <defs>
                  <linearGradient
                    gradientUnits="userSpaceOnUse"
                    id="paint0_linear_sales"
                    x1="236"
                    x2="236"
                    y1="1"
                    y2="149"
                  >
                    <stop stopColor="var(--primary-color)" stopOpacity="0.5" />
                    <stop offset="1" stopColor="var(--primary-color)" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="flex justify-around mt-2">
              <p className="text-zinc-400 text-xs font-medium">1W</p>
              <p className="text-zinc-400 text-xs font-medium">2W</p>
              <p className="text-zinc-400 text-xs font-medium">3W</p>
              <p className="text-zinc-400 text-xs font-medium">4W</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-white text-xl font-bold mb-4">Peak Hours</h2>
            <p className="text-white text-4xl font-bold leading-tight">$850</p>
            <div className="flex items-center gap-2">
              <p className="text-zinc-400 text-sm">Today&apos;s Average</p>
              <p className="text-green-500 text-sm font-medium">+8%</p>
            </div>
            <div className="h-40 mt-6 grid grid-cols-5 gap-4 items-end">
              <div className="flex flex-col items-center gap-2">
                <div className="w-full bg-white/10 rounded-full flex-grow flex items-end">
                  <div
                    className="bg-[var(--primary-color)] w-full rounded-full"
                    style={{ height: '50%' }}
                  />
                </div>
                <p className="text-zinc-400 text-xs font-medium">10AM</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-full bg-white/10 rounded-full flex-grow flex items-end">
                  <div
                    className="bg-[var(--primary-color)] w-full rounded-full"
                    style={{ height: '100%' }}
                  />
                </div>
                <p className="text-zinc-400 text-xs font-medium">12PM</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-full bg-white/10 rounded-full flex-grow flex items-end">
                  <div
                    className="bg-[var(--primary-color)] w-full rounded-full"
                    style={{ height: '20%' }}
                  />
                </div>
                <p className="text-zinc-400 text-xs font-medium">2PM</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-full bg-white/10 rounded-full flex-grow flex items-end">
                  <div
                    className="bg-[var(--primary-color)] w-full rounded-full"
                    style={{ height: '40%' }}
                  />
                </div>
                <p className="text-zinc-400 text-xs font-medium">4PM</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-full bg-white/10 rounded-full flex-grow flex items-end">
                  <div
                    className="bg-[var(--primary-color)] w-full rounded-full"
                    style={{ height: '10%' }}
                  />
                </div>
                <p className="text-zinc-400 text-xs font-medium">6PM</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-white text-xl font-bold mb-4">Top Menu Items</h2>
            <p className="text-white text-4xl font-bold leading-tight">
              120 <span className="text-base font-medium">items sold</span>
            </p>
            <div className="flex items-center gap-2">
              <p className="text-zinc-400 text-sm">Last 7 Days</p>
              <p className="text-green-500 text-sm font-medium">+5%</p>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-white text-sm font-medium">Tacos</p>
                  <p className="text-zinc-400 text-sm">84</p>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-[var(--primary-color)] h-2 rounded-full"
                    style={{ width: '70%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-white text-sm font-medium">Burritos</p>
                  <p className="text-zinc-400 text-sm">36</p>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-[var(--primary-color)] h-2 rounded-full"
                    style={{ width: '30%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-white text-sm font-medium">Quesadillas</p>
                  <p className="text-zinc-400 text-sm">24</p>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-[var(--primary-color)] h-2 rounded-full"
                    style={{ width: '20%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-white text-sm font-medium">Nachos</p>
                  <p className="text-zinc-400 text-sm">60</p>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-[var(--primary-color)] h-2 rounded-full"
                    style={{ width: '50%' }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="h-5 bg-black" />
          </div>
        </div>
        <footer className="sticky bottom-0 z-10" style={{ touchAction: 'none' }}>
          <div className="glassmorphism mx-4 mb-4 rounded-full border-t border-white/10 bg-black/50 px-2 pb-3 pt-2 backdrop-blur-lg">
            <div className="flex justify-around">
              <MobileNavLink
                className="flex flex-col items-center justify-end gap-1 p-2 text-white/60"
                href="/@mobile/discover_food_trucks"
              >
                <span className="material-symbols-outlined text-2xl">explore</span>
                <p className="text-xs font-medium">Map</p>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center justify-end gap-1 p-2 text-white/60"
                href="/@mobile/food_truck_list"
              >
                <span className="material-symbols-outlined text-2xl">format_list_bulleted</span>
                <p className="text-xs font-medium">List</p>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center justify-end gap-1 p-2 text-white/60"
                href="/@mobile/favorites"
              >
                <span className="material-symbols-outlined text-2xl">favorite</span>
                <p className="text-xs font-medium">Favorites</p>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center justify-end gap-1 rounded-full bg-[var(--primary-color)] p-2 text-white"
                href="/@mobile/user_profile"
              >
                <span className="material-symbols-outlined text-2xl">person</span>
                <p className="text-xs font-bold">Profile</p>
              </MobileNavLink>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
