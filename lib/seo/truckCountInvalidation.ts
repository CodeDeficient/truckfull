import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';

import { TRUCK_COUNT_CACHE_TAG, TRUCK_COUNT_METADATA_CACHE_TAG } from './getTruckCount';

export function invalidateMetadataTruckCount(): void {
  revalidateTag(TRUCK_COUNT_METADATA_CACHE_TAG, { expire: 0 });
  revalidateTag(TRUCK_COUNT_CACHE_TAG, { expire: 0 });
  revalidatePath('/');
}
