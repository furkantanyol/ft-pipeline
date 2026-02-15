import type { TrainingConfig } from '@/app/(app)/train/actions';

// Together.ai pricing (approximate, as of 2024)
// LoRA fine-tuning: ~$0.008 per 1000 tokens per epoch
// Estimate: input + output tokens per example * number of examples * epochs
export function estimateTrainingCost(
  trainCount: number,
  valCount: number,
  config: TrainingConfig,
): number {
  // Rough estimate: 500 tokens per example on average (input + output)
  const tokensPerExample = 500;
  const totalTokens = (trainCount + valCount) * tokensPerExample;
  const totalTokenThousands = totalTokens / 1000;
  const costPerThousand = 0.008; // $0.008 per 1k tokens per epoch

  return totalTokenThousands * costPerThousand * config.epochs;
}

export function estimateTrainingDuration(trainCount: number, config: TrainingConfig): string {
  // Rough estimate based on typical Together.ai LoRA training speeds
  // ~100 examples per minute on average (varies by model size)
  const examplesPerMinute = 100;
  const totalExamples = trainCount * config.epochs;
  const minutes = Math.ceil(totalExamples / examplesPerMinute);

  if (minutes < 60) {
    return `~${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 1) {
    return remainingMinutes > 0 ? `~1 hr ${remainingMinutes} min` : '~1 hr';
  }

  return remainingMinutes > 0 ? `~${hours} hrs ${remainingMinutes} min` : `~${hours} hrs`;
}
