import React from 'react';
import { MobileNavLink } from '../../components/MobileNavLink';

export default function Footer() {
  return (
    <footer className="sticky bottom-0 z-10" style={{ touchAction: 'none' }}>
      <div className="bg-black/50 backdrop-blur-lg border-t border-white/10 px-4 pt-3 pb-5">
        <div className="flex justify-around items-end">
          <MobileNavLink
            className="flex flex-col items-center justify-end gap-1 text-white/60 hover:text-white transition-colors"
            href="/@mobile/discover_food_trucks"
          >
            <span className="material-symbols-outlined">explore</span>
            <p className="text-xs font-medium">Map</p>
          </MobileNavLink>
          <MobileNavLink
            className="flex flex-col items-center justify-end gap-1 text-white"
            href="/@mobile/events_and_specials"
          >
            <span className="material-symbols-outlined">event</span>
            <p className="text-xs font-bold">Events</p>
          </MobileNavLink>
          <MobileNavLink
            className="flex flex-col items-center justify-end gap-1 text-white/60 hover:text-white transition-colors"
            href="/@mobile/favorites"
          >
            <span className="material-symbols-outlined">favorite</span>
            <p className="text-xs font-medium">Favorites</p>
          </MobileNavLink>
          <MobileNavLink
            className="flex flex-col items-center justify-end gap-1 text-white/60 hover:text-white transition-colors"
            href="/@mobile/user_profile"
          >
            <span className="material-symbols-outlined">person</span>
            <p className="text-xs font-medium">Profile</p>
          </MobileNavLink>
        </div>
      </div>
    </footer>
  );
}
