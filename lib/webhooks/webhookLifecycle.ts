export interface DurableQueueResult {
  readonly settledResults: PromiseSettledResult<unknown>[];
  readonly timedOut: boolean;
}

export function hasDurableReceiptFailure(results: PromiseSettledResult<unknown>[]): boolean {
  return results.some((result) => {
    if (result.status === 'rejected') return true;
    if (!result.value || typeof result.value !== 'object') return true;

    const queueResult = result.value as { success?: unknown; error?: unknown };
    return queueResult.success !== true && queueResult.error !== 'Duplicate post';
  });
}

export function hasTransientReceiptFailure(results: PromiseSettledResult<unknown>[]): boolean {
  return results.some((result) => {
    if (result.status === 'rejected') return true;
    if (!result.value || typeof result.value !== 'object') return true;

    const queueResult = result.value as { success?: unknown; error?: unknown };
    return queueResult.success !== true
      && queueResult.error !== 'Duplicate post'
      && queueResult.error !== 'Truck not found'
      && queueResult.error !== 'Missing or invalid Facebook post created_time';
  });
}

export function hasPermanentReceiptFailure(results: PromiseSettledResult<unknown>[]): boolean {
  return results.some((result) => {
    if (result.status === 'rejected' || !result.value || typeof result.value !== 'object') return false;

    const queueResult = result.value as { success?: unknown; error?: unknown };
    return queueResult.success !== true
      && (queueResult.error === 'Truck not found'
        || queueResult.error === 'Missing or invalid Facebook post created_time');
  });
}

export function hasInvalidTimestampReceiptFailure(results: PromiseSettledResult<unknown>[]): boolean {
  return results.some((result) => {
    if (result.status === 'rejected' || !result.value || typeof result.value !== 'object') return false;

    const queueResult = result.value as { success?: unknown; error?: unknown };
    return queueResult.success !== true
      && queueResult.error === 'Missing or invalid Facebook post created_time';
  });
}

export function hasUnregisteredPageReceiptFailure(results: PromiseSettledResult<unknown>[]): boolean {
  return results.some((result) => {
    if (result.status === 'rejected' || !result.value || typeof result.value !== 'object') return false;

    const queueResult = result.value as { success?: unknown; error?: unknown };
    return queueResult.success !== true && queueResult.error === 'Truck not found';
  });
}

export async function awaitDurableQueue(
  tasks: readonly Promise<unknown>[],
  timeoutMs: number,
): Promise<DurableQueueResult> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<DurableQueueResult>((resolve) => {
    timeoutHandle = setTimeout(() => resolve({ settledResults: [], timedOut: true }), timeoutMs);
  });
  const settled = Promise.allSettled(tasks).then((settledResults) => ({
    settledResults,
    timedOut: false,
  }));

  try {
    return await Promise.race([settled, timeout]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}
