import React from 'react';

export default function EarningPointsSection() {
  return (
    <div className="flex flex-col px-4">
      <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em] px-0 pb-3 pt-8">
        How to Earn Points
      </h2>
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-xl bg-white/5 p-4 backdrop-blur-xl">
          <div className="text-white flex items-center justify-center rounded-xl bg-white/10 shrink-0 size-12">
            <span className="material-symbols-outlined text-[var(--primary-color)]">
              attach_money
            </span>
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-white text-base font-medium leading-normal line-clamp-1">
              Spend Money
            </p>
            <p className="text-white/60 text-sm font-normal leading-normal line-clamp-2">
              Earn 1 point for every $1 spent
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-white/5 p-4 backdrop-blur-xl">
          <div className="text-white flex items-center justify-center rounded-xl bg-white/10 shrink-0 size-12">
            <span className="material-symbols-outlined text-[var(--primary-color)]">group</span>
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-white text-base font-medium leading-normal line-clamp-1">
              Refer a Friend
            </p>
            <p className="text-white/60 text-sm font-normal leading-normal line-clamp-2">
              Earn 50 points for each referral
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
