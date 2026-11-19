import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';

export default function Manage_promotions_owner_() {
  return (
    <>
      <CommonPageHead title="TruckFull - Create Offer" />
      <style type="text/tailwindcss">{`
    :root {
        --foreground-rgb: 255, 255, 255;
        --background-start-rgb: 24, 17, 17;
        --background-end-rgb: 24, 17, 17;
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

      <div
        className="relative flex size-full min-h-screen flex-col"
       
      >
        <main className="flex-1 flex flex-col px-4 pt-4 pb-8">
          <header className="flex items-center justify-between mb-8">
            <button className="p-2 rounded-full hover:bg-white/10">
              <span className="material-symbols-outlined text-white">arrow_back_ios_new</span>
            </button>
            <h1 className="text-xl font-bold leading-tight tracking-tight text-center">
              Create Offer
            </h1>
            <div className="w-10" />
          </header>
          <div className="flex-1 flex flex-col space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70" htmlFor="offer-title">
                Offer Title
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
                  sell
                </span>
                <input
                  className="form-input w-full rounded-xl border-none bg-white/5 backdrop-blur-sm focus:ring-2 focus:ring-[#ea2a2a] h-14 pl-12 pr-4 text-base placeholder:text-white/40"
                  id="offer-title"
                  placeholder="e.g. Taco Tuesday Special"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70" htmlFor="offer-description">
                Description
              </label>
              <textarea
                className="form-textarea w-full rounded-xl border-none bg-white/5 backdrop-blur-sm focus:ring-2 focus:ring-[#ea2a2a] min-h-36 p-4 text-base placeholder:text-white/40 resize-none"
                id="offer-description"
                placeholder="Describe your amazing offer..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70" htmlFor="discount">
                  Discount
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
                    percent
                  </span>
                  <input
                    className="form-input w-full rounded-xl border-none bg-white/5 backdrop-blur-sm focus:ring-2 focus:ring-[#ea2a2a] h-14 pl-12 pr-4 text-base placeholder:text-white/40"
                    id="discount"
                    placeholder="20"
                    type="number"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70" htmlFor="duration">
                  Duration
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
                    schedule
                  </span>
                  <select
                    className="form-select appearance-none w-full rounded-xl border-none bg-white/5 backdrop-blur-sm focus:ring-2 focus:ring-[#ea2a2a] h-14 pl-12 pr-10 text-base"
                    id="duration"
                  >
                    <option>1 day</option>
                    <option>3 days</option>
                    <option>1 week</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70" htmlFor="audience">
                Target Audience
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
                  group
                </span>
                <select
                  className="form-select appearance-none w-full rounded-xl border-none bg-white/5 backdrop-blur-sm focus:ring-2 focus:ring-[#ea2a2a] h-14 pl-12 pr-10 text-base"
                  id="audience"
                >
                  <option>All Customers</option>
                  <option>New Customers</option>
                  <option>Returning Customers</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </div>
        </main>
        <footer
          className="sticky bottom-0 bg-gradient-to-t from-[#181111] via-[#181111]/90 to-transparent pt-4 pb-6 px-4"
          style={{ touchAction: 'none' }}
        >
          <button className="w-full h-14 flex items-center justify-center rounded-xl bg-[#ea2a2a] text-white text-lg font-bold tracking-wide shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors duration-300">
            Create Offer
          </button>
        </footer>
      </div>
    </>
  );
}
