import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';

export default function Onboarding_location_access() {
  return (
    <>
      <CommonPageHead title="Location Access" />
      <style type="text/tailwindcss">{`
      body {
        background-color: #000;
      }
      .glassmorphism {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
    `}</style>
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div className="relative flex size-full min-h-screen flex-col justify-end bg-black text-white">
        <div
          className="absolute inset-0 z-0 h-3/5 w-full bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://lh3.googleusercontent.com/aida-public/AB6AXuANoVNd3ckP2HINnb5nMGD6LNuKd9T0A3wUA3v8Hi-_c5oYTVBPbgquVPp7MK65iCf2vx83nMmh_eXb-yh2aUgt8HWyEwQ3G9GKp1ayCgbBWFzqcFLFZhi9RPL71kUICSthE30KqTcyKSHX9jjJWmf1Xy6p6oSPsQ9JteIKf9EgYl_xOoOvwYDQSzestS4Dsw1qiH9vnCXEpzryIWch02L0hI34qbloz1kK_MadKVN-eGr3wwfFGQskENrAqCfhLJhjGa_AZL5Wq9dM")',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-end p-6 pb-8 text-center">
          <div className="mb-auto" />
          <div className="glassmorphism w-full max-w-sm rounded-3xl p-8 shadow-lg">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Find food trucks near you
            </h1>
            <p className="mt-4 text-base font-light text-gray-300">
              To get the most accurate recommendations, please enable location services.
            </p>
          </div>
          <div className="mt-8 w-full max-w-sm">
            <button className="w-full rounded-xl bg-[#ea2a2a] py-4 text-base font-bold text-white transition-colors hover:bg-red-700">
              Enable Location
            </button>
            <button className="mt-4 w-full rounded-xl bg-transparent py-4 text-base font-medium text-gray-400 transition-colors hover:text-white">
              Not Now
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
