import { test, expect } from '@playwright/test';

const mutationEnabled = process.env.RUN_SCHEDULE_MUTATION_E2E === 'true';
const truckId = process.env.SCHEDULE_E2E_TRUCK_ID;
const serviceDate = process.env.SCHEDULE_E2E_SERVICE_DATE ?? '2099-08-06';
const regressionTruckId = process.env.SCHEDULE_REGRESSION_TRUCK_ID ?? truckId;
const regressionServiceDate = process.env.SCHEDULE_REGRESSION_SERVICE_DATE ?? '2026-09-02';
const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const productionSupabaseUrl = process.env.PROD_SUPABASE_URL ?? '';
const configuredProjectRef = configuredSupabaseUrl ? new URL(configuredSupabaseUrl).hostname.split('.')[0] : '';
const productionProjectRef = productionSupabaseUrl ? new URL(productionSupabaseUrl).hostname.split('.')[0] : '';
const allowedProjectRef = process.env.SCHEDULE_E2E_SUPABASE_PROJECT_REF ?? '';
const safeMutationTarget =
  process.env.SCHEDULE_E2E_TARGET === 'staging' &&
  configuredProjectRef !== '' &&
  configuredProjectRef === allowedProjectRef &&
  productionProjectRef !== '' &&
  configuredProjectRef !== productionProjectRef;

test.describe('Schedule override persistence', () => {
  test('rejects unauthenticated dated override mutations', async ({ playwright }) => {
    const noAuthContext = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });

    try {
      const response = await noAuthContext.post('/api/owner/schedule/override', {
        data: { truck_id: '00000000-0000-0000-0000-000000000000', service_date: '2099-08-06' },
      });

      expect(response.status()).toBe(401);
    } finally {
      await noAuthContext.dispose();
    }
  });

  test('returns the existing dated schedule through the additive recurrence read path', async ({ page }, testInfo) => {
    test.skip(!regressionTruckId, 'Set SCHEDULE_REGRESSION_TRUCK_ID to the owner test truck.');
    test.skip(testInfo.project.name !== 'chromium', 'The read regression runs once against Chromium.');

    const response = await page.request.get(
      `/api/owner/schedule?truck_id=${regressionTruckId}&from=${regressionServiceDate}&to=${regressionServiceDate}`,
    );
    expect(response.status()).toBe(200);

    const schedule = (await response.json()) as {
      overrides: Array<{ service_date: string }>;
      recurrences: unknown[];
      occurrences: unknown[];
    };
    expect(schedule.overrides.some((override) => override.service_date === regressionServiceDate)).toBe(true);
    expect(Array.isArray(schedule.recurrences)).toBe(true);
    expect(Array.isArray(schedule.occurrences)).toBe(true);
  });

  test('date-only close persists and can be removed to reveal the recurring schedule', async ({ page }, testInfo) => {
    test.skip(
      !mutationEnabled || !truckId,
      'Set the mutation flag, truck ID, staging target, and explicit staging project reference.',
    );
    test.skip(!safeMutationTarget, 'Mutation E2E requires an explicitly allowlisted staging target.');
    test.skip(testInfo.project.name !== 'chromium', 'Mutation E2E runs only once against Chromium.');

    const baselineResponse = await page.request.get(
      `/api/owner/schedule?truck_id=${truckId}&from=${serviceDate}&to=${serviceDate}`,
    );
    expect(baselineResponse.ok()).toBe(true);
    const baseline = (await baselineResponse.json()) as {
      overrides: Array<{ service_date: string; is_closed: boolean; source_type: string }>;
    };
    test.skip(
      baseline.overrides.some((override) => override.service_date === serviceDate),
      'Selected mutation-test date already has an override; use an isolated date.',
    );

    let mutationAttempted = false;

    try {
      mutationAttempted = true;
      const closeResponse = await page.request.post('/api/owner/schedule/override', {
        data: { truck_id: truckId, service_date: serviceDate },
      });
      expect(closeResponse.ok()).toBe(true);

      const readResponse = await page.request.get(
        `/api/owner/schedule?truck_id=${truckId}&from=${serviceDate}&to=${serviceDate}`,
      );
      expect(readResponse.ok()).toBe(true);
      const data = (await readResponse.json()) as {
        overrides: Array<{ service_date: string; is_closed: boolean }>;
      };
      expect(data.overrides.some((override) => override.service_date === serviceDate && override.is_closed)).toBe(true);
    } finally {
      if (mutationAttempted) {
        const cleanupReadResponse = await page.request.get(
          `/api/owner/schedule?truck_id=${truckId}&from=${serviceDate}&to=${serviceDate}`,
        );
        expect(cleanupReadResponse.ok()).toBe(true);
        const cleanupData = (await cleanupReadResponse.json()) as {
          overrides: Array<{ service_date: string; is_closed: boolean; source_type: string }>;
        };
        const createdOverride = cleanupData.overrides.find(
          (override) =>
            override.service_date === serviceDate &&
            override.is_closed &&
            override.source_type === 'manual',
        );
        if (createdOverride) {
          const removeResponse = await page.request.delete('/api/owner/schedule/override', {
            data: { truck_id: truckId, service_date: serviceDate },
          });
          expect(removeResponse.ok()).toBe(true);
        }
      }
    }
  });
});
