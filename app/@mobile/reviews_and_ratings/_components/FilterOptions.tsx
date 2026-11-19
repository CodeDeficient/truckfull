import React from 'react';

export default function FilterOptions() {
  const filterOptions = [
    { label: 'All Reviews', active: true },
    { label: '5 Stars', active: false },
    { label: '4 Stars', active: false },
    { label: '3 Stars', active: false },
    { label: '2 Stars', active: false },
    { label: '1 Star', active: false },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filterOptions.map((option) => (
        <button
          key={option.label}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            option.active
              ? 'bg-[var(--primary-color)] text-white'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
