export function createPosthogReadiness(): {
  markReady: () => void;
  markFailed: () => void;
  wait: () => Promise<boolean>;
} {
  let settle: ((ready: boolean) => void) | null = null;
  const promise = new Promise<boolean>((resolve) => {
    settle = resolve;
  });

  return {
    markReady: () => settle?.(true),
    markFailed: () => settle?.(false),
    wait: () => promise,
  };
}

const readiness = createPosthogReadiness();

export function markPosthogReady(): void {
  readiness.markReady();
}

export function markPosthogFailed(): void {
  readiness.markFailed();
}

export function getPosthogReady(): Promise<boolean> {
  return readiness.wait();
}
