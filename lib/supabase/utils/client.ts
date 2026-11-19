import type { PostgrestError } from '@supabase/supabase-js';
import { logWarning } from '@/lib/logging';

export function handleSupabaseError(error: PostgrestError | Error, context: string) {
  logWarning(`Error in ${context}:`, error.message);
}

export { groupMenuItems } from '../utils/index';
