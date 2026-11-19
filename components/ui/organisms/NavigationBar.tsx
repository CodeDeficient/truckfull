import React from 'react';

interface NavigationBarProps {
  readonly title?: string;
}

export default function NavigationBar({ title }: NavigationBarProps) {
  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title ?? 'Navigation'}
            </h1>
          </div>
        </div>
      </div>
    </nav>
  );
}
