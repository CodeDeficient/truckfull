import React from 'react';

interface CommonPageHeadProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly onBack?: () => void;
}

export default function CommonPageHead({ title, subtitle, onBack }: CommonPageHeadProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              ← Back
            </button>
          )}
          {title && <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>}
          {subtitle && <p className="mt-2 text-gray-600 dark:text-gray-300">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
