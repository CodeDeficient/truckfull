import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';

export default function Force_update_required() {
  return (
    <>
      <CommonPageHead title="Force Update Required" />
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div
        className="relative flex size-full min-h-screen flex-col bg-cover bg-center text-white"
        style={{
          backgroundImage:
            'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDIbNKQJ9kMT0LUsCoBVLmAVOoRHloHpaOWF_vpddJhBabQxOJtuX2ba1E5R4Z6lKmgIWbSMJxuPVULaNgrNLi-uGHkW9g3UBFbqOA1RxM0QcmbQl-WKJ3JFnPT4BFsCx5hWxEl6i89M_dhSCBKZoOWHV4wr9bLZR1vEGjMPWJkK1LGqavnUeaKv7Pbn36ToRrjNlYOcO32p6DJwLOoIV43SdCTQ9xZkBorm7UidI-oEWEL61iO1FDO4xGiYo6ulxGYAFzXGABnU2J7")',
        }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" />
        <div className="relative z-10 flex flex-col justify-between flex-1 p-6">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-3xl">
                local_fire_department
              </span>
              <h1 className="text-xl font-bold">TruckFull</h1>
            </div>
          </header>
          <main className="flex flex-col items-center justify-center text-center flex-1 -mt-16">
            <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500 mb-8">
              <span className="material-symbols-outlined text-red-500 text-5xl">system_update</span>
            </div>
            <h2 className="text-4xl font-bold tracking-tight mb-4">Update Required</h2>
            <p className="text-lg text-white/80 max-w-sm">
              We&apos;ve made some important improvements. To continue enjoying TruckFull, please
              update to the latest version.
            </p>
          </main>
          <footer className="flex flex-col gap-4">
            <button className="w-full h-14 bg-red-500 rounded-xl text-lg font-bold shadow-lg shadow-red-500/20 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">download</span>
              Update Now
            </button>
            <button className="w-full h-14 text-white/60 rounded-xl text-lg font-medium">
              Not Now
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}
