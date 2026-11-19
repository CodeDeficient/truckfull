'use client';

import { useState, useEffect } from 'react';
import { Truck, RefreshCw, Clock } from 'lucide-react';

export default function MaintenancePage() {
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const endTime = process.env.NEXT_PUBLIC_MAINTENANCE_END;

    if (endTime) {
      const updateCountdown = () => {
        const now = Date.now();
        const end = new Date(endTime).getTime();
        const distance = end - now;

        if (distance < 0) {
          setTimeRemaining('Shortly');
        } else {
          const hours = Math.floor(distance / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

          if (hours > 0) {
            setTimeRemaining(`${hours}h ${minutes}m`);
          } else {
            setTimeRemaining(`${minutes} minute${minutes === 1 ? '' : 's'}`);
          }
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 60_000);
      return () => clearInterval(interval);
    }
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-300 rounded-full mb-4" />
          <div className="w-48 h-4 bg-gray-300 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="text-center max-w-md">
        <div className="mb-8 inline-flex items-center justify-center w-24 h-24 rounded-full bg-orange-100">
          <Truck className="w-12 h-12 text-orange-600" />
        </div>

        <h1
          className="text-4xl font-bold text-gray-900 mb-3"
          style={{ fontFamily: 'var(--font-lobster)' }}
        >
          TruckFull is in the shop!
        </h1>

        <p className="text-xl text-gray-600 mb-2">We&apos;ll be back up and running shortly.</p>

        <p className="text-lg text-gray-500 mb-8">
          Thanks for your patience — it&apos;s worth the wait!
        </p>

        {timeRemaining && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-full text-orange-700 mb-8">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Expected back in: {timeRemaining}</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => globalThis.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Page
          </button>

          <p className="text-sm text-gray-400">
            Need help? Contact us at{' '}
            <a href="mailto:support@truckfull.com" className="text-orange-600 hover:underline">
              support@truckfull.com
            </a>
          </p>
        </div>
      </div>

      <footer className="absolute bottom-4 text-center">
        <p className="text-xs text-gray-400">TruckFull — Finding food trucks near you</p>
      </footer>
    </div>
  );
}
