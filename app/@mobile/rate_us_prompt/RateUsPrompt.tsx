import React from 'react';
import CommonHead from '@/components/ui/organisms/CommonHead';

export default function Rate_us_prompt() {
  return (
    <>
      <CommonHead />
      <title>Stitch Design</title>
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div
        className="relative flex size-full min-h-screen flex-col bg-[#111111] dark justify-between group/design-root overflow-x-hidden"
       
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD8Z2yKe0OmF89UBrlJWcSr7XFSVIp92EuAhlfSmIhmGx1Rh7R1gXZMB4JSbAvvrW2zhQa4JRSI_bwTFKclR6jQO6ZR5n4i16Pe4hjr7g_zST-54grbl3iM8Bg_KSR4tFGppny53fuRqbpwwIiGRlpDnDUr4VSCZo4RBRnOG778Z0eMHy-fczJ1G2rOXnBYG-QvfelqbdTFr113jYx7ogDrrzDe-1K9Jyc-srhVXYbLndqJVIi8hOpGGHaq1969GPWeJHRbpWAgauTi')",
          }}
        />
        <div className="absolute inset-0 bg-[#111111]/50 backdrop-blur-2xl" />
        <div className="relative flex flex-col justify-end h-full">
          <div className="bg-[#1C1C1E]/80 backdrop-blur-lg rounded-t-3xl p-4 pt-3 text-white">
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1.5 bg-gray-600 rounded-full" />
            </div>
            <div className="text-center space-y-4 px-4 pb-6">
              <h1 className="text-2xl font-bold">Enjoying TruckFull?</h1>
              <p className="text-gray-300">
                Your feedback helps us improve. Please take a moment to rate your experience.
              </p>
              <div className="flex justify-center gap-4 text-4xl text-gray-500 py-4">
                <span className="material-symbols-outlined cursor-pointer hover:text-[#ea2a2a] transition-colors">
                  star
                </span>
                <span className="material-symbols-outlined cursor-pointer hover:text-[#ea2a2a] transition-colors">
                  star
                </span>
                <span className="material-symbols-outlined cursor-pointer hover:text-[#ea2a2a] transition-colors">
                  star
                </span>
                <span className="material-symbols-outlined cursor-pointer hover:text-[#ea2a2a] transition-colors">
                  star
                </span>
                <span className="material-symbols-outlined cursor-pointer hover:text-[#ea2a2a] transition-colors">
                  star
                </span>
              </div>
              <div className="flex gap-4">
                <button className="flex-1 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-4 bg-[#2C2C2E] text-white text-base font-semibold">
                  <span className="truncate">Not Now</span>
                </button>
                <button className="flex-1 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-4 bg-[#ea2a2a] text-white text-base font-semibold">
                  <span className="truncate">Submit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
