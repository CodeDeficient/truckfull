import React from 'react';
import { MobileNavLink } from '../components/MobileNavLink';

export default function Submit_new_food_truck() {
  return (
    <>
      <title>TruckFull - Submit New Truck</title>
      <link href="data:image/x-icon;base64," rel="icon" type="image/x-icon" />
      <meta charSet="utf-8" />
      <style type="text/tailwindcss">{`
      :root {
        --primary-color: #ea2a2a;
      }
      .glassmorphism {
        background: rgba(255, 255, 255, 0.05);
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
        className="relative flex size-full min-h-screen flex-col text-white dark justify-between group/design-root overflow-x-hidden"
       
      >
        <div className="flex-grow">
          <header className="sticky top-0 z-10 glassmorphism border-b border-white/10">
            <div className="flex items-center p-4">
              <button className="p-2 -ml-2">
                <svg
                  fill="currentColor"
                  height="28px"
                  viewBox="0 0 256 256"
                  width="28px"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z" />
                </svg>
              </button>
              <h1 className="text-xl font-bold leading-tight tracking-tight flex-1 text-center pr-8">
                Submit a Truck
              </h1>
            </div>
          </header>
          <main className="p-4 space-y-6">
            <div className="space-y-4">
              <div>
                <label
                  className="text-sm font-medium text-white/80 mb-2 block"
                  htmlFor="truck-name"
                >
                  Truck Name
                </label>
                <input
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] border border-white/20 glassmorphism h-14 placeholder:text-white/40 p-4 text-base font-normal leading-normal"
                  id="truck-name"
                  placeholder="e.g. The Blazing Burrito"
                  value=""
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium text-white/80 mb-2 block"
                  htmlFor="cuisine-type"
                >
                  Cuisine Type
                </label>
                <select
                  className="form-select flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] border border-white/20 glassmorphism h-14 bg-[image:--select-button-svg] p-4 text-base font-normal leading-normal appearance-none"
                  id="cuisine-type"
                >
                  <option disabled={true} selected={true} value="">
                    Select cuisine type
                  </option>
                  <option value="mexican">Mexican</option>
                  <option value="italian">Italian</option>
                  <option value="american">American</option>
                  <option value="asian">Asian</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label
                  className="text-sm font-medium text-white/80 mb-2 block"
                  htmlFor="contact-info"
                >
                  Contact Information
                </label>
                <input
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] border border-white/20 glassmorphism h-14 placeholder:text-white/40 p-4 text-base font-normal leading-normal"
                  id="contact-info"
                  placeholder="Phone number or email"
                  value=""
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium text-white/80 mb-2 block"
                  htmlFor="description"
                >
                  Description
                </label>
                <textarea
                  className="form-textarea flex w-full min-w-0 flex-1 resize-y overflow-hidden rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] border border-white/20 glassmorphism min-h-36 placeholder:text-white/40 p-4 text-base font-normal leading-normal"
                  id="description"
                  placeholder="Tell us about your truck, its specialties, and what makes it unique!"
                />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold leading-tight tracking-tight mb-2">Upload Photos</h3>
              <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-white/30 px-6 py-10 glassmorphism">
                <span className="material-symbols-outlined text-4xl text-[var(--primary-color)]">
                  {' '}
                  add_a_photo{' '}
                </span>
                <div className="flex flex-col items-center gap-1">
                  <p className="font-semibold text-center">Add Photos</p>
                  <p className="text-sm text-white/60 text-center">
                    Showcase your truck&apos;s offerings and setup.
                  </p>
                </div>
                <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-white/10 text-white text-sm font-bold leading-normal tracking-wide hover:bg-white/20 transition-colors">
                  <span className="truncate">Upload</span>
                </button>
              </div>
            </div>
            <div className="pt-4">
              <button className="flex min-w-[84px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-5 bg-[var(--primary-color)] text-white text-lg font-bold leading-normal tracking-wide shadow-lg shadow-[var(--primary-color)]/20 hover:bg-red-500 transition-all">
                <span className="truncate">Submit Listing</span>
              </button>
            </div>
          </main>
        </div>
        <footer className="sticky bottom-0 z-10" style={{ touchAction: 'none' }}>
          <div className="glassmorphism border-t border-white/10 px-4 pb-3 pt-2">
            <div className="flex justify-around">
              <MobileNavLink
                className="flex flex-1 flex-col items-center justify-end gap-1 text-white/60"
                href="/@mobile/discover_food_trucks"
              >
                <span className="material-symbols-outlined text-2xl"> map </span>
                <p className="text-xs font-medium leading-normal tracking-wide">Map</p>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-1 flex-col items-center justify-end gap-1 text-white/60"
                href="/@mobile/food_truck_list"
              >
                <span className="material-symbols-outlined text-2xl"> list </span>
                <p className="text-xs font-medium leading-normal tracking-wide">List</p>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-1 flex-col items-center justify-end gap-1 text-white/60"
                href="/@mobile/favorites"
              >
                <span className="material-symbols-outlined text-2xl"> favorite </span>
                <p className="text-xs font-medium leading-normal tracking-wide">Favorites</p>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-1 flex-col items-center justify-end gap-1 text-white"
                href="/@mobile/submit_new_food_truck"
              >
                <div className="relative">
                  <span className="material-symbols-outlined text-2xl"> add_circle </span>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--primary-color)] rounded-full border-2 border-[#101010]" />
                </div>
                <p className="text-xs font-bold leading-normal tracking-wide text-[var(--primary-color)]">
                  Submit
                </p>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-1 flex-col items-center justify-end gap-1 text-white/60"
                href="/@mobile/user_profile"
              >
                <span className="material-symbols-outlined text-2xl"> account_circle </span>
                <p className="text-xs font-medium leading-normal tracking-wide">Profile</p>
              </MobileNavLink>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
