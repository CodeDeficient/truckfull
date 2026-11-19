'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook to track if we're running on the client side
 * Prevents hydration mismatches by only rendering client-specific content after mount
 *
 * @returns {boolean} true if running on client, false during SSR
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const isClient = useIsClient();
 *
 *   if (!isClient) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return <div>Client-only content: {Date.now()}</div>;
 * };
 * ```
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
