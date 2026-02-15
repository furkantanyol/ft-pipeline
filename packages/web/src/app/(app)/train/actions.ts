'use server';

import { createClient } from '@/lib/supabase/server';

export type TrainingConfig = {
  epochs: number;
  batch_size: number;
  learning_rate: number;
  lora_r: number;
  lora_alpha: number;
  lora_dropout: number;
};

export type PreflightData = {
  qualityCount: number;
  trainCount: number;
  valCount: number;
  unassignedCount: number;
  qualityThreshold: number;
  baseModel: string;
  trainingConfig: TrainingConfig;
  lastRun: {
    id: string;
    example_count: number;
    train_count: number;
    val_count: number;
    created_at: string;
    config: TrainingConfig;
  } | null;
  warnings: string[];
};

export async function getPreflightData(projectId: string): Promise<{
  data: PreflightData | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Get project details
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('quality_threshold, base_model, training_config')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return { data: null, error: 'Project not found' };
  }

  // Get all examples with ratings and splits
  const { data: examples, error: examplesError } = await supabase
    .from('examples')
    .select('rating, split')
    .eq('project_id', projectId);

  if (examplesError) {
    return { data: null, error: examplesError.message };
  }

  const threshold = project.quality_threshold ?? 8;

  // Calculate counts
  const qualityCount =
    examples?.filter((e) => e.rating !== null && e.rating >= threshold).length ?? 0;
  const trainCount = examples?.filter((e) => e.split === 'train').length ?? 0;
  const valCount = examples?.filter((e) => e.split === 'val').length ?? 0;
  const unassignedCount = examples?.filter((e) => e.split === null).length ?? 0;

  // Get last training run
  const { data: lastRun } = await supabase
    .from('training_runs')
    .select('id, example_count, train_count, val_count, created_at, config')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Generate warnings
  const warnings: string[] = [];

  if (qualityCount < 20) {
    warnings.push(`Only ${qualityCount} quality examples (recommend 20+)`);
  }

  if (trainCount < 10) {
    warnings.push(`Only ${trainCount} training examples (recommend 10+)`);
  }

  if (valCount < 2) {
    warnings.push(`Only ${valCount} validation examples (recommend 2+)`);
  }

  if (unassignedCount > 0) {
    warnings.push(`${unassignedCount} examples not assigned to train/val split`);
  }

  if (trainCount === 0) {
    warnings.push('No training examples assigned. Run split first.');
  }

  // Parse training config with defaults
  const trainingConfig: TrainingConfig = {
    epochs: 3,
    batch_size: 4,
    learning_rate: 0.00001,
    lora_r: 16,
    lora_alpha: 32,
    lora_dropout: 0.05,
    ...(project.training_config as Partial<TrainingConfig>),
  };

  return {
    data: {
      qualityCount,
      trainCount,
      valCount,
      unassignedCount,
      qualityThreshold: threshold,
      baseModel: project.base_model,
      trainingConfig,
      lastRun: lastRun
        ? {
            id: lastRun.id,
            example_count: lastRun.example_count,
            train_count: lastRun.train_count,
            val_count: lastRun.val_count,
            created_at: lastRun.created_at,
            config: lastRun.config as TrainingConfig,
          }
        : null,
      warnings,
    },
  };
}

export async function updateTrainingConfig(
  projectId: string,
  config: TrainingConfig,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('projects')
    .update({ training_config: config })
    .eq('id', projectId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
