import React from 'react';
import { MobileNavLink } from '../../components/MobileNavLink';

export default function SettingsBottomNavigation() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[#181111]/80 backdrop-blur-lg border-t border-white/10 px-4 py-3"
      style={{ touchAction: 'none' }}
    >
      <div className="flex justify-between items-center max-w-md mx-auto">
        <MobileNavLink
          className="flex flex-col items-center justify-center flex-1 py-3 px-2 text-white/50"
          href="/@mobile/discover_food_trucks"
        >
          <svg
            fill="currentColor"
            height="24"
            viewBox="0 0 256"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M224,115.55a8,8,0,0,0-7-7.55l-55.76-8.1-25-50.56a8,8,0,0,0-14.5,0l-25,50.56L40.92,108a8,8,0,0,0-1.33,13.85l40.27,39.21-9.5,55.41a8,8,0,0,0,11.72,8.52l49.86-26.19,49.86,26.19a8,8,0,0,0,11.72-8.52l-9.5-55.41,40.27-39.21A8,8,0,0,0,224,15.55Zm-69.79,36.7a8,8,0,0,0-2.44,7.22l7.53,43.81-39.39-20.7a8,8,0,0,0-7.48,0l-39.39,20.7,7.53-43.81a8,8,0,0,0-2.44-7.22L45.22,122.59,89.06,116.2a8,8,0,0,5.94-4.33L115.2,68.4l20.2,43.47a8,8,0,0,0,5.94,4.33l43.84,6.39L152.43,152.27Z" />
          </svg>
          <span className="text-xs font-medium mt-1">Discover</span>
        </MobileNavLink>
        <MobileNavLink
          className="flex flex-col items-center justify-center flex-1 py-3 px-2 text-white/50"
          href="/@mobile/food_truck_list"
        >
          <svg
            fill="currentColor"
            height="24"
            viewBox="0 0 256"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M216,64H176V56a24,24,0,0,0-24-24H104A24,24,0,0,0,80,56v8H40a8,8,0,0,0-8,8V200a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V72A8,8,0,0,0,216,64ZM104,56a8,8,0,0,1,8-8h48a8,8,0,1,8,8v8H104ZM208,200H48V72H80v8a8,8,0,0,0,16,0V72h48v8a8,8,0,0,0,16,0V72h32Z" />
          </svg>
          <span className="text-xs font-medium mt-1">Trucks</span>
        </MobileNavLink>
        <MobileNavLink
          className="flex flex-col items-center justify-center flex-1 py-3 px-2 text-white/50"
          href="/@mobile/favorites"
        >
          <svg
            fill="currentColor"
            height="24"
            viewBox="0 0 256"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M178,32c-20.65,0-38.73,8.88-50,23.89C116.73,40.88,98.65,32,78,32A62.07,62.07,0,0,0,16,94c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,20.66,240,164,240,94A62.07,62.07,0,0,178,32ZM128,206.8C109.74,196.16,32,147.69,32,94A46.06,46.06,0,0,1,78,48c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,147.61,146.24,196.15,128,206.8Z" />
          </svg>
          <span className="text-xs font-medium mt-1">Favorites</span>
        </MobileNavLink>
        <MobileNavLink
          className="flex flex-col items-center justify-center flex-1 py-3 px-2 text-[var(--primary-500)]"
          href="/@mobile/app_settings"
        >
          <svg
            fill="currentColor"
            height="24"
            viewBox="0 0 256"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z" />
          </svg>
          <span className="text-xs font-bold mt-1">Settings</span>
        </MobileNavLink>
      </div>
    </nav>
  );
}
