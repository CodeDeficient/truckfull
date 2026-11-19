'use client';

import React from 'react';

export function FieldGuideLegend() {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-1.5 w-7 flex flex-col items-center gap-1 pointer-events-none">
      <div className="text-[8px] font-bold text-gray-700 text-center leading-tight">Vol</div>
      <div className="text-[7px] text-red-600 font-medium whitespace-nowrap">50k</div>
      <div className="h-16 w-1.5 bg-gradient-to-t from-blue-500 via-green-500 to-red-500 rounded-full" />
      <div className="text-[7px] text-blue-600 font-medium">0</div>
    </div>
  );
}
