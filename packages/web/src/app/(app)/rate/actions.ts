'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function getUnratedExamples(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { examples: [], error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('examples')
    .select('id, input, output, rating, created_at')
    .eq('project_id', projectId)
    .is('rating', null)
    .order('created_at', { ascending: true });

  if (error) {
    return { examples: [], error: error.message };
  }

  return { examples: data ?? [] };
}

export async function rateExample(exampleId: string, rating: number, rewrite?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const updateData: {
    rating: number;
    rated_by: string;
    rated_at: string;
    rewrite?: string;
  } = {
    rating,
    rated_by: user.id,
    rated_at: new Date().toISOString(),
  };

  // Only include rewrite if provided
  if (rewrite !== undefined) {
    updateData.rewrite = rewrite;
  }

  const { error } = await supabase.from('examples').update(updateData).eq('id', exampleId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}
