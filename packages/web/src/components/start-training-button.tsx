'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Rocket, AlertTriangle } from 'lucide-react';
import { startTraining } from '@/app/(app)/train/actions';
import type { PreflightData } from '@/app/(app)/train/actions';

type StartTrainingButtonProps = {
  projectId: string;
  preflightData: PreflightData;
};

export function StartTrainingButton({ projectId, preflightData }: StartTrainingButtonProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReady =
    preflightData.trainCount >= 10 &&
    preflightData.valCount >= 2 &&
    preflightData.qualityCount >= 20;

  const hasWarnings = preflightData.warnings.length > 0;

  const handleStartTraining = async () => {
    setIsStarting(true);
    setError(null);

    const result = await startTraining(projectId);

    setIsStarting(false);

    if (result.success && result.runId) {
      // Redirect to training run status page
      router.push(`/train/${result.runId}`);
    } else {
      setError(result.error ?? 'Failed to start training');
    }
  };

  return (
    <div className="space-y-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="lg"
            disabled={isStarting || preflightData.trainCount === 0}
            className="w-full md:w-auto"
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Starting Training...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-5 w-5" />
                Start Training
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {hasWarnings && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
              Start Fine-Tuning?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are about to start a fine-tuning job with the following configuration:</p>

                <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Training examples:</span>
                      <span className="font-medium">{preflightData.trainCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Validation examples:</span>
                      <span className="font-medium">{preflightData.valCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Epochs:</span>
                      <span className="font-medium">{preflightData.trainingConfig.epochs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base model:</span>
                      <span className="font-medium text-xs">{preflightData.baseModel}</span>
                    </div>
                  </div>
                </div>

                {hasWarnings && (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                    <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500">
                      Warnings:
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-yellow-700 dark:text-yellow-400">
                      {preflightData.warnings.slice(0, 3).map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {!isReady && (
                  <p className="text-sm text-muted-foreground">
                    You can proceed, but results may not be optimal. Consider adding more quality
                    examples first.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartTraining} disabled={isStarting}>
              {isStarting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                'Start Training'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && <p className="text-sm text-destructive">Failed to start training: {error}</p>}
    </div>
  );
}
