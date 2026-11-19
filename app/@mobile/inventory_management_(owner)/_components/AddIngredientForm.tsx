import React from 'react';

export default function AddIngredientForm() {
  return (
    <section className="space-y-4">
      <h2 className="text-white text-2xl font-bold leading-tight tracking-[-0.015em]">
        Add New Ingredient
      </h2>
      <div className="space-y-4 p-4 glassmorphism">
        <input
          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-[var(--primary-color)] border border-white/10 bg-white/5 h-14 placeholder:text-[var(--secondary-text-color)] p-4 text-base font-normal leading-normal"
          placeholder="Ingredient Name"
          value=""
        />
        <input
          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-[var(--primary-color)] border border-white/10 bg-white/5 h-14 placeholder:text-[var(--secondary-text-color)] p-4 text-base font-normal leading-normal"
          placeholder="Initial Stock Level"
          value=""
        />
        <input
          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-[var(--primary-color)] border border-white/10 bg-white/5 h-14 placeholder:text-[var(--secondary-text-color)] p-4 text-base font-normal leading-normal"
          placeholder="Unit of Measurement (e.g., lbs, kg)"
          value=""
        />
        <button className="flex min-w-[84px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-[var(--primary-color)] text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-red-700 transition-colors">
          <span className="truncate">Add Ingredient</span>
        </button>
      </div>
    </section>
  );
}
