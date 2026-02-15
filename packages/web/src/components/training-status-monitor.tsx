'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { pollTrainingStatus, cancelTraining } from '@/app/(app)/train/actions';

type Props = {
  runId: string;
  initialStatus: string;
  initialModelId: string | null;
  initialError: string | null;
  baseModel: string;
  trainCount: number;
  valCount: number;
  providerJobId: string | null;
  createdAt: string;
};

function getStatusBadge(status: string) {
  const variants: Record<
    string,
    { variant: 'default' | 'secondary' | 'destructive'; icon: React.ReactNode }
  > = {
    pending: {
      variant: 'secondary',
      icon: <Clock className="mr-1 h-3 w-3" />,
    },
    uploading: {
      variant: 'secondary',
      icon: <Loader2 className="mr-1 h-3 w-3 animate-spin" />,
    },
    queued: {
      variant: 'secondary',
      icon: <Clock className="mr-1 h-3 w-3" />,
    },
    training: {
      variant: 'default',
      icon: <Loader2 className="mr-1 h-3 w-3 animate-spin" />,
    },
    completed: {
      variant: 'default',
      icon: <CheckCircle2 className="mr-1 h-3 w-3" />,
    },
    failed: {
      variant: 'destructive',
      icon: <XCircle className="mr-1 h-3 w-3" />,
    },
    cancelled: {
      variant: 'secondary',
      icon: <XCircle className="mr-1 h-3 w-3" />,
    },
  };

  const config = variants[status] ?? variants.pending;

  return (
    <Badge variant={config.variant} className="flex w-fit items-center">
      {config.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function TrainingStatusMonitor({
  runId,
  initialStatus,
  initialModelId,
  initialError,
  baseModel,
  trainCount,
  valCount,
  providerJobId,
  createdAt,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [modelId, setModelId] = useState(initialModelId);
  const [error, setError] = useState(initialError);
  const [isCancelling, setIsCancelling] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);

  const isActive = status === 'uploading' || status === 'queued' || status === 'training';
  const isTerminal = status === 'completed' || status === 'failed' || status === 'cancelled';

  const poll = useCallback(async () => {
    const result = await pollTrainingStatus(runId);

    if (result.success && result.run) {
      setStatus(result.run.status);
      setModelId(result.run.model_id);
      setError(result.run.error);
      setPollError(null);

      // Refresh the page when terminal state is reached
      if (
        result.run.status === 'completed' ||
        result.run.status === 'failed' ||
        result.run.status === 'cancelled'
      ) {
        router.refresh();
      }
    } else {
      setPollError(result.error ?? 'Failed to poll status');
    }
  }, [runId, router]);

  useEffect(() => {
    if (!isActive) return;

    // Poll every 10 seconds
    const interval = setInterval(() => {
      poll();
    }, 10000);

    return () => clearInterval(interval);
  }, [isActive, poll]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this training run?')) {
      return;
    }

    setIsCancelling(true);
    const result = await cancelTraining(runId);

    if (result.success) {
      setStatus('cancelled');
      router.refresh();
    } else {
      alert(result.error ?? 'Failed to cancel training');
    }

    setIsCancelling(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Training Run</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor your fine-tuning job progress</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Status</CardTitle>
            {getStatusBadge(status)}
          </div>
          <CardDescription>Started {new Date(createdAt).toLocaleString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Model</span>
                <span className="font-medium">{baseModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Training Examples</span>
                <span className="font-medium">{trainCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Validation Examples</span>
                <span className="font-medium">{valCount}</span>
              </div>
              {providerJobId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Job ID</span>
                  <span className="font-mono text-xs">{providerJobId}</span>
                </div>
              )}
              {modelId && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Fine-tuned Model</span>
                  <span className="break-all font-mono text-xs">{modelId}</span>
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}
              {pollError && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-yellow-700 dark:text-yellow-400" />
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">{pollError}</p>
                  </div>
                </div>
              )}
            </div>

            {status === 'uploading' && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-start gap-2">
                  <Loader2 className="mt-0.5 h-4 w-4 animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Uploading training files to Together.ai...
                  </p>
                </div>
              </div>
            )}

            {status === 'queued' && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4" />
                  <p className="text-sm text-muted-foreground">
                    Job is queued. Training will start soon. This page updates automatically every
                    10 seconds.
                  </p>
                </div>
              </div>
            )}

            {status === 'training' && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-start gap-2">
                  <Loader2 className="mt-0.5 h-4 w-4 animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Training in progress. This page updates automatically every 10 seconds. You can
                    safely close this page and check back later.
                  </p>
                </div>
              </div>
            )}

            {status === 'completed' && modelId && (
              <div className="space-y-3">
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-700 dark:text-green-400" />
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Training completed successfully! Your fine-tuned model is ready to use.
                    </p>
                  </div>
                </div>
                <Button size="lg" className="w-full">
                  Run Evaluation
                </Button>
              </div>
            )}

            {status === 'failed' && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <div className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4 text-destructive" />
                  <p className="text-sm text-destructive">
                    Training failed. Check the error message above for details.
                  </p>
                </div>
              </div>
            )}

            {status === 'cancelled' && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4" />
                  <p className="text-sm text-muted-foreground">This training run was cancelled.</p>
                </div>
              </div>
            )}

            {isActive && (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Training'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!isTerminal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Auto-refresh Enabled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page automatically polls Together.ai every 10 seconds for status updates. The
              database and UI will update when the training job completes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
