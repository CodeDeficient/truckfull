import { callOpenRouter } from '@/lib/openrouter';
import { logMessage, logError } from '@/lib/logging';

const NON_ALPHANUMERIC = /[^a-z0-9]/g;

export interface BenchmarkResult {
  model: string;
  accuracy: number;
  avgLatency: number;
  rateLimitHit: boolean;
  errors: string[];
}

export interface TestPost {
  id: string;
  message: string;
  expected: {
    food_items: string[];
    location: { address: string; city?: string; state?: string };
    times: { start: string; end: string };
  };
}

interface ModelPerformance {
  correct: number;
  total: number;
  latencies: number[];
  rateLimitHits: number;
  errors: string[];
}

const BENCHMARK_PROMPT = `Extract food truck information from this social media post. Return JSON only:
{
  "food_items": ["array of food items"],
  "location": {
    "address": "street address",
    "city": "city name",
    "state": "state abbreviation"
  },
  "times": {
    "start": "start time (e.g., 11am)",
    "end": "end time (e.g., 3pm)"
  }
}

Post: """{POST_TEXT}"""`;

export function calculateAccuracy(expected: unknown, actual: unknown): number {
  if (!actual || typeof actual !== 'object') return 0;

  const exp = expected as Record<string, unknown>;
  const act = actual as Record<string, unknown>;

  let matches = 0;
  let total = 0;

  if (Array.isArray(exp.food_items) && Array.isArray(act.food_items)) {
    total += 1;
    const expItems = exp.food_items.map((i: string) =>
      i.toLowerCase().replaceAll(NON_ALPHANUMERIC, ''),
    );
    const actItems = new Set(
      act.food_items.map((i: string) => i.toLowerCase().replaceAll(NON_ALPHANUMERIC, '')),
    );
    if (expItems.some((item: string) => actItems.has(item))) {
      matches += 1;
    }
  }

  if (
    exp.location &&
    typeof exp.location === 'object' &&
    act.location &&
    typeof act.location === 'object'
  ) {
    const expLoc = exp.location as Record<string, unknown>;
    const actLoc = act.location as Record<string, unknown>;
    total += 2;

    if (
      expLoc.address &&
      typeof expLoc.address === 'string' &&
      actLoc.address &&
      typeof actLoc.address === 'string'
    ) {
      const expAddr = expLoc.address.toLowerCase();
      const actAddr = actLoc.address.toLowerCase();
      if (expAddr.includes(actAddr) || actAddr.includes(expAddr)) {
        matches += 1;
      }
    }

    if (
      expLoc.city &&
      typeof expLoc.city === 'string' &&
      actLoc.city &&
      typeof actLoc.city === 'string'
    ) {
      const expCity = expLoc.city.toLowerCase();
      const actCity = actLoc.city.toLowerCase();
      if (expCity === actCity) {
        matches += 1;
      }
    }
  }

  if (exp.times && typeof exp.times === 'object' && act.times && typeof act.times === 'object') {
    const expTime = exp.times as Record<string, unknown>;
    const actTime = act.times as Record<string, unknown>;
    total += 2;

    if (
      expTime.start &&
      typeof expTime.start === 'string' &&
      actTime.start &&
      typeof actTime.start === 'string' &&
      expTime.start.toLowerCase() === actTime.start.toLowerCase()
    ) {
      matches += 1;
    }

    if (
      expTime.end &&
      typeof expTime.end === 'string' &&
      actTime.end &&
      typeof actTime.end === 'string' &&
      expTime.end.toLowerCase() === actTime.end.toLowerCase()
    ) {
      matches += 1;
    }
  }

  return total > 0 ? matches / total : 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function benchmarkModels(
  testPosts: TestPost[],
  models: string[],
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  logMessage(`Starting benchmark of ${models.length} models against ${testPosts.length} posts`);

  for (const model of models) {
    logMessage(`Benchmarking model: ${model}`);

    const performance: ModelPerformance = {
      correct: 0,
      total: 0,
      latencies: [],
      rateLimitHits: 0,
      errors: [],
    };

    for (const post of testPosts) {
      const prompt = BENCHMARK_PROMPT.replace('{POST_TEXT}', post.message);

      const startTime = Date.now();
      try {
        const response = await callOpenRouter([{ role: 'user', content: prompt }], {
          model,
          temperature: 0,
        });

        const latency = Date.now() - startTime;
        performance.latencies.push(latency);

        if (!response.success) {
          if (
            response.error?.toLowerCase().includes('rate limit') ||
            response.error?.toLowerCase().includes('429')
          ) {
            performance.rateLimitHits += 1;
            performance.errors.push(`Rate limited on post ${post.id}: ${response.error}`);
            logMessage(`  ⚠️ Rate limit hit for ${model}`);
            break;
          } else {
            performance.errors.push(`API error on post ${post.id}: ${response.error}`);
            performance.total += 1;
            continue;
          }
        }

        if (!response.data) {
          performance.errors.push(`Empty response on post ${post.id}`);
          performance.total += 1;
          continue;
        }

        let parsedData: unknown;
        try {
          parsedData = JSON.parse(response.data);
        } catch (parseError) {
          performance.errors.push(
            `JSON parse error on post ${post.id}: ${parseError instanceof Error ? parseError.message : 'unknown'}`,
          );
          performance.total += 1;
          continue;
        }

        const accuracy = calculateAccuracy(post.expected, parsedData);
        performance.correct += accuracy;
        performance.total += 1;

        logMessage(`  ✅ Post ${post.id}: accuracy=${accuracy.toFixed(2)}, latency=${latency}ms`);
      } catch (error) {
        const latency = Date.now() - startTime;
        performance.latencies.push(latency);
        const errorMessage = error instanceof Error ? error.message : 'unknown error';
        performance.errors.push(`Exception on post ${post.id}: ${errorMessage}`);
        performance.total += 1;
        logError(`  ❌ Error on post ${post.id}:`, errorMessage);
      }

      await sleep(100);
    }

    const avgLatency =
      performance.latencies.length > 0
        ? performance.latencies.reduce((a, b) => a + b, 0) / performance.latencies.length
        : 0;

    const accuracy = performance.total > 0 ? performance.correct / performance.total : 0;

    const result: BenchmarkResult = {
      model,
      accuracy,
      avgLatency,
      rateLimitHit: performance.rateLimitHits > 0,
      errors: performance.errors,
    };

    results.push(result);

    logMessage(
      `📊 ${model} - Accuracy: ${(accuracy * 100).toFixed(1)}%, Avg Latency: ${avgLatency.toFixed(0)}ms, Errors: ${performance.errors.length}`,
    );

    if (performance.rateLimitHits > 0) {
      logMessage(`⚠️ Model ${model} hit rate limit, skipping remaining posts`);
    }
  }

  results.sort((a, b) => {
    if (b.accuracy !== a.accuracy) {
      return b.accuracy - a.accuracy;
    }
    return a.avgLatency - b.avgLatency;
  });

  logMessage('Benchmark complete. Rankings:');
  for (const [i, r] of results.entries()) {
    logMessage(
      `  ${i + 1}. ${r.model} - ${(r.accuracy * 100).toFixed(1)}% accuracy, ${r.avgLatency.toFixed(0)}ms avg`,
    );
  }

  return results;
}
