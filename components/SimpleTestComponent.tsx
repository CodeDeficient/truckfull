'use client';

import { useState } from 'react';
import { logMessage } from '@/lib/logging';

export default function SimpleTestComponent() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Food Truck Finder - Search Test</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <label htmlFor="search" className="block text-sm font-medium mb-2">
            Search for Food Trucks
          </label>
          <div className="flex gap-4">
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for tacos..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="search-input"
            />
            <button
              onClick={() => logMessage('Searching for:', searchQuery)}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="search-button"
            >
              Search
            </button>
          </div>

          {searchQuery && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded">
              <p className="text-sm">
                Searching for: <strong>{searchQuery}</strong>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                (This is a test component to verify search functionality)
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
          <p className="text-sm font-semibold">Test Component Active</p>
          <p className="text-xs mt-1">
            This simple component bypasses the complex loading issues to test search functionality.
          </p>
        </div>
      </div>
    </div>
  );
}
