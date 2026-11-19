import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError, logMessage } from '@/lib/logging';
import { createClient as createJsClient } from '@supabase/supabase-js';
import path from 'node:path';

const LINE_BREAK = /\r?\n/;
const ENV_ASSIGNMENT = /^([^=]+)=(.*)$/;

interface LocationData {
  lat?: number;
  lng?: number;
  address?: string;
}

interface ContactInfo {
  email?: string;
  phone?: string;
  website?: string;
}

interface SocialMedia {
  facebook?: string;
  instagram?: string;
}

// Production credentials must be set in .env.local
const PRODUCTION_URL = process.env.PRODUCTION_SUPABASE_URL;
const PRODUCTION_KEY = process.env.PRODUCTION_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    // 1. Auth Check - Admin Only
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 2. Parse Input
    const body = await request.json();
    const { truckIds } = body;

    if (!Array.isArray(truckIds) || truckIds.length === 0) {
      return NextResponse.json({ error: 'No truck IDs provided' }, { status: 400 });
    }

    // 3. Check Production Config
    let prodUrl = PRODUCTION_URL;
    let prodKey = PRODUCTION_KEY;

    // Strict constraint: User keeps keys in .env.production.backup locally
    // If not in env, try to read that file directly (server-side only)
    if (!prodUrl || !prodKey) {
      try {
        const fsPromises = await import('node:fs/promises');

        const backupPath = path.join(process.cwd(), '.env.production.backup');

        let fileContent;
        try {
          fileContent = await fsPromises.readFile(backupPath, 'utf8');
        } catch (error: unknown) {
          if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
            throw error;
          }
        }

        if (fileContent) {
          // Manual parse to avoid relying on devDependency 'dotenv' in runtime
          // eslint-disable-next-line unicorn/no-array-reduce -- reduce is appropriate for parsing key=value pairs
          const envConfig = fileContent.split(LINE_BREAK).reduce(
            (acc, line) => {
              const match = line.match(ENV_ASSIGNMENT);
              if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                // Remove quotes if present
                if (
                  (value.startsWith('"') && value.endsWith('"')) ||
                  (value.startsWith("'") && value.endsWith("'"))
                ) {
                  value = value.slice(1, -1);
                }
                acc[key] = value;
              }
              return acc;
            },
            {} as Record<string, string>,
          );

          prodUrl =
            prodUrl || envConfig['PRODUCTION_SUPABASE_URL'] || envConfig['PROD_SUPABASE_URL'];
          prodKey =
            prodKey ||
            envConfig['PRODUCTION_SERVICE_ROLE_KEY'] ||
            envConfig['PROD_SUPABASE_SERVICE_ROLE_KEY'];
        }
      } catch (error) {
        logError('Failed to read .env.production.backup', error);
      }
    }

    if (!prodUrl || !prodKey) {
      return NextResponse.json(
        {
          error:
            'Production credentials missing. Could not find valid PROD_SUPABASE_URL or PRODUCTION_SUPABASE_URL (and KEY) in process.env or .env.production.backup',
        },
        { status: 500 },
      );
    }

    // ... logic continues ...

    // 4. Fetch Trucks from Staging (Current DB)
    const adminClient = getSupabaseAdmin();
    const { data: trucks, error: fetchError } = await adminClient
      .from('food_trucks')
      .select('*')
      .in('id', truckIds);

    if (fetchError || !trucks) {
      throw new Error(`Failed to fetch trucks: ${fetchError?.message}`);
    }

    // 5. Validate & Prepare Sync Data
    const results = {
      success: 0,
      failed: 0,
      details: [] as string[],
    };

    const production = createJsClient(prodUrl, prodKey);
    const BATCH_SIZE = 50;

    // Separate valid trucks from validation failures
    const validTrucks: typeof trucks = [];
    for (const truck of trucks) {
      // VALIDATION RULES
      const errors: string[] = [];

      // Name required
      if (!truck.name || truck.name.length < 2) errors.push('Invalid name');

      // Location required (either current_location JSON or city/state)
      const loc = truck.current_location as LocationData | null;
      const hasLocation = (loc && loc.lat) || (truck.city && truck.state);
      if (!hasLocation) errors.push('No location data');

      // Contact required (at least one)
      const contact = (truck.contact_info as ContactInfo | null) || {};
      const social = (truck.social_media as SocialMedia | null) || {};
      const hasContact =
        contact.email || contact.phone || contact.website || social.facebook || social.instagram;
      if (!hasContact) errors.push('No contact info');

      if (errors.length > 0) {
        results.failed++;
        results.details.push(`${truck.name}: Failed validation (${errors.join(', ')})`);
        continue;
      }

      validTrucks.push(truck);
    }

    // 6. Batch Upsert with Fallback to Per-Truck Processing
    for (let i = 0; i < validTrucks.length; i += BATCH_SIZE) {
      const batch = validTrucks.slice(i, i + BATCH_SIZE);
      const syncDataBatch = batch.map((truck) => ({
        ...truck,
        updated_at: new Date().toISOString(),
      }));

      // Try batch upsert first for performance
      const { error: batchError } = await production.from('food_trucks').upsert(syncDataBatch);

      if (batchError) {
        // Fallback to per-truck upsert for granular error tracking
        logError(`Batch upsert failed, falling back to per-truck processing`, batchError);

        for (const truck of batch) {
          const syncData = {
            ...truck,
            updated_at: new Date().toISOString(),
          };

          const { error: truckError } = await production.from('food_trucks').upsert(syncData);

          if (truckError) {
            results.failed++;
            results.details.push(`${truck.name}: DB Error (${truckError.message})`);
            logError(`Sync failed for ${truck.name}`, truckError);
          } else {
            results.success++;
          }
        }
      } else {
        results.success += batch.length;
      }
    }

    // 7. Audit Trail - record the production write
    const { error: auditError } = await adminClient.from('audit_log').insert({
      action_type: 'sync_trucks_to_production',
      entity_type: 'food_truck',
      entity_id: null,
      user_id: user.id,
      old_value: null,
      new_value: { synced: results.success, failed: results.failed },
      reason: 'Admin synced trucks to production',
      metadata: { truck_ids: truckIds, details: results.details },
    });

    if (auditError) {
      logError('Failed to write sync-trucks audit trail:', auditError);
    }

    logMessage(`Sync complete: ${results.success} synced, ${results.failed} failed`);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    logError('Error in sync-trucks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
