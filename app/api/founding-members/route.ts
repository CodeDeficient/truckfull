import { NextResponse } from 'next/server';
import { getFoundingMemberData } from '@/lib/content/metrics';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await getFoundingMemberData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch founding member data' },
      { status: 500 },
    );
  }
}
