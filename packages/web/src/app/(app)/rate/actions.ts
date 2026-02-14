'use server';

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

export async function rateExample(exampleId: string, rating: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('examples')
    .update({
      rating,
      rated_by: user.id,
      rated_at: new Date().toISOString(),
    })
    .eq('id', exampleId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
