import React from 'react';

export const metadata = {
  title: 'Stitch Design - TruckFull',
  description:
    'Unlock Premium for 30 Days - Get access to exclusive features and take your food truck business to the next level.',
};

export default function Free_trial_offer() {
  return (
    <>
      <title>Stitch Design</title>

      <div
        className="relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-hidden"
       
      >
        <div className="absolute inset-0 z-0">
          <div className="absolute w-64 h-64 bg-red-500/20 rounded-full blur-3xl -top-10 -left-20" />
          <div className="absolute w-64 h-64 bg-red-500/20 rounded-full blur-3xl -bottom-10 -right-20" />
        </div>
        <div className="relative z-10 flex flex-col flex-grow">
          <header className="flex items-center p-4 pb-2 justify-between">
            <div className="w-12" />
            <h1 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
              TruckFull
            </h1>
            <div className="flex w-12 items-center justify-end">
              <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-white/10 text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0">
                <svg
                  fill="currentColor"
                  height="24px"
                  viewBox="0 0 256 256"
                  width="24px"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
                </svg>
              </button>
            </div>
          </header>
          <main className="flex-grow px-6 py-8 flex flex-col items-center text-center">
            <h2 className="text-white tracking-tight text-4xl font-bold leading-tight">
              Unlock Premium for 30 Days
            </h2>
            <p className="text-white/70 mt-2">
              Get access to exclusive features and take your food truck business to the next level.
            </p>
            <div className="w-full mt-10 space-y-4">
              <div className="glassmorphism flex items-center gap-4 px-4 py-3 rounded-xl">
                <div className="text-red-500 flex items-center justify-center rounded-lg bg-red-500/20 shrink-0 size-10">
                  <svg
                    fill="currentColor"
                    height="24px"
                    viewBox="0 0 256 256"
                    width="24px"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M239.2,97.29a16,16,0,0,0-13.81-11L166,81.17,142.72,25.81h0a15.95,15.95,0,0,0-29.44,0L90.07,81.17,30.61,86.32a16,16,0,0,0-9.11,28.06L66.61,153.8,53.09,212.34a16,16,0,0,0,23.84,17.34l51-31,51.11,31a16,16,0,0,0,23.84-17.34l-13.51-58.6,45.1-39.36A16,16,0,0,0,239.2,97.29Zm-15.22,5-45.1,39.36a16,16,0,0,0-5.08,15.71L187.35,216v0l-51.07-31a15.9,15.9,0,0,0-16.54,0l-51,31h0L82.2,157.4a16,16,0,0,0-5.08-15.71L32,102.35a.37.37,0,0,1,0-.09l59.44-5.14a16,16,0,0,0,13.35-9.75L128,32.08l23.2,55.29a16,16,0,0,0,13.35,9.75L224,102.26S224,102.32,224,102.33Z" />
                  </svg>
                </div>
                <p className="text-white text-base font-medium leading-normal flex-1 truncate text-left">
                  Event Recommendations
                </p>
              </div>
              <div className="glassmorphism flex items-center gap-4 px-4 py-3 rounded-xl">
                <div className="text-red-500 flex items-center justify-center rounded-lg bg-red-500/20 shrink-0 size-10">
                  <svg
                    fill="currentColor"
                    height="24px"
                    viewBox="0 0 256 256"
                    width="24px"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0v94.37L90.73,98a8,8,0,0,1,10.07-.38l58.81,44.11L218.73,90a8,8,0,1,1,10.54,12l-64,56a8,8,0,0,1-10.07.38L96.39,114.29,40,163.63V200H224A8,8,0,0,1,232,208Z" />
                  </svg>
                </div>
                <p className="text-white text-base font-medium leading-normal flex-1 truncate text-left">
                  Deep Analytics
                </p>
              </div>
              <div className="glassmorphism flex items-center gap-4 px-4 py-3 rounded-xl">
                <div className="text-red-500 flex items-center justify-center rounded-lg bg-red-500/20 shrink-0 size-10">
                  <svg
                    fill="currentColor"
                    height="24px"
                    viewBox="0 0 256 256"
                    width="24px"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M205.66,61.64l-144,144a8,8,0,0,1-11.32-11.32l144-144a8,8,0,0,1,11.32,11.31ZM50.54,101.44a36,36,0,0,1,50.92-50.91h0a36,36,0,0,1-50.92,50.91ZM56,76A20,20,0,1,0,90.14,61.84h0A20,20,0,0,0,56,76ZM216,180a36,36,0,1,1-10.54-25.46h0A35.76,35.76,0,0,1,216,180Zm-16,0a20,20,0,1,0-5.86,14.14A19.87,19.87,0,0,0,200,180Z" />
                  </svg>
                </div>
                <p className="text-white text-base font-medium leading-normal flex-1 truncate text-left">
                  Exclusive Discounts
                </p>
              </div>
              <div className="glassmorphism flex items-center gap-4 px-4 py-3 rounded-xl">
                <div className="text-red-500 flex items-center justify-center rounded-lg bg-red-500/20 shrink-0 size-10">
                  <svg
                    fill="currentColor"
                    height="24px"
                    viewBox="0 0 256 256"
                    width="24px"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M201.89,54.66A103.43,103.43,0,0,0,128.79,24H128A104,104,0,0,0,24,128v56a24,24,0,0,0,24,24H64a24,24,0,0,0,24-24V144a24,24,0,0,0-24-24H40.36A88.12,88.12,0,0,1,190.54,65.93,87.39,87.39,0,0,1,215.65,120H192a24,24,0,0,0-24,24v40a24,24,0,0,0,24,24h24a24,24,0,0,1-24,24H136a8,8,0,0,0,0,16h56a40,40,0,0,0,40-40V128A103.41,103.41,0,0,0,201.89,54.66ZM64,136a8,8,0,0,1,8,8v40a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V136Zm128,56a8,8,0,0,1-8-8V144a8,8,0,0,1,8-8h24v56Z" />
                  </svg>
                </div>
                <p className="text-white text-base font-medium leading-normal flex-1 truncate text-left">
                  Priority Support
                </p>
              </div>
            </div>
          </main>
          <footer className="p-4 pb-8">
            <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 flex-1 bg-[var(--primary-500)] text-white text-lg font-bold leading-normal tracking-[0.015em] w-full shadow-[0_10px_20px_rgba(234,42,42,0.25)]">
              <span className="truncate">Start My Free Trial</span>
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}
