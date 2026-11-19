import { type NextRequest, NextResponse } from 'next/server';
import { withValidation } from '@/lib/middleware/withValidation';
import { handlePostRequest, handleGetRequest } from '@/lib/api/admin/data-cleanup/handlers';
import { DataCleanupSchema } from '@/lib/validation/schemas/v1/api';
import { logError } from '@/lib/logging';
import { verifyAdminAccess } from '@/lib/auth/authHelpers';

export const POST = withValidation(
  DataCleanupSchema,
  async (request: NextRequest, _params, validatedData) => {
    const hasAccess = await verifyAdminAccess(request);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handlePostRequest(validatedData);
  },
);

export async function GET(request: NextRequest) {
  const hasAccess = await verifyAdminAccess(request);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return await handleGetRequest(request);
  } catch (error: unknown) {
    logError('Data cleanup GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process cleanup request',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
