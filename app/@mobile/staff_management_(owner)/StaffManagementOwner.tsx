import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';

export default function Staff_management_owner_() {
  return (
    <>
      <CommonPageHead title="Staff Management" />

      <div
        className="relative flex size-full min-h-screen flex-col bg-[#181111] dark justify-between group/design-root"
       
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center p-4 pb-2 justify-between sticky top-0 z-10 bg-[#181111]/80 backdrop-blur-sm">
            <button className="text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined"> arrow_back_ios_new </span>
            </button>
            <h2 className="text-white text-xl font-bold leading-tight tracking-tight flex-1 text-center pr-10">
              Staff Accounts
            </h2>
          </div>
          <div className="px-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                search
              </span>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl h-12 pl-10 pr-4 text-white placeholder:text-white/50 focus:ring-2 focus:ring-[var(--primary-color)] focus:outline-none transition-all duration-300"
                placeholder="Search staff..."
                type="text"
              />
            </div>
          </div>
          <div className="flex flex-col px-4 gap-3">
            <div className="flex items-center gap-4 p-4 rounded-xl glassmorphism">
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14"
                style={{
                  backgroundImage:
                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBsHFP5ZSZjVaiqqgSD9HrWN9KkWyQZjWuz4YtP5ypYLixSjz44vY5QhUyuHmokHKkVbnG43791CRGwjyKEdzUrHkQ7rHSt-tlJTdxHxYNniCAoWq7NLAZHcWw1a6dp8-qlRm0pjYooDZ8AzXSrf-PaYGObGMmmqKyKXbP48E13xk0tqW4IFImOioE2qw2DbtAGjE5oQ_KeseFoyy69mORopckPI8D_c9EH-A7s1ZRYXPXTLEhz8U85Bx0urxHAR1RPTZeHAS3z2Yn3")',
                }}
              />
              <div className="flex-1">
                <p className="text-white text-lg font-bold leading-tight">Ethan Carter</p>
                <p className="text-white/60 text-sm font-normal leading-normal">Manager</p>
              </div>
              <button className="text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined"> more_vert </span>
              </button>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl glassmorphism">
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14"
                style={{
                  backgroundImage:
                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA-lvCoyG096fISAxMMEeefmr8U0aIedDXgUqKfrgiAq9nBSl4dMf5RjwoGATPgmnoowdTNnGZIl5YpEXZnzZmJDjFyc_s2GM2UWeaSOjs3ub9eKF188N1nCYu2XWtENtwukLEgkjS-177TsgPQixGX8jJ6wWAcDSm7Utb16-fP-cAXFMB_E63YNP3yscgrwnZFjO-7Lu8D3DSUBWhGR8JDtqpwa9ZNA_JYN55taWP5cwNaysVzaPkb4U-vnH0wVByNPNUvTNN1RtQW")',
                }}
              />
              <div className="flex-1">
                <p className="text-white text-lg font-bold leading-tight">Sophia Bennett</p>
                <p className="text-white/60 text-sm font-normal leading-normal">Cashier</p>
              </div>
              <button className="text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined"> more_vert </span>
              </button>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl glassmorphism">
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14"
                style={{
                  backgroundImage:
                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuANjLbyBAu-rKSSwVFF96QJYFZSZCi2YMmkBItEi5l3oVHxSn0K6gGGUc9UvYci4_fdlJwTgOlWlVJ2xeuIyNeu883FSa2KsndeiS0Ufxr7Z3RLtmAt32Fn1c3-EVVESmTkAyxO0Q8eJkGDkknS2EEHpB_G3pqmCZZuCWLOMw84N9A8Jn0Ypv6eBRnCEDWV4kPwR7CkGQa-d0UElM4ib-08s6Y5zEObkuhJv2JTvX4HUtt5IayCjlQrwDIMYy3GDrAPWp00VlSeK_1f")',
                }}
              />
              <div className="flex-1">
                <p className="text-white text-lg font-bold leading-tight">Liam Harper</p>
                <p className="text-white/60 text-sm font-normal leading-normal">Chef</p>
              </div>
              <button className="text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined"> more_vert </span>
              </button>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl glassmorphism">
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14"
                style={{
                  backgroundImage:
                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD6YglIg_nqwQE_AjM-o43dK-VCRlcATmFc1pQkMR0eNoON9AMOSVKYM5VBtYpqa0FeTD1CRoUTgfoNlS4wAMILa9EqQtBhNF3f-6Se9mUO7sgPtz3gp06d1tVDZZ7bSfPIxuNUYJVxvn_257Qtajv09hblMxjey6Xz4AEVN6WOSczw5YELFnWo3GUdsrt5A8sXdQNyLGpNnROzSnMdOjVIWYvsu_yDa5AS5Y82wO5FIQ6JOTb6fBatd03g8VmIDAGjwMTE_vpS2GEr")',
                }}
              />
              <div className="flex-1">
                <p className="text-white text-lg font-bold leading-tight">Olivia Hayes</p>
                <p className="text-white/60 text-sm font-normal leading-normal">Driver</p>
              </div>
              <button className="text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined"> more_vert </span>
              </button>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 p-4 bg-gradient-to-t from-[#181111] to-transparent">
          <button className="w-full flex cursor-pointer items-center justify-center rounded-xl h-14 px-5 bg-[var(--primary-color)] text-white text-lg font-bold leading-normal tracking-wide shadow-lg shadow-[var(--primary-color)]/20 hover:bg-red-700 transition-all duration-300">
            <span className="material-symbols-outlined mr-2">add</span>
            <span>Add New Staff</span>
          </button>
        </div>
      </div>
    </>
  );
}
