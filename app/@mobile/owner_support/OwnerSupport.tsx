import React from 'react';
import { SupportContactCards, OwnerResources } from '@/components/ui/organisms/SupportComponents';
import BottomNavBar from '@/components/ui/organisms/BottomNavBar';

export default function OwnerSupport() {
  return (
    <>
      <div className="flex flex-col gap-y-6 p-4">
        <header className="flex items-center justify-between pt-4">
          <button className="text-white">
            <svg
              className="h-6 w-6"
              fill="none"
              height="24"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              viewBox="0 0 24 24"
              width="24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">Support</h1>
          <div className="w-6" />
        </header>
        <main className="flex flex-col gap-y-8">
          <section className="flex flex-col gap-y-4">
            <h2 className="text-2xl font-bold text-white">Contact Us</h2>
            <div className="grid grid-cols-1 gap-4">
              <SupportContactCards />
            </div>
          </section>
          <section className="flex flex-col gap-y-4">
            <h2 className="text-2xl font-bold text-white">Owner Resources</h2>
            <div className="flex flex-col gap-y-2">
              <OwnerResources />
            </div>
          </section>
        </main>
      </div>
      <BottomNavBar />
    </>
  );
}
