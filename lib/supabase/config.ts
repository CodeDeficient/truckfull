let _supabaseUrl: string | undefined;
let _supabaseAnonKey: string | undefined;
let _supabaseServiceRoleKey: string | undefined;

export function getSupabaseConfig() {
  if (!_supabaseUrl) {
    _supabaseUrl = globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_URL;
  }
  if (!_supabaseAnonKey) {
    _supabaseAnonKey = globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
  if (!_supabaseServiceRoleKey) {
    _supabaseServiceRoleKey = globalThis.process?.env?.SUPABASE_SERVICE_ROLE_KEY;
  }
  if (!_supabaseUrl) {
    throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!_supabaseAnonKey) {
    throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  if (!_supabaseServiceRoleKey) {
    throw new Error('Missing environment variable SUPABASE_SERVICE_ROLE_KEY');
  }
  return {
    supabaseUrl: _supabaseUrl,
    supabaseAnonKey: _supabaseAnonKey,
    supabaseServiceRoleKey: _supabaseServiceRoleKey,
  };
}
