'use server';

import { revalidatePath } from 'next/cache';
import { getAuthUser } from '@/lib/supabase/server';

export type ExamplesFilterType =
  | 'all'
  | 'rated'
  | 'unrated'
  | 'quality'
  | 'train'
  | 'val'
  | 'unassigned';
export type ExamplesSortType = 'newest' | 'oldest' | 'rating-asc' | 'rating-desc';

const PAGE_SIZE = 50;

export async function getExamplesList(
  projectId: string,
  {
    filter = 'all',
    sort = 'newest',
    page = 1,
  }: {
    filter?: ExamplesFilterType;
    sort?: ExamplesSortType;
    page?: number;
  } = {},
) {
  const { supabase } = await getAuthUser();

  // Get quality threshold for the "quality" filter
  const { data: project } = await supabase
    .from('projects')
    .select('quality_threshold')
    .eq('id', projectId)
    .single();

  const threshold = project?.quality_threshold ?? 8;

  let query = supabase
    .from('examples')
    .select('id, input, output, rating, rewrite, split, created_at, rated_at', {
      count: 'exact',
    })
    .eq('project_id', projectId);

  // Apply filters
  if (filter === 'rated') {
    query = query.not('rating', 'is', null);
  } else if (filter === 'unrated') {
    query = query.is('rating', null);
  } else if (filter === 'quality') {
    query = query.gte('rating', threshold);
  } else if (filter === 'train') {
    query = query.eq('split', 'train');
  } else if (filter === 'val') {
    query = query.eq('split', 'val');
  } else if (filter === 'unassigned') {
    query = query.is('split', null);
  }

  // Apply sorting
  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (sort === 'oldest') {
    query = query.order('created_at', { ascending: true });
  } else if (sort === 'rating-asc') {
    query = query.order('rating', { ascending: true, nullsFirst: false });
  } else if (sort === 'rating-desc') {
    query = query.order('rating', { ascending: false, nullsFirst: false });
  }

  // Apply pagination
  const offset = (page - 1) * PAGE_SIZE;
  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data, error, count } = await query;

  if (error) {
    return { examples: [], total: 0, error: error.message };
  }

  return { examples: data ?? [], total: count ?? 0 };
}

export async function updateExample(
  exampleId: string,
  updates: { input?: string; output?: string; rating?: number | null },
) {
  const { supabase, user } = await getAuthUser();

  const updateData: Record<string, unknown> = {};

  if (updates.input !== undefined) updateData.input = updates.input;
  if (updates.output !== undefined) updateData.output = updates.output;
  if (updates.rating !== undefined) {
    updateData.rating = updates.rating;
    updateData.rated_by = updates.rating !== null ? user.id : null;
    updateData.rated_at = updates.rating !== null ? new Date().toISOString() : null;
  }

  const { error } = await supabase.from('examples').update(updateData).eq('id', exampleId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/examples');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteExample(exampleId: string) {
  const { supabase } = await getAuthUser();

  const { error } = await supabase.from('examples').delete().eq('id', exampleId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/examples');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteExamples(exampleIds: string[]) {
  const { supabase } = await getAuthUser();

  const { error } = await supabase.from('examples').delete().in('id', exampleIds);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/examples');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateExamplesSplit(exampleIds: string[], split: 'train' | 'val' | null) {
  const { supabase } = await getAuthUser();

  const { error } = await supabase.from('examples').update({ split }).in('id', exampleIds);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/examples');
  revalidatePath('/dashboard');
  return { success: true };
}
