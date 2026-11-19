import React from 'react';

export default function SettingsNavigationBar() {
  return (
    <header className="sticky top-0 z-10 glassmorphism border-b-0">
      <div className="flex items-center p-4">
        <button className="p-3 -ml-2 min-w-12 min-h-12 flex items-center justify-center">
          <svg
            fill="currentColor"
            height="24"
            viewBox="0 0 256 256"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-xl font-bold tracking-tight">Settings</h1>
        <div className="w-8" />
      </div>
    </header>
  );
}
