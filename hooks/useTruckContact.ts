import { useEffect, useState } from 'react';
import { logError } from '@/lib/logging';

export interface TruckDirectContact {
  readonly phone?: string;
  readonly email?: string;
}

type TruckByIdResponse = {
  readonly truck?: { readonly contact_info?: Record<string, unknown> | null };
};

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

export async function fetchTruckContact(
  truckId: string,
  signal?: AbortSignal,
): Promise<TruckDirectContact> {
  const response = await fetch(`/api/trucks/${encodeURIComponent(truckId)}`, { signal });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  const body = (await response.json()) as TruckByIdResponse;
  const contact = body.truck?.contact_info ?? {};
  return { phone: pickString(contact.phone), email: pickString(contact.email) };
}

export function useTruckContact(truckId: string | undefined): TruckDirectContact {
  const [contact, setContact] = useState<{ id: string; value: TruckDirectContact } | null>(null);

  useEffect(() => {
    if (!truckId) return;
    const controller = new AbortController();
    fetchTruckContact(truckId, controller.signal)
      .then((value) => setContact({ id: truckId, value }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) logError('useTruckContact', error);
      });
    return () => controller.abort();
  }, [truckId]);

  if (contact === null || contact.id !== truckId) return {};
  return contact.value;
}
