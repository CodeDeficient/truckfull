import { expect, test, type Page } from '@playwright/test';

interface HeapUsage {
  readonly usedSize: number;
}

interface AnimationMetrics {
  readonly activeFrameRequests: number;
  readonly frameCount: number;
}

const HEAP_GROWTH_BUDGET_BYTES = 2 * 1024 * 1024;
const ANIMATION_SAMPLE_MS = 4000;
const REMOUNT_COUNT = 3;
const FRAME_SAMPLE_COUNT = 120;
const FRAME_INTERVAL_P95_BUDGET_MS = 40;

async function collectHeapUsage(page: Page): Promise<number> {
  const client = await page.context().newCDPSession(page);
  await client.send('HeapProfiler.enable');
  await client.send('HeapProfiler.collectGarbage');
  const usage = (await client.send('Runtime.getHeapUsage')) as HeapUsage;
  await client.detach();
  return usage.usedSize;
}

async function waitForHero(page: Page): Promise<void> {
  await page.goto('/events', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-events-vortex-hero] canvas')).toBeVisible();
}


async function sampleFrameIntervals(page: Page): Promise<readonly number[]> {
  return page.evaluate((sampleCount) => new Promise<number[]>((resolve) => {
    const intervals: number[] = [];
    let previousTime = 0;

    const sample = (time: number): void => {
      if (previousTime > 0) intervals.push(time - previousTime);
      previousTime = time;
      if (intervals.length >= sampleCount) resolve(intervals);
      else globalThis.requestAnimationFrame(sample);
    };

    globalThis.requestAnimationFrame(sample);
  }), FRAME_SAMPLE_COUNT);
}

async function readLiveAnimationMetrics(page: Page): Promise<AnimationMetrics | null> {
  return page.evaluate(() => {
    const metrics = (
      globalThis as unknown as {
        __eventsVortexAnimationMetrics?: () => AnimationMetrics;
      }
    ).__eventsVortexAnimationMetrics;
    return metrics ? metrics() : null;
  });
}

test.describe('events hero resource lifecycle', () => {
  test('stops its animation loop when the hero document is left', async ({ page }) => {
    await page.addInitScript(() => {
      const nativeRequestAnimationFrame = globalThis.requestAnimationFrame.bind(globalThis);
      const nativeCancelAnimationFrame = globalThis.cancelAnimationFrame.bind(globalThis);
      const activeFrameRequests = new Set<number>();
      let frameCount = 0;

      globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
        let requestId = 0;
        requestId = nativeRequestAnimationFrame((timestamp) => {
          activeFrameRequests.delete(requestId);
          frameCount += 1;
          callback(timestamp);
        });
        activeFrameRequests.add(requestId);
        return requestId;
      };

      globalThis.cancelAnimationFrame = (requestId: number): void => {
        activeFrameRequests.delete(requestId);
        nativeCancelAnimationFrame(requestId);
      };

      Object.defineProperty(globalThis, '__eventsVortexAnimationMetrics', {
        value: (): AnimationMetrics => ({
          activeFrameRequests: activeFrameRequests.size,
          frameCount,
        }),
        configurable: true,
      });

    });

    await waitForHero(page);
    await expect
      .poll(async () => {
        const metrics = await readLiveAnimationMetrics(page);
        return metrics?.frameCount ?? 0;
      })
      .toBeGreaterThan(10);

    await Promise.all([
      page.waitForURL(/\/$/),
      page.getByRole('link', { name: 'Home' }).click(),
    ]);

    await expect
      .poll(async () => readLiveAnimationMetrics(page))
      .toEqual(expect.objectContaining({ activeFrameRequests: 0 }));
  });

  test('keeps post-GC heap growth bounded through animation and remounts', async ({ page }) => {
    await waitForHero(page);
    await page.waitForTimeout(1000);

    const baselineHeap = await collectHeapUsage(page);
    await page.waitForTimeout(ANIMATION_SAMPLE_MS);
    const animatedHeap = await collectHeapUsage(page);

    const remountedHeaps: number[] = [];
    for (let cycle = 0; cycle < REMOUNT_COUNT; cycle += 1) {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await waitForHero(page);
      remountedHeaps.push(await collectHeapUsage(page));
    }

    const [firstRemountedHeap = 0] = remountedHeaps;
    const lastRemountedHeap = remountedHeaps.at(-1) ?? firstRemountedHeap;

    expect(animatedHeap - baselineHeap).toBeLessThan(HEAP_GROWTH_BUDGET_BYTES);
    expect(lastRemountedHeap - firstRemountedHeap).toBeLessThan(HEAP_GROWTH_BUDGET_BYTES);
  });

  test('keeps the hero animation frame cadence within the smoothness budget', async ({ page }) => {
    await waitForHero(page);

    const intervals = await sampleFrameIntervals(page);
    const sortedIntervals = [...intervals].sort((first, second) => first - second);
    const p95Index = Math.floor(sortedIntervals.length * 0.95);
    const p95Interval = sortedIntervals[p95Index] ?? Number.POSITIVE_INFINITY;

    expect(p95Interval).toBeLessThan(FRAME_INTERVAL_P95_BUDGET_MS);
  });
});
