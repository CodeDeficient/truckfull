'use client';

import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';
import TruckClaimCard from '@/components/ui/molecules/TruckClaimCard';
import { MobileNavLink } from '../components/MobileNavLink';

export default function Find_claim_screen() {
  return (
    <>
      <CommonPageHead title="Find & Claim Screen" />
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
        className="relative flex size-full min-h-screen flex-col bg-[#111111] dark group/design-root"
       
      >
        <div className="flex-1">
          <header className="sticky top-0 z-10 bg-[#111111]/80 backdrop-blur-sm">
            <div className="flex items-center p-4 pb-2 justify-between">
              <div className="w-12" />
              <h1 className="text-white text-lg font-bold tracking-tight flex-1 text-center">
                TruckFull
              </h1>
              <div className="flex w-12 items-center justify-end">
                <button className="flex items-center justify-center rounded-full h-10 w-10 bg-transparent text-white hover:bg-white/10">
                  <span className="material-symbols-outlined"> settings </span>
                </button>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto pb-24">
            <div className="px-4 py-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9A9A]">
                  {' '}
                  search{' '}
                </span>
                <input
                  className="form-input w-full rounded-xl border-none bg-[#1C1C1E] text-white placeholder:text-[#9A9A9A] pl-10 pr-4 py-3 text-base font-normal"
                  placeholder="Search for your truck"
                  type="text"
                />
              </div>
            </div>
            <h2 className="text-white text-2xl font-bold tracking-tight px-4 pb-3 pt-5">
              Find and Claim Your Truck
            </h2>
            <div className="space-y-4 px-4">
              <TruckClaimCard
                imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuCfZ_NVjuemxE40ZCIwVTiSHMoTZUPDcE-B6iGnr4V2v2v2DfSWXhkCGA0UgvocneGWU_c4OsCfX1NYxWNbu3HM-kJK0SmCOVbNJMIS_YiTWBh9kB-0M4n2JvfJuwg2tHETJvxRAATd_8bvIok93SzI_LAGR4DOJRhgfmvkGfl11h3x3ptzYgO559AjqmzP7Ae0uqUvozNXeJOSM_Sc07okqyTYMNJdBduVFDkDJBX5qnycGGLstZRKhug-leJg4uHk7MGhA4UttTW2"
                name="Taco Fiesta"
                address="123 Main St, Anytown"
              />
              <TruckClaimCard
                imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuDoHe7kzb4ETxDmvAEDZZEcflTUkISKdEJ6teY2_RAja1mPImiJyRgLemELtMDcY8wuTksK4T-EvS7F5XQDl4Sb4YpuskOJAx74gn6dmMc6a-SZxEPAkwVpqYrJJacw3-syWMiVjBy7Qi03puvO6RKPFWx7pSlnKvJSjk4nQxmmRWa7VfpPPKhr5F_zASRvX6ONCBnHfMy79ABArLgtQ3e5NW_xy81vu6BROEJPLHQSZjO9ySFpwIBNdN6U7gSmHDTNSMB56p8_R3Nc"
                name="Burger Barn"
                address="456 Oak Ave, Anytown"
              />
              <TruckClaimCard
                imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuDLyvTOiwBxMip1Gok1VwVCT6oW2oz0fbbSN7-y2IEJOU5o2d8bEQE2Ir5hq1Yac3bWSjj6j1s6njDiDCCdo6quKn1odYFYKS1lJUN07OdFSlAo_Lwp7wllGIHVq68eBoFXZMlo8XpttA677YXAvGu8_2mijqAAy5QbUm9fVrlo_oeE65GguNcpoPH7PmfwWSBM6B80N_fkCUG_x10i6MT1Rn0WlsgL3Cgr6A6c7475pkorxPgcIr8czz3ppIR36n_j6BKetRzF6GhJ"
                name="Pizza Palace"
                address="789 Pine Ln, Anytown"
              />
              <TruckClaimCard
                imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuCINd4s6nowuPThRMDx6pg895s70zp1bMUcyYvTiBXKRXvSiGwhmDVgdE2itYnTgvip9-7PY7c4jE_dERNVcFb8Uu-AtnCsYCzMbSMxPN3yRqj5hFyT_o6CFIizA550UXvghAz4wFfudQpIiX7Ztwy33vrPbM9Zkw6uWlEjeny20B47trT0Aa0eUsf7VoJhUatqH_XN-t1H3IcJVLA88YwtbbNLSlegUiTWvvAqiLfnIWCA2xfdDx2V5Qp3qPBD5lxIDCNuz3jkI2yy"
                name="Sushi Stop"
                address="101 Elm Rd, Anytown"
                onClaim={() => {}}
              />
            </div>
          </main>
        </div>
        <footer
          className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#111111]/80 backdrop-blur-sm"
          style={{ touchAction: 'none' }}
        >
          <nav className="flex justify-around items-center h-20">
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-[#9A9A9A] w-1/4"
              href="/@mobile/discover_food_trucks"
            >
              <span className="material-symbols-outlined"> home </span>
              <p className="text-xs font-medium">Home</p>
            </MobileNavLink>
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-[#9A9A9A] w-1/4"
              href="/@mobile/discover_food_trucks"
            >
              <span className="material-symbols-outlined"> map </span>
              <p className="text-xs font-medium">Map</p>
            </MobileNavLink>
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-[var(--primary-color)] w-1/4"
              href="/@mobile/find_&_claim_screen"
            >
              <span className="material-symbols-outlined text-3xl"> add_circle </span>
              <p className="text-xs font-medium text-white">Claim</p>
            </MobileNavLink>
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-[#9A9A9A] w-1/4"
              href="/@mobile/user_profile"
            >
              <span className="material-symbols-outlined"> person </span>
              <p className="text-xs font-medium">Profile</p>
            </MobileNavLink>
          </nav>
          <div className="h-safe-area-bottom bg-[#111111]/80" />
        </footer>
      </div>
    </>
  );
}
