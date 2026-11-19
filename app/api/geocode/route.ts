import { NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/utils/geocoding';
import { logDebug, logError, logWarning } from '@/lib/logging';
import { z, ZodError } from 'zod';

const GeocodeRequestSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = GeocodeRequestSchema.parse(await request.json());
    const { street, city } = body;

    logDebug('[Geocode API] Geocoding address:', { street, city });

    const address = [street, city].join(', ');
    const result = await geocodeAddress(address);

    if (result.success && result.lat && result.lng) {
      logDebug('[Geocode API] Success:', { lat: result.lat, lng: result.lng });
      return NextResponse.json({
        success: true,
        lat: result.lat,
        lng: result.lng,
        formatted_address: result.formatted_address,
      });
    } else {
      logWarning('[Geocode API] No results found for:', { street, city });
      return NextResponse.json(
        {
          success: false,
          error: 'Address not found',
        },
        { status: 404 },
      );
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'Street and city are required' },
        { status: 400 },
      );
    }
    logError('[Geocode API] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
