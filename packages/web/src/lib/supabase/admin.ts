import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Server-only admin client using the service role key.
// Bypasses RLS — use only in server actions that do their own auth checks.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
