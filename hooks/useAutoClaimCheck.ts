'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ClaimPromptTruck } from '@/components/auth/ClaimPromptModal';
import { logError } from '@/lib/logging';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import { runWhenIdle } from '@/lib/utils/runWhenIdle';

const CLAIM_DISMISSED_KEY = 'truckfull-claim-prompt-dismissed';

interface UseAutoClaimCheckResult {
  matchingTruck: ClaimPromptTruck | null;
  isLoading: boolean;
  isModalOpen: boolean;
  claimTruck: (truckId: string) => Promise<void>;
  dismissPrompt: (truckId: string) => void;
}

/**
 * Hook to check for and handle auto-claiming of food trucks
 * based on email matching.
 */
export function useAutoClaimCheck(): UseAutoClaimCheckResult {
  const [matchingTruck, setMatchingTruck] = useState<ClaimPromptTruck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useSafeAuth();
  const lastCheckedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      lastCheckedUserId.current = null;
      return;
    }

    if (lastCheckedUserId.current === user.id) {
      setIsLoading(false);
      return;
    }

    const checkForMatchingTruck = async () => {
      try {
        const response = await fetch('/api/auth/auto-claim');
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!data.matchingTruck) {
          return;
        }

        // Check if THIS specific truck was dismissed
        const dismissedJson = localStorage.getItem(CLAIM_DISMISSED_KEY);
        if (!dismissedJson) {
          setMatchingTruck(data.matchingTruck);
          setIsModalOpen(true);
          return;
        }

        try {
          const dismissed: string[] = JSON.parse(dismissedJson);
          if (dismissed.includes(data.matchingTruck.id)) {
            return;
          }
        } catch {
          // Invalid JSON - ignore and show prompt
        }

        setMatchingTruck(data.matchingTruck);
        setIsModalOpen(true);
      } catch (error) {
        // Silently fail - this is not critical
        logError('Error checking for matching truck:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const userId = user.id;
    return runWhenIdle(() => {
      lastCheckedUserId.current = userId;
      void checkForMatchingTruck();
    });
  }, [user?.id]);

  const claimTruck = useCallback(async (truckId: string) => {
    const response = await fetch('/api/auth/auto-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'claim', truckId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error ?? 'Failed to claim truck');
    }

    const data = await response.json();

    // Success! Close modal and redirect
    setIsModalOpen(false);
    setMatchingTruck(null);

    // Redirect to owner dashboard
    globalThis.location.assign(data.trialStarted ? '/owner-dashboard?trial_started=true' : '/owner-dashboard');
  }, []);

  const dismissPrompt = useCallback((truckId: string) => {
    setIsModalOpen(false);
    setMatchingTruck(null);

    // Save dismissal to localStorage as an array so dismissing one truck
    // doesn't block auto-claim for all other trucks
    try {
      const existingJson = localStorage.getItem(CLAIM_DISMISSED_KEY);
      const dismissed: string[] = existingJson ? JSON.parse(existingJson) : [];
      if (!dismissed.includes(truckId)) {
        dismissed.push(truckId);
      }
      localStorage.setItem(CLAIM_DISMISSED_KEY, JSON.stringify(dismissed));
    } catch {
      // Fallback: just store the single ID as an array
      localStorage.setItem(CLAIM_DISMISSED_KEY, JSON.stringify([truckId]));
    }
  }, []);

  return {
    matchingTruck,
    isLoading,
    isModalOpen,
    claimTruck,
    dismissPrompt,
  };
}
