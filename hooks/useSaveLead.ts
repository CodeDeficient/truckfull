'use client';

import { useState, useCallback, useEffect } from 'react';
import { logError } from '@/lib/logging';

interface UseSaveLeadProps {
  eventId: string;
  truckId: string | undefined;
}

interface UseSaveLeadReturn {
  saving: boolean;
  saved: boolean;
  error: string | null;
  saveLead: () => Promise<void>;
}

export async function checkSavedStatus(
  eventId: string,
  truckId: string | undefined,
): Promise<boolean> {
  if (!truckId) return false;

  try {
    const response = await fetch(
      `/api/events/saved-leads?event_id=${eventId}&truck_id=${truckId}`,
    );
    if (!response.ok) return false;
    const data = await response.json();
    return Array.isArray(data.leads) && data.leads.length > 0;
  } catch {
    return false;
  }
}

export function useSaveLead({ eventId, truckId }: UseSaveLeadProps): UseSaveLeadReturn {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkSavedStatus(eventId, truckId).then((isSaved) => {
      if (!cancelled) setSaved(isSaved);
    });
    return () => {
      cancelled = true;
    };
  }, [eventId, truckId]);

  const saveLead = useCallback(async () => {
    if (!truckId) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/events/saved-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          truck_id: truckId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save lead');
      }

      setSaved(true);
    } catch (error__) {
      const message = error__ instanceof Error ? error__.message : 'Failed to save lead';
      setError(message);
      logError('useSaveLead error:', error__);
    } finally {
      setSaving(false);
    }
  }, [eventId, truckId]);

  return { saving, saved, error, saveLead };
}
