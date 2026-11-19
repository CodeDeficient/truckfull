import React from 'react';

export default function ExistingIngredientsList() {
  return (
    <section className="space-y-4">
      <h2 className="text-white text-2xl font-bold leading-tight tracking-[-0.015em]">
        Manage Existing Ingredients
      </h2>
      <div className="space-y-2">
        <div className="flex items-center gap-4 p-4 min-h-[72px] justify-between glassmorphism">
          <div className="flex flex-col justify-center">
            <p className="text-white text-base font-medium leading-normal line-clamp-1">
              Ground Beef
            </p>
            <p className="text-[var(--secondary-text-color)] text-sm font-normal leading-normal line-clamp-2">
              15 lbs
            </p>
          </div>
          <div className="shrink-0">
            <div className="flex items-center gap-2 text-white">
              <button className="text-lg font-bold leading-normal flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 cursor-pointer">
                -
              </button>
              <input
                className="text-base font-medium leading-normal w-10 p-0 text-center bg-transparent focus:outline-0 focus:ring-0 focus:border-none border-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                type="number"
                value="15"
              />
              <button className="text-lg font-bold leading-normal flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-color)] hover:bg-red-700 cursor-pointer">
                +
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 min-h-[72px] justify-between glassmorphism">
          <div className="flex flex-col justify-center">
            <p className="text-white text-base font-medium leading-normal line-clamp-1">
              Chicken Breast
            </p>
            <p className="text-[var(--secondary-text-color)] text-sm font-normal leading-normal line-clamp-2">
              20 kg
            </p>
          </div>
          <div className="shrink-0">
            <div className="flex items-center gap-2 text-white">
              <button className="text-lg font-bold leading-normal flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 cursor-pointer">
                -
              </button>
              <input
                className="text-base font-medium leading-normal w-10 p-0 text-center bg-transparent focus:outline-0 focus:ring-0 focus:border-none border-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                type="number"
                value="20"
              />
              <button className="text-lg font-bold leading-normal flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-color)] hover:bg-red-700 cursor-pointer">
                +
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 min-h-[72px] justify-between glassmorphism">
          <div className="flex flex-col justify-center">
            <p className="text-white text-base font-medium leading-normal line-clamp-1">Lettuce</p>
            <p className="text-[var(--secondary-text-color)] text-sm font-normal leading-normal line-clamp-2">
              10 lbs
            </p>
          </div>
          <div className="shrink-0">
            <div className="flex items-center gap-2 text-white">
              <button className="text-lg font-bold leading-normal flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 cursor-pointer">
                -
              </button>
              <input
                className="text-base font-medium leading-normal w-10 p-0 text-center bg-transparent focus:outline-0 focus:ring-0 focus:border-none border-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                type="number"
                value="10"
              />
              <button className="text-lg font-bold leading-normal flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-color)] hover:bg-red-700 cursor-pointer">
                +
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 min-h-[72px] justify-between glassmorphism">
          <div className="flex flex-col justify-center">
            <p className="text-white text-base font-medium leading-normal line-clamp-1">Tomatoes</p>
            <p className="text-[var(--secondary-text-color)] text-sm font-normal leading-normal line-clamp-2">
              5 kg
            </p>
          </div>
          <div className="shrink-0">
            <div className="flex items-center gap-2 text-white">
              <button className="text-lg font-bold leading-normal flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 cursor-pointer">
                -
              </button>
              <input
                className="text-base font-medium leading-normal w-10 p-0 text-center bg-transparent focus:outline-0 focus:ring-0 focus:border-none border-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                type="number"
                value="5"
              />
              <button className="text-lg font-bold leading-normal flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-color)] hover:bg-red-700 cursor-pointer">
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
