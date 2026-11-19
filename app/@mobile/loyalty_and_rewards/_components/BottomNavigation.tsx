import React from 'react';

export default function BottomNavigation() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[#181111]/80 backdrop-blur-lg border-t border-white/10 px-4 py-3"
      style={{ touchAction: 'none' }}
    >
      <div className="flex justify-between items-center max-w-md mx-auto">
        <button
          type="button"
          className="flex flex-col items-center justify-center flex-1 py-3 px-2 text-[var(--primary-color)]"
        >
          <span className="material-symbols-outlined">explore</span>
          <span className="text-xs font-medium mt-1">Discover</span>
        </button>
        <button
          type="button"
          className="flex flex-col items-center justify-center flex-1 py-3 px-2 text-white/60"
        >
          <span className="material-symbols-outlined">list</span>
          <span className="text-xs font-medium mt-1">Orders</span>
        </button>
        <button
          type="button"
          className="flex flex-col items-center justify-center flex-1 py-3 px-2 text-white/60"
        >
          <span className="material-symbols-outlined">favorite</span>
          <span className="text-xs font-medium mt-1">Favorites</span>
        </button>
        <button
          type="button"
          className="flex flex-col items-center justify-center flex-1 py-3 px-2 text-white/60"
        >
          <span className="material-symbols-outlined">person</span>
          <span className="text-xs font-medium mt-1">Profile</span>
        </button>
      </div>
    </nav>
  );
}
