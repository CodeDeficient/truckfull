import { type NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logging';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  MenuBodySchema,
  canEditTruck,
  readTruckMenu,
  writeTruckMenu,
} from '@/lib/services/ownerTruckMenu.server';
import type { MenuItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

async function authorize(context: RouteContext): Promise<NextResponse | string> {
  const {
    data: { user },
    error,
  } = await createServerSupabaseClient().auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await context.params;
  if (!(await canEditTruck(user.id, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return id;
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const truckId = await authorize(context);
    if (typeof truckId !== 'string') return truckId;
    return NextResponse.json({ menu: await readTruckMenu(truckId) });
  } catch (error) {
    logError('Owner menu read failed:', error);
    return NextResponse.json({ error: 'Failed to load menu' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const truckId = await authorize(context);
    if (typeof truckId !== 'string') return truckId;
    const parsed = MenuBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid menu' }, { status: 400 });
    }
    await writeTruckMenu(truckId, parsed.data.menu as unknown as MenuItem[]);
    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Owner menu write failed:', error);
    return NextResponse.json({ error: 'Failed to save menu' }, { status: 500 });
  }
}
