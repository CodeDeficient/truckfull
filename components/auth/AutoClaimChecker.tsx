'use client';

import { useAutoClaimCheck } from '@/hooks/useAutoClaimCheck';
import { ClaimPromptModal } from './ClaimPromptModal';

/**
 * Component that checks for matching unclaimed trucks and shows the claim prompt.
 * Should be placed inside AuthProvider.
 */
export function AutoClaimChecker() {
  const { matchingTruck, isModalOpen, claimTruck, dismissPrompt } = useAutoClaimCheck();

  if (!matchingTruck || !isModalOpen) {
    return null;
  }

  return (
    <ClaimPromptModal
      truck={matchingTruck}
      isOpen={isModalOpen}
      onClaim={claimTruck}
      onDismiss={dismissPrompt}
    />
  );
}
