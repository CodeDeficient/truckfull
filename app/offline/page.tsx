'use client';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Internet Connection Required</h1>
        <p className="text-gray-600 mb-6">
          This application requires an internet connection to find food trucks near you. Please
          check your connection and try again.
        </p>
        <button
          onClick={() => globalThis.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
