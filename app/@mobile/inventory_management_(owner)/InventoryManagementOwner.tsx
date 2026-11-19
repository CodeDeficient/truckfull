import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';
import AddIngredientForm from './_components/AddIngredientForm';
import ExistingIngredientsList from './_components/ExistingIngredientsList';
import { MobileNavLink } from '../components/MobileNavLink';

export default function Inventory_management_owner_() {
  return (
    <>
      <CommonPageHead title="Inventory Management" />
      <style type="text/tailwindcss">{`
      :root {
        --background-color: #1a1a1a;
        --card-background-color: rgba(255, 255, 255, 0.05);
        --primary-color: #ea2a2a;
        --text-color: #ffffff;
        --secondary-text-color: #a3a3a3;
      }
      .glassmorphism {
        background: var(--card-background-color);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
    `}</style>
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div
        className="relative flex size-full min-h-screen flex-col text-[var(--text-color)] dark justify-between group/design-root overflow-x-hidden"
       
      >
        <div className="flex-grow">
          <div className="sticky top-0 z-10 bg-[var(--background-color)]/80 backdrop-blur-sm">
            <div className="flex items-center p-4 pb-2 justify-between">
              <button className="text-white flex size-10 shrink-0 items-center justify-center">
                <span className="material-symbols-outlined"> arrow_back_ios_new </span>
              </button>
              <h1 className="text-white text-xl font-bold leading-tight flex-1 text-center">
                Inventory
              </h1>
              <div className="size-10" />
            </div>
          </div>
          <main className="p-4 space-y-8">
            <AddIngredientForm />
            <ExistingIngredientsList />
          </main>
        </div>
        <footer
          className="sticky bottom-0 bg-[var(--background-color)]/80 backdrop-blur-sm pb-safe"
          style={{ touchAction: 'none' }}
        >
          <div className="flex justify-around items-center border-t border-white/10 p-2">
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-[var(--primary-color)] w-16"
              href="/@mobile/discover_food_trucks"
            >
              <span className="material-symbols-outlined text-2xl"> home </span>
              <span className="text-xs font-medium">Home</span>
            </MobileNavLink>
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-[var(--secondary-text-color)] w-16"
              href="/@mobile/search_and_filter"
            >
              <span className="material-symbols-outlined text-2xl"> search </span>
              <span className="text-xs font-medium">Search</span>
            </MobileNavLink>
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-[var(--secondary-text-color)] w-16"
              href="/@mobile/inventory_management_(owner)"
            >
              <span className="material-symbols-outlined text-2xl"> add_circle </span>
              <span className="text-xs font-medium">Add</span>
            </MobileNavLink>
            <MobileNavLink
              className="flex flex-col items-center justify-center gap-1 text-[var(--secondary-text-color)] w-16"
              href="/@mobile/user_profile"
            >
              <span className="material-symbols-outlined text-2xl"> person </span>
              <span className="text-xs font-medium">Profile</span>
            </MobileNavLink>
          </div>
        </footer>
      </div>
    </>
  );
}
