export interface ShutdownController {
  readonly signal: AbortSignal;
  readonly requested: boolean;
  readonly reason: string | null;
  requestShutdown(reason: string): void;
  whenShutdownRequested(): Promise<string>;
}

export interface SignalSource {
  on(event: string, listener: () => void): unknown;
  removeListener?(event: string, listener: () => void): unknown;
}

export function createShutdownController(): ShutdownController {
  const controller = new AbortController();
  let reason: string | null = null;
  let resolveRequested: ((reason: string) => void) | null = null;
  const requested = new Promise<string>((resolve) => {
    resolveRequested = resolve;
  });

  return {
    signal: controller.signal,
    get requested(): boolean {
      return reason !== null;
    },
    get reason(): string | null {
      return reason;
    },
    requestShutdown(nextReason: string): void {
      if (reason !== null) return;
      reason = nextReason;
      controller.abort();
      resolveRequested?.(nextReason);
    },
    whenShutdownRequested(): Promise<string> {
      return requested;
    },
  };
}

export function installShutdownSignals(
  shutdown: ShutdownController,
  source: SignalSource,
  signals: readonly string[] = ['SIGTERM', 'SIGINT'],
): () => void {
  const listeners = signals.map((signal) => {
    const listener = (): void => {
      shutdown.requestShutdown(signal);
    };
    source.on(signal, listener);
    return { signal, listener };
  });

  return () => {
    for (const { signal, listener } of listeners) {
      source.removeListener?.(signal, listener);
    }
  };
}

export function delayWithAbort(ms: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve(true);
    }, ms);

    function onAbort(): void {
      clearTimeout(timer);
      resolve(false);
    }

    signal.addEventListener('abort', onAbort, { once: true });
  });
}
