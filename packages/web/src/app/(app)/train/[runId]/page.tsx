import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type Props = {
  params: Promise<{ runId: string }>;
};

async function getTrainingRun(runId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('training_runs')
    .select(
      `
      id,
      provider,
      provider_job_id,
      model_id,
      base_model,
      status,
      config,
      example_count,
      train_count,
      val_count,
      started_at,
      completed_at,
      error,
      created_at
    `,
    )
    .eq('id', runId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

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

export default async function TrainingRunPage({ params }: Props) {
  const { runId } = await params;
  const run = await getTrainingRun(runId);

  if (!run) {
    notFound();
  }

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
            {getStatusBadge(run.status)}
          </div>
          <CardDescription>Started {new Date(run.created_at).toLocaleString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Model</span>
                <span className="font-medium">{run.base_model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Training Examples</span>
                <span className="font-medium">{run.train_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Validation Examples</span>
                <span className="font-medium">{run.val_count}</span>
              </div>
              {run.provider_job_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Job ID</span>
                  <span className="font-mono text-xs">{run.provider_job_id}</span>
                </div>
              )}
              {run.model_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fine-tuned Model</span>
                  <span className="font-mono text-xs">{run.model_id}</span>
                </div>
              )}
              {run.error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-sm text-destructive">{run.error}</p>
                </div>
              )}
            </div>

            {run.status === 'training' && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Training in progress. This page will update automatically when the job completes.
                  You can safely close this page and check back later.
                </p>
              </div>
            )}

            {run.status === 'completed' && run.model_id && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                <p className="text-sm text-green-700 dark:text-green-400">
                  Training completed successfully! Your fine-tuned model is ready to use.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* TODO: W3.4 - Add live status polling, cancel button, eval CTA */}
    </div>
  );
}
