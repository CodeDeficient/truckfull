import { logError } from '@/lib/logging';
import { SAVANNAH_CONFIG } from '@/lib/events/cities';
import type {
  EprovalCalendarSettings,
  EprovalCalendarEntry,
  EprovalRpcRequest,
  EprovalRpcResponse,
} from '@/lib/events/types';

import { randomUUID } from 'node:crypto';

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RPC_ATTEMPTS = 3;
const RPC_RETRY_INITIAL_DELAY_MS = 1000;
const RPC_RETRY_BACKOFF_MULTIPLIER = 2;
const DEFAULT_STATUSES = ['Submitted', 'More Info Needed', 'Under Review', 'Approved', 'Closeout'];

function generateId(): string {
  return randomUUID();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < MAX_RPC_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: controller.signal });
    } catch (fetchError) {
      clearTimeout(timeout);
      if (attempt < MAX_RPC_ATTEMPTS - 1) {
        await sleep(RPC_RETRY_INITIAL_DELAY_MS * Math.pow(RPC_RETRY_BACKOFF_MULTIPLIER, attempt));
        continue;
      }
      throw fetchError;
    }

    clearTimeout(timeout);

    if (response.ok) return response;

    const isRetryable = response.status === 429 || response.status >= 500;
    if (!isRetryable) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (attempt < MAX_RPC_ATTEMPTS - 1) {
      await sleep(RPC_RETRY_INITIAL_DELAY_MS * Math.pow(RPC_RETRY_BACKOFF_MULTIPLIER, attempt));
      continue;
    }

    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  throw new Error(`Unreachable: retry loop exhausted for ${url}`);
}

async function rpcCall<T>(
  clientUri: string,
  method: string,
  params: Record<string, unknown>,
): Promise<T> {
  const url = `${clientUri}func/api/v2/public/rpc?`;
  const body: EprovalRpcRequest = { id: generateId(), method, params };

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'content-type': 'text/plain;charset=UTF-8',
      accept: 'application/json;odata=nometadata',
      referer: 'https://www.savannahga.gov/',
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as EprovalRpcResponse<T>;

  if (data.error) {
    throw new Error(`RPC error ${data.error.code}: ${data.error.message}`);
  }

  return data.result;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedSettings: { key: string; data: EprovalCalendarSettings; fetchedAt: number } | null = null;

export async function fetchCalendarSettings(
  calendarKey: string,
  clientUri?: string,
): Promise<EprovalCalendarSettings> {
  if (
    cachedSettings &&
    cachedSettings.key === calendarKey &&
    Date.now() - cachedSettings.fetchedAt < SETTINGS_CACHE_TTL_MS
  ) {
    return cachedSettings.data;
  }
  const uri = clientUri ?? SAVANNAH_CONFIG.clientUri;
  if (!uri) {
    throw new Error('clientUri is required for eProval calendar settings');
  }
  const settings = await rpcCall<EprovalCalendarSettings>(
    uri,
    'Calendar_GetPublicCalendarSettings',
    { calendarKey },
  );
  cachedSettings = { key: calendarKey, data: settings, fetchedAt: Date.now() };
  return settings;
}

export async function fetchCalendarEntries(
  clientUri: string,
  partitionGuids: string[],
  statuses: string[] = DEFAULT_STATUSES,
): Promise<EprovalCalendarEntry[]> {
  const result = await rpcCall<EprovalCalendarEntry[]>(
    clientUri,
    'Calendar_GetPublicCalendarEntries',
    {
      applicationStatusNames: statuses,
      calendarPartitionGuids: partitionGuids,
    },
  );

  if (!Array.isArray(result)) {
    throw new TypeError('eProval calendar entries response was not an array');
  }

  return result;
}

export async function fetchAllSavannahEvents(
  config: typeof SAVANNAH_CONFIG = SAVANNAH_CONFIG,
): Promise<EprovalCalendarEntry[]> {
  try {
    const calendarKey = config.calendarKey ?? SAVANNAH_CONFIG.calendarKey;
    const clientUri = config.clientUri ?? SAVANNAH_CONFIG.clientUri;
    if (!calendarKey || !clientUri) {
      throw new Error('calendarKey and clientUri are required for eProval ingestion');
    }
    const settings = await fetchCalendarSettings(calendarKey, clientUri);
    const partitions = config.partitionGuids ?? settings.appsubtypes ?? [];
    const chunks = chunkArray(partitions, 2);

    const results = await Promise.all(
      chunks.map((chunk) => fetchCalendarEntries(clientUri, chunk)),
    );

    return results.flat();
  } catch (error) {
    logError('Failed to fetch Savannah events from eProval', error);
    throw error;
  }
}
