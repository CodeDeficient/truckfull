import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { render, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EventVortexHero } from '@/components/events/EventVortexHero';

/**
 * Vortex matchMedia compatibility guard, tested mock-free in jsdom.
 *
 * jsdom does not implement window.matchMedia at all, so the "matchMedia is
 * unsupported" case is exercised by the real environment, not a mock. The
 * only stubs here are browser APIs missing from jsdom (canvas 2d context,
 * IntersectionObserver, requestAnimationFrame) — never internal modules.
 *
 * Page-level E2E cannot isolate this guard: next-themes (root ThemeProvider)
 * also calls window.matchMedia unguarded and crashes the React tree first.
 * That is a separate, pre-existing issue outside this change's scope.
 */

let rafCount = 0;

function installBrowserStubs(): void {
  // Counting rAF so tests can prove whether an animation loop is running.
  // Must be called AFTER jest.useFakeTimers() — the fake-timers install
  // replaces globalThis.requestAnimationFrame with its own implementation.
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback): number => {
    const id = setTimeout(() => {
      rafCount += 1;
      callback(1_000);
    }, 16) as unknown as number;
    return id;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number): void => {
    clearTimeout(id);
  }) as typeof cancelAnimationFrame;
}

function installCanvasAndObserverStubs(): void {
  // Minimal 2d context: enough for ParticleField construction and one frame
  // (save/stroke/restore/clear/drawImage). jsdom's getContext is a no-op
  // that logs "not implemented", so Vortex's own try/catch would otherwise
  // swallow everything and never reach the matchMedia guard.
  const ctxStub = {
    save() {},
    restore() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    clearRect() {},
    drawImage() {},
    setTransform() {},
    lineCap: 'round',
    lineWidth: 1,
    globalAlpha: 1,
    strokeStyle: '',
    filter: '',
    globalCompositeOperation: 'source-over',
  } as unknown as CanvasRenderingContext2D;
  HTMLCanvasElement.prototype.getContext = function (): CanvasRenderingContext2D | null {
    return ctxStub;
  } as typeof HTMLCanvasElement.prototype.getContext;

  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = class {
    // jsdom lacks IntersectionObserver; the real browser reports an
    // intersecting entry synchronously-ish on observe() for in-view heroes.
    observe(el: Element): void {
      const instance = this as unknown as {
        cb: (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;
      };
      instance.cb([{ isIntersecting: true, target: el }]);
    }
    unobserve(): void {}
    disconnect(): void {}
    constructor(cb: (entries: Array<{ isIntersecting: boolean; target: Element }>) => void) {
      (this as unknown as { cb: unknown }).cb = cb;
    }
  };
}

beforeEach(() => {
  // jsdom natively has no matchMedia; tests above may have assigned a stub.
  // Restore the pristine "unsupported" baseline so order never matters.
  delete (globalThis as { matchMedia?: unknown }).matchMedia;
  rafCount = 0;
  installCanvasAndObserverStubs();
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

describe('Vortex matchMedia compatibility guard', () => {
  it('does not crash and stays static when matchMedia is unsupported', () => {
    // jsdom has no window.matchMedia: this is the unsupported environment.
    expect(typeof globalThis.matchMedia).toBe('undefined');

    // The static fallback render happens synchronously on mount, so no
    // timers need to fire for the assertions below.
    const { container } = render(<EventVortexHero totalEvents={4} />);

    // The hero and its canvas survive mount — previously a TypeError
    // ("window.matchMedia is not a function") unmounted the React tree.
    expect(container.querySelector('[data-events-vortex-hero]')).toBeInTheDocument();
    expect(container.querySelector('canvas[aria-hidden="true"]')).toBeInTheDocument();
    expect(container.querySelector('[data-reduced-motion="true"]')).toBeInTheDocument();
  });

  it('runs no animation loop when matchMedia is unsupported', () => {
    jest.useFakeTimers();
    installBrowserStubs();
    render(<EventVortexHero totalEvents={4} />);

    const afterMount = rafCount;
    jest.advanceTimersByTime(3_000);

    // No frames may be scheduled in the fallback: the count is flat.
    expect(rafCount).toBe(afterMount);
  });

  it('animates normally when matchMedia reports no reduced-motion preference', () => {
    const listeners: Array<() => void> = [];
    globalThis.matchMedia = ((query: string): MediaQueryList => {
      expect(query).toBe('(prefers-reduced-motion: reduce)');
      return {
        matches: false,
        addEventListener: (_: string, listener: () => void): void => {
          listeners.push(listener);
        },
        removeEventListener: (): void => {},
      } as unknown as MediaQueryList;
    }) as typeof matchMedia;

    jest.useFakeTimers();
    installBrowserStubs();
    render(<EventVortexHero totalEvents={4} />);

    // A single static render is expected on mount; the loop must add frames.
    jest.advanceTimersByTime(1_000);
    expect(rafCount).toBeGreaterThan(1);

    // Normal rendering is unchanged: no reduced-motion attribute.
    expect(document.querySelector('[data-reduced-motion="true"]')).not.toBeInTheDocument();
  });

  it('renders statically when matchMedia reports reduced-motion preference', () => {
    globalThis.matchMedia = ((query: string): MediaQueryList => {
      expect(query).toBe('(prefers-reduced-motion: reduce)');
      return {
        matches: true,
        addEventListener: (): void => {},
        removeEventListener: (): void => {},
      } as unknown as MediaQueryList;
    }) as typeof matchMedia;

    jest.useFakeTimers();
    installBrowserStubs();
    render(<EventVortexHero totalEvents={4} />);

    jest.advanceTimersByTime(1_000);
    // Same stationary behavior as the unsupported fallback.
    expect(rafCount).toBeLessThanOrEqual(1);
    expect(document.querySelector('[data-reduced-motion="true"]')).toBeInTheDocument();
  });

  it('does not crash when matchMedia exists but MediaQueryList lacks addEventListener', () => {
    // Old WebKit (e.g. Safari < 14, old Android WebViews) exposes matchMedia
    // but MediaQueryList does not inherit EventTarget. The guard must treat
    // such an unlistenable MQL as the static reduced-motion render.
    globalThis.matchMedia = ((query: string): MediaQueryList => {
      expect(query).toBe('(prefers-reduced-motion: reduce)');
      // Deliberately no addEventListener/removeEventListener methods.
      return { matches: false } as unknown as MediaQueryList;
    }) as typeof matchMedia;

    jest.useFakeTimers();
    installBrowserStubs();
    const { container } = render(<EventVortexHero totalEvents={4} />);

    jest.advanceTimersByTime(1_000);
    // Hero survives mount; animation is treated as reduced (static, no loop).
    expect(container.querySelector('[data-events-vortex-hero]')).toBeInTheDocument();
    expect(container.querySelector('canvas[aria-hidden="true"]')).toBeInTheDocument();
    expect(rafCount).toBeLessThanOrEqual(1);
    expect(document.querySelector('[data-reduced-motion="true"]')).toBeInTheDocument();
  });

  it('follows a runtime normal-to-reduce preference change by stopping the loop', () => {
    // Mutable state + real change dispatch through the registered listener,
    // mirroring what a browser fires when the OS preference flips mid-session.
    let matches = false;
    let changeListener: (() => void) | undefined;
    globalThis.matchMedia = ((query: string): MediaQueryList => {
      expect(query).toBe('(prefers-reduced-motion: reduce)');
      return {
        get matches(): boolean {
          return matches;
        },
        addEventListener: (_: string, listener: () => void): void => {
          changeListener = listener;
        },
        removeEventListener: (): void => {},
      } as unknown as MediaQueryList;
    }) as typeof matchMedia;

    jest.useFakeTimers();
    installBrowserStubs();
    const { container } = render(<EventVortexHero totalEvents={4} />);
    jest.advanceTimersByTime(500);
    expect(rafCount).toBeGreaterThan(1);

    const beforeToggle = rafCount;

    // User turns on reduced motion while the hero is mounted.
    matches = true;
    act(() => {
      changeListener?.({ matches: true } as MediaQueryListEvent);
    });
    jest.advanceTimersByTime(500);
    expect(rafCount).toBe(beforeToggle);
    expect(container.querySelector('[data-reduced-motion="true"]')).toBeInTheDocument();
  });

  it('follows a runtime reduce-to-normal preference change by starting the loop', () => {
    let matches = true;
    let changeListener: (() => void) | undefined;
    globalThis.matchMedia = ((query: string): MediaQueryList => {
      expect(query).toBe('(prefers-reduced-motion: reduce)');
      return {
        get matches(): boolean {
          return matches;
        },
        addEventListener: (_: string, listener: () => void): void => {
          changeListener = listener;
        },
        removeEventListener: (): void => {},
      } as unknown as MediaQueryList;
    }) as typeof matchMedia;

    jest.useFakeTimers();
    installBrowserStubs();
    const { container } = render(<EventVortexHero totalEvents={4} />);
    jest.advanceTimersByTime(500);
    expect(rafCount).toBeLessThanOrEqual(1);
    expect(container.querySelector('[data-reduced-motion="true"]')).toBeInTheDocument();

    const beforeToggle = rafCount;

    // User turns the reduced-motion preference off while mounted.
    matches = false;
    act(() => {
      changeListener?.({ matches: false } as MediaQueryListEvent);
    });
    jest.advanceTimersByTime(500);
    expect(rafCount).toBeGreaterThan(beforeToggle);
    expect(container.querySelector('[data-reduced-motion="true"]')).not.toBeInTheDocument();
  });
});
