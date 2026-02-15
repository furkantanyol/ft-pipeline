'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Split,
  TrendingUp,
  Clock,
  DollarSign,
  Info,
} from 'lucide-react';
import type { PreflightData } from '@/app/(app)/train/actions';
import { estimateTrainingCost, estimateTrainingDuration } from '@/lib/training-utils';

type TrainingPreflightProps = {
  data: PreflightData;
};

export function TrainingPreflight({ data }: TrainingPreflightProps) {
  const cost = estimateTrainingCost(data.trainCount, data.valCount, data.trainingConfig);
  const duration = estimateTrainingDuration(data.trainCount, data.trainingConfig);

  // Determine readiness
  const isReady = data.trainCount >= 10 && data.valCount >= 2 && data.qualityCount >= 20;
  const hasWarnings = data.warnings.length > 0;

  // Calculate diff from last run
  const trainDiff =
    data.lastRun !== null ? data.trainCount - data.lastRun.train_count : data.trainCount;
  const valDiff = data.lastRun !== null ? data.valCount - data.lastRun.val_count : data.valCount;

  return (
    <div className="space-y-6">
      {/* Readiness status */}
      <Card className={isReady ? 'border-green-500/50' : 'border-yellow-500/50'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isReady ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              )}
              <div>
                <CardTitle>{isReady ? 'Ready to Train' : 'Pre-flight Check'}</CardTitle>
                <CardDescription>
                  {isReady
                    ? 'All checks passed. You can start training.'
                    : 'Review warnings before starting training.'}
                </CardDescription>
              </div>
            </div>
            <Badge variant={isReady ? 'default' : 'secondary'} className="text-xs">
              {isReady ? 'Ready' : 'Not Ready'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Data overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Quality Examples</CardDescription>
              <Database className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{data.qualityCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Rating ≥ {data.qualityThreshold}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Train Split</CardDescription>
              <Split className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {data.trainCount}
              {trainDiff !== 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {trainDiff > 0 ? `+${trainDiff}` : trainDiff}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Training examples</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Validation Split</CardDescription>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {data.valCount}
              {valDiff !== 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {valDiff > 0 ? `+${valDiff}` : valDiff}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Validation examples</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Unassigned</CardDescription>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{data.unassignedCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Not in train/val</p>
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-base">Warnings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Cost & Duration estimate */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Estimated Cost</CardTitle>
            </div>
            <CardDescription>Based on Together.ai LoRA pricing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">${cost.toFixed(2)}</div>
            <p className="mt-2 text-xs text-muted-foreground">
              {data.trainCount + data.valCount} examples × {data.trainingConfig.epochs} epochs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Estimated Duration</CardTitle>
            </div>
            <CardDescription>Approximate training time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{duration}</div>
            <p className="mt-2 text-xs text-muted-foreground">Varies by model size and queue</p>
          </CardContent>
        </Card>
      </div>

      {/* Diff from last run */}
      {data.lastRun && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Changes Since Last Run</CardTitle>
            <CardDescription>
              Last run on {new Date(data.lastRun.created_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Training examples</span>
                <span className="font-medium">
                  {data.lastRun.train_count} → {data.trainCount}
                  {trainDiff !== 0 && (
                    <span className={trainDiff > 0 ? 'ml-2 text-green-600' : 'ml-2 text-red-600'}>
                      ({trainDiff > 0 ? '+' : ''}
                      {trainDiff})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Validation examples</span>
                <span className="font-medium">
                  {data.lastRun.val_count} → {data.valCount}
                  {valDiff !== 0 && (
                    <span className={valDiff > 0 ? 'ml-2 text-green-600' : 'ml-2 text-red-600'}>
                      ({valDiff > 0 ? '+' : ''}
                      {valDiff})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total examples</span>
                <span className="font-medium">
                  {data.lastRun.example_count} → {data.trainCount + data.valCount}
                  {data.trainCount + data.valCount - data.lastRun.example_count !== 0 && (
                    <span
                      className={
                        data.trainCount + data.valCount - data.lastRun.example_count > 0
                          ? 'ml-2 text-green-600'
                          : 'ml-2 text-red-600'
                      }
                    >
                      ({data.trainCount + data.valCount - data.lastRun.example_count > 0 ? '+' : ''}
                      {data.trainCount + data.valCount - data.lastRun.example_count})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
