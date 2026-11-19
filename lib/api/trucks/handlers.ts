import { NextResponse } from 'next/server';
import { FoodTruckService } from '@/lib/supabase';
import { logError } from '@/lib/logging';
import { toPublicFoodTruck } from '@/lib/mappers/publicView';
import { isPublicTruckListCandidate } from './eligibility';
import { pickWritableTruckFields } from '@/lib/trucks/updateWhitelist';
import { forceServerManagedCreateDefaults } from '@/lib/trucks/createWhitelist';
import { getPublicTruckByIdentifier } from '@/lib/services/publicTruckData.server';
import { fetchNearbyTrucks, type TruckFromRPC } from '@/lib/api/trucks/fetchNearbyTrucks';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { FoodTruck } from '@/lib/types';
import { capRadiusMiles } from '@/lib/api/trucks/radiusLimits';

export async function handleGetTruckById(id: string): Promise<NextResponse> {
  try {
    const truck = await getPublicTruckByIdentifier(id);
    if (truck == undefined) {
      return NextResponse.json({ error: 'Food truck not found' }, { status: 404 });
    }
    return NextResponse.json({ truck });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function loadNearbyTrucks(
  lat: number,
  lng: number,
  radiusMiles: number,
): Promise<TruckFromRPC[] | undefined> {
  try {
    return await fetchNearbyTrucks({
      lat,
      lng,
      radiusMiles,
      client: getSupabaseAdmin(),
      enrichTiers: false,
    });
  } catch (error) {
    logError('handleGetTrucksByLocation', error);
    return undefined;
  }
}

/**
 * Retrieves a list of food trucks within a specified radius.
 * @example
 * handleGetTrucksByLocation("37.7749", "-122.4194", "5")
 * Returns an object with the list of nearby food trucks and additional metadata.
 * @param {string} lat - Latitude of the location from which to search for food trucks.
 * @param {string} lng - Longitude of the location from which to search for food trucks.
 * @param {string} radius - The radius (in miles) within which to find food trucks.
 * @returns {Object} An object containing a list of nearby food trucks along with metadata related to the query.
 * @description
 *   - Converts latitude, longitude, and radius from string to float.
 *   - Invokes an asynchronous service call to fetch trucks.
 *   - Returns an error message with status 500 if an error is encountered.
 *   - Supports both PostGIS and Haversine fallback for radius queries.
 *   - Returns distance in both meters and miles for each truck.
 */
export async function handleGetTrucksByLocation(
  lat: string,
  lng: string,
  radius: string,
  signedIn: boolean,
) {
  const userLat = Number.parseFloat(lat);
  const userLng = Number.parseFloat(lng);
  const requestedRadiusMiles = Number.parseFloat(radius);

  // Validate input parameters
  if (
    !Number.isFinite(userLat) ||
    !Number.isFinite(userLng) ||
    !Number.isFinite(requestedRadiusMiles)
  ) {
    return NextResponse.json({ error: 'Invalid location or radius parameters' }, { status: 400 });
  }

  // Check for reasonable bounds
  if (Math.abs(userLat) > 90 || Math.abs(userLng) > 180) {
    return NextResponse.json(
      {
        error:
          'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180',
      },
      { status: 400 },
    );
  }

  if (requestedRadiusMiles <= 0) {
    return NextResponse.json({ error: 'Radius must be a positive number' }, { status: 400 });
  }

  const radiusMiles = capRadiusMiles(requestedRadiusMiles, signedIn);

  const nearbyTrucks = await loadNearbyTrucks(userLat, userLng, radiusMiles);
  if (nearbyTrucks == undefined) {
    return NextResponse.json(
      { error: "That didn't work, please try again later." },
      { status: 500 },
    );
  }

  // Strip internal fields before sending to client
  const publicTrucks = nearbyTrucks
    .map((truck) => toPublicFoodTruck(truck as FoodTruck))
    .filter((truck) => isPublicTruckListCandidate(truck));

  return NextResponse.json({
    trucks: publicTrucks,
    total: publicTrucks.length,
    limit: publicTrucks.length,
    offset: 0,
    hasMore: false,
    query: {
      lat: userLat,
      lng: userLng,
      radiusMiles,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Handles the creation of a food truck by delegating to the FoodTruckService.
 * @example
 * handlePostTruck({ name: 'Best Food Truck', location: 'Downtown' })
 * // returns a JSON response with status 201 and a success message
 * @param {unknown} truckData - Data for creating a new food truck.
 * @returns {object} JSON response indicating success or failure.
 * @description
 *   - Utilizes FoodTruckService to create a new truck record.
 *   - Handles errors, logging them and returning appropriate HTTP statuses.
 *   - Converts the data into a Partial<FoodTruck> type before passing it to the service.
 */
export async function handlePostTruck(truckData: unknown) {
  try {
    // The request body is validated by CreateFoodTruckSchema before it reaches
    // this shared writer, but that schema carries server-managed columns
    // (verification_status). Whitelist and force the initial trust state here
    // so every create path drops forged status fields.
    const safeTruckData = forceServerManagedCreateDefaults((truckData ?? {}) as object);
    const newTruckResult = await FoodTruckService.createTruck(safeTruckData as Partial<FoodTruck>);
    if ('error' in newTruckResult) {
      logError('Error creating truck:', newTruckResult.error);
      return NextResponse.json({ error: newTruckResult.error }, { status: 500 });
    }
    return NextResponse.json(
      {
        message: 'Food truck created successfully',
        truck: newTruckResult,
      },
      { status: 201 },
    );
  } catch (error) {
    logError('Error in handlePostTruck:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the food truck.' },
      { status: 500 },
    );
  }
}

/**
 * Updates food truck information with given updates and returns the operation status.
 * @example
 * handlePutTruck('1234', { name: 'New Food Truck Name' })
 * { message: 'Food truck updated successfully', truck: updatedTruckResult }
 * @param {string} id - The ID of the food truck to be updated.
 * @param {unknown} updates - The updates to apply to the food truck as a partial object.
 * @returns {Promise<NextResponse>} A response indicating success or failure of the update operation in JSON format.
 * @description
 *   - The function uses FoodTruckService.updateTruck to apply updates.
 *   - It logs errors to the console if the update operation fails.
 *   - Responds with HTTP status 500 in case of any error during the update process.
 */
export async function handlePutTruck(id: string, updates: unknown) {
  try {
    // The request body is validated by UpdateFoodTruckSchema before it reaches
    // this shared writer, but that schema still admits server-managed columns
    // (it is CreateFoodTruckSchema.partial(), and CreateFoodTruckSchema carries
    // verification_status). Whitelist here so both PUT routes drop them.
    const safeUpdates = pickWritableTruckFields((updates ?? {}) as object);
    const updatedTruckResult = await FoodTruckService.updateTruck(
      id,
      safeUpdates as Partial<FoodTruck>,
    );
    if ('error' in updatedTruckResult) {
      logError('Error updating truck:', updatedTruckResult.error);
      return NextResponse.json({ error: updatedTruckResult.error }, { status: 500 });
    }
    return NextResponse.json({
      message: 'Food truck updated successfully',
      truck: updatedTruckResult,
    });
  } catch (error) {
    logError('Error in handlePutTruck:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating the food truck.' },
      { status: 500 },
    );
  }
}

/**
 * Handler to get a specific truck with its associated events
 */
export async function handleGetTruckByIdWithEvents(id: string) {
  const truckResult = await FoodTruckService.getTruckByIdDomainWithEvents(id);
  if ('error' in truckResult) {
    return NextResponse.json({ error: truckResult.error }, { status: 500 });
  }

  const { events, ...truckData } = truckResult as FoodTruck & { events?: unknown[] };
  const publicTruck = toPublicFoodTruck(truckData as FoodTruck);
  if (!isPublicTruckListCandidate(publicTruck)) {
    return NextResponse.json({ error: 'Food truck not found' }, { status: 404 });
  }

  return NextResponse.json({ truck: { ...publicTruck, events } });
}
