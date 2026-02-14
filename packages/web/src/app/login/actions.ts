'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function signInWithMagicLink(email: string) {
  const supabase = await createClient();
  const headerStore = await headers();
  const origin = headerStore.get('origin') || 'http://localhost:3000';

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
