import { describe, expect, it } from '@jest/globals';
import { registerPostProcessing } from '@/lib/webhooks/queueProcessor';
import {
  awaitDurableQueue,
  hasDurableReceiptFailure,
  hasInvalidTimestampReceiptFailure,
  hasPermanentReceiptFailure,
  hasTransientReceiptFailure,
  hasUnregisteredPageReceiptFailure,
} from '@/lib/webhooks/webhookLifecycle';

describe('registerPostProcessing', () => {
  it('waits for durable receipt while leaving downstream processing pending', async () => {
    let durableReceiptComplete = false;
    let downstreamRegistered = false;
    let downstreamComplete = false;
    let resolveDownstream: (() => void) | undefined;
    const downstream = new Promise<void>((resolve) => {
      resolveDownstream = resolve;
    });

    const queueTask = Promise.resolve().then(() => {
      durableReceiptComplete = true;
      registerPostProcessing(
        (promise) => {
          downstreamRegistered = true;
          void promise.then(() => {
            downstreamComplete = true;
          });
        },
        downstream,
        () => undefined,
        () => undefined,
      );
      return { success: true };
    });

    const result = await awaitDurableQueue([queueTask], 1000);

    expect(result.timedOut).toBe(false);
    expect(result.settledResults).toHaveLength(1);
    expect(durableReceiptComplete).toBe(true);
    expect(downstreamRegistered).toBe(true);
    expect(downstreamComplete).toBe(false);
    resolveDownstream?.();
  });

  it('reports a durable receipt timeout without claiming it was persisted', async () => {
    const result = await awaitDurableQueue([new Promise<void>(() => undefined)], 5);

    expect(result).toEqual({ settledResults: [], timedOut: true });
  });

  it('treats failed receipts as non-acknowledgeable but accepts duplicates', () => {
    expect(hasDurableReceiptFailure([{ status: 'fulfilled', value: { success: false, error: 'Insert failed' } }])).toBe(true);
    expect(hasDurableReceiptFailure([{ status: 'fulfilled', value: { success: false, error: 'Duplicate post' } }])).toBe(false);
    expect(hasDurableReceiptFailure([{ status: 'fulfilled', value: { success: true } }])).toBe(false);
    expect(hasTransientReceiptFailure([{ status: 'fulfilled', value: { success: false, error: 'Truck not found' } }])).toBe(false);
    expect(hasPermanentReceiptFailure([{ status: 'fulfilled', value: { success: false, error: 'Truck not found' } }])).toBe(true);
    expect(hasTransientReceiptFailure([{ status: 'fulfilled', value: { success: false, error: 'Truck lookup failed' } }])).toBe(true);
    expect(hasPermanentReceiptFailure([{ status: 'fulfilled', value: { success: false, error: 'Truck lookup failed' } }])).toBe(false);
    expect(hasTransientReceiptFailure([{ status: 'fulfilled', value: { success: false, error: 'Missing or invalid Facebook post created_time' } }])).toBe(false);
    expect(hasPermanentReceiptFailure([{ status: 'fulfilled', value: { success: false, error: 'Missing or invalid Facebook post created_time' } }])).toBe(true);
  });

  it('distinguishes invalid timestamps from other permanent failures', () => {
    const invalidTimestamp = [{
      status: 'fulfilled' as const,
      value: { success: false, error: 'Missing or invalid Facebook post created_time' },
    }];
    const unregisteredPage = [{
      status: 'fulfilled' as const,
      value: { success: false, error: 'Truck not found' },
    }];

    expect(hasInvalidTimestampReceiptFailure(invalidTimestamp)).toBe(true);
    expect(hasInvalidTimestampReceiptFailure(unregisteredPage)).toBe(false);
    expect(hasUnregisteredPageReceiptFailure(unregisteredPage)).toBe(true);
    expect(hasUnregisteredPageReceiptFailure(invalidTimestamp)).toBe(false);
    expect(hasInvalidTimestampReceiptFailure([...invalidTimestamp, ...unregisteredPage])).toBe(true);
    expect(hasUnregisteredPageReceiptFailure([...invalidTimestamp, ...unregisteredPage])).toBe(true);
  });

  it('registers the processing promise with the background lifecycle', async () => {
    let registeredPromise: Promise<unknown> | undefined;
    let completed = false;

    registerPostProcessing(
      (promise) => {
        registeredPromise = promise;
      },
      Promise.resolve({ success: true, status: 'pending_confirmation' }),
      () => {
        completed = true;
      },
      () => undefined,
    );

    expect(registeredPromise).toBeInstanceOf(Promise);
    await registeredPromise;
    expect(completed).toBe(true);
  });

  it('keeps rejected processing promises inside the registered lifecycle', async () => {
    let registeredPromise: Promise<unknown> | undefined;
    let failure: unknown;

    registerPostProcessing(
      (promise) => {
        registeredPromise = promise;
      },
      Promise.reject(new Error('processing failed')),
      () => undefined,
      (error) => {
        failure = error;
      },
    );

    await registeredPromise;
    expect(failure).toBeInstanceOf(Error);
  });
});
