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

export type SplitData = {
  unassigned: Array<{
    id: string;
    input: string;
    output: string;
    rating: number | null;
  }>;
  train: Array<{
    id: string;
    input: string;
    output: string;
    rating: number | null;
  }>;
  val: Array<{
    id: string;
    input: string;
    output: string;
    rating: number | null;
  }>;
  isValLocked: boolean;
  stats: {
    unassignedAvgRating: number | null;
    trainAvgRating: number | null;
    valAvgRating: number | null;
  };
};

export async function getSplitData(projectId: string): Promise<{
  data: SplitData | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Get project to check if val is locked
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return { data: null, error: 'Project not found' };
  }

  // Get all quality examples (with ratings)
  const { data: examples, error: examplesError } = await supabase
    .from('examples')
    .select('id, input, output, rating, split')
    .eq('project_id', projectId)
    .not('rating', 'is', null)
    .order('created_at', { ascending: false });

  if (examplesError) {
    return { data: null, error: examplesError.message };
  }

  const unassigned = examples?.filter((e) => e.split === null) ?? [];
  const train = examples?.filter((e) => e.split === 'train') ?? [];
  const val = examples?.filter((e) => e.split === 'val') ?? [];

  // Calculate average ratings
  const calcAvg = (arr: typeof examples) => {
    const rated = arr.filter((e) => e.rating !== null);
    if (rated.length === 0) return null;
    return rated.reduce((sum, e) => sum + (e.rating ?? 0), 0) / rated.length;
  };

  // Val is locked if there are already validation examples assigned
  const isValLocked = val.length > 0;

  return {
    data: {
      unassigned,
      train,
      val,
      isValLocked,
      stats: {
        unassignedAvgRating: calcAvg(unassigned),
        trainAvgRating: calcAvg(train),
        valAvgRating: calcAvg(val),
      },
    },
  };
}

export async function autoSplit(
  projectId: string,
  ratio: number = 0.8,
): Promise<{ success: boolean; error?: string; trainCount?: number; valCount?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get project to check if val is locked
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('quality_threshold')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return { success: false, error: 'Project not found' };
  }

  // Get all quality examples that are not in val (respect lock)
  const { data: examples, error: examplesError } = await supabase
    .from('examples')
    .select('id, rating, split')
    .eq('project_id', projectId)
    .not('rating', 'is', null)
    .gte('rating', project.quality_threshold ?? 8);

  if (examplesError) {
    return { success: false, error: examplesError.message };
  }

  if (!examples || examples.length === 0) {
    return { success: false, error: 'No quality examples to split' };
  }

  // Check if val is locked
  const valExamples = examples.filter((e) => e.split === 'val');
  const isValLocked = valExamples.length > 0;

  // Get examples to split (exclude locked val)
  const toSplit = isValLocked ? examples.filter((e) => e.split !== 'val') : examples;

  // Stratified split by rating
  const ratingGroups: Record<number, typeof examples> = {};
  toSplit.forEach((ex) => {
    const rating = ex.rating ?? 0;
    if (!ratingGroups[rating]) ratingGroups[rating] = [];
    ratingGroups[rating].push(ex);
  });

  const trainIds: string[] = [];
  const valIds: string[] = [];

  // Split each rating group
  Object.values(ratingGroups).forEach((group) => {
    // Shuffle group
    const shuffled = [...group].sort(() => Math.random() - 0.5);
    const trainSize = Math.ceil(shuffled.length * ratio);

    shuffled.forEach((ex, i) => {
      if (i < trainSize) {
        trainIds.push(ex.id);
      } else {
        valIds.push(ex.id);
      }
    });
  });

  // Update train examples
  if (trainIds.length > 0) {
    const { error: trainError } = await supabase
      .from('examples')
      .update({ split: 'train' })
      .in('id', trainIds);

    if (trainError) {
      return { success: false, error: trainError.message };
    }
  }

  // Update new val examples (don't touch locked val)
  if (valIds.length > 0 && !isValLocked) {
    const { error: valError } = await supabase
      .from('examples')
      .update({ split: 'val' })
      .in('id', valIds);

    if (valError) {
      return { success: false, error: valError.message };
    }
  }

  return {
    success: true,
    trainCount: trainIds.length,
    valCount: isValLocked ? valExamples.length : valIds.length,
  };
}

export async function unlockValidationSet(projectId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Clear all val assignments (set to null)
  const { error } = await supabase
    .from('examples')
    .update({ split: null })
    .eq('project_id', projectId)
    .eq('split', 'val');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function moveExamplesToSplit(
  projectId: string,
  exampleIds: string[],
  targetSplit: 'train' | 'val' | null,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (exampleIds.length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from('examples')
    .update({ split: targetSplit })
    .eq('project_id', projectId)
    .in('id', exampleIds);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
