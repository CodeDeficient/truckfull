'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { X, Truck, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export interface ClaimPromptTruck {
  id: string;
  name: string;
  photo_url?: string | null;
  cuisine_type?: string[] | null;
}

interface ClaimPromptModalProps {
  truck: ClaimPromptTruck;
  isOpen: boolean;
  onClaim: (truckId: string) => Promise<void>;
  onDismiss: (truckId: string) => void;
}

/**
 * Modal that prompts users to claim their truck when their email matches.
 * Shows on first login after email verification.
 */
export function ClaimPromptModal({ truck, isOpen, onClaim, onDismiss }: ClaimPromptModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClaim = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onClaim(truck.id);
    } catch {
      setError('Failed to claim truck. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [onClaim, truck.id]);

  const handleDismiss = useCallback(() => {
    onDismiss(truck.id);
  }, [onDismiss, truck.id]);

  if (!isOpen) return null;

  const cuisineText = truck.cuisine_type?.slice(0, 3).join(', ') ?? 'Food Truck';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative bg-black rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-800">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10 disabled:opacity-50"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="pt-8 pb-4 px-6 text-center">
          {/* Truck icon/photo */}
          <div className="flex justify-center mb-4">
            {truck.photo_url ? (
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-green-500/50 shadow-lg shadow-green-500/20">
                <Image src={truck.photo_url} alt={truck.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 border-4 border-green-500/50 flex items-center justify-center">
                <Truck className="w-12 h-12 text-green-400" />
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Is this your truck?</h1>

          <div className="bg-white/10 rounded-xl p-4 mb-4">
            <h2 className="text-xl font-semibold text-white mb-1">{truck.name}</h2>
            <p className="text-gray-400 text-sm">{cuisineText}</p>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed">
            We found a food truck listing that matches your email address. If this is your truck,
            you can claim it to manage your profile, update your menu, and connect with customers!
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={handleClaim}
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Yes, this is my truck!
              </>
            )}
          </button>

          <button
            onClick={handleDismiss}
            disabled={isLoading}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-medium rounded-xl transition-all border border-gray-700 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <XCircle className="w-5 h-5" />
            No, continue as customer
          </button>

          <p className="text-center text-gray-500 text-xs mt-2">
            You can always claim your truck later from your profile settings.
          </p>
        </div>
      </div>
    </div>
  );
}
