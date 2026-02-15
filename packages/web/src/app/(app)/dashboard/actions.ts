'use server';

import { createClient } from '@/lib/supabase/server';

export type DashboardMetrics = {
  totalExamples: number;
  ratedCount: number;
  qualityCount: number;
  modelsTrainedCount: number;
};

export async function getDashboardMetrics(projectId: string): Promise<{
  metrics: DashboardMetrics | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { metrics: null, error: 'Not authenticated' };
  }

  // Get project quality threshold
  const { data: project } = await supabase
    .from('projects')
    .select('quality_threshold')
    .eq('id', projectId)
    .single();

  if (!project) {
    return { metrics: null, error: 'Project not found' };
  }

  const threshold = project.quality_threshold ?? 8;

  // Get all examples for this project
  const { data: examples, error: examplesError } = await supabase
    .from('examples')
    .select('rating')
    .eq('project_id', projectId);

  if (examplesError) {
    return { metrics: null, error: examplesError.message };
  }

  // Get completed training runs count
  const { count: modelsTrainedCount, error: runsError } = await supabase
    .from('training_runs')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'completed');

  if (runsError) {
    return { metrics: null, error: runsError.message };
  }

  // Calculate metrics
  const totalExamples = examples?.length ?? 0;
  const ratedCount = examples?.filter((e) => e.rating !== null).length ?? 0;
  const qualityCount =
    examples?.filter((e) => e.rating !== null && e.rating >= threshold).length ?? 0;

  return {
    metrics: {
      totalExamples,
      ratedCount,
      qualityCount,
      modelsTrainedCount: modelsTrainedCount ?? 0,
    },
  };
}
