import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getUserProjects } from '@/lib/projects';
import { getPreflightData, getSplitData } from './actions';
import { TrainingPreflight } from '@/components/training-preflight';
import { TrainingConfigEditor } from '@/components/training-config-editor';
import { SplitManager } from '@/components/split-manager';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

async function TrainingContent({ projectId }: { projectId: string }) {
  const { data, error } = await getPreflightData(projectId);
  const splitResult = await getSplitData(projectId);

  if (error || !data) {
    return (
      <div className="text-sm text-destructive">
        Failed to load training data: {error ?? 'Unknown error'}
      </div>
    );
  }

  if (splitResult.error || !splitResult.data) {
    return (
      <div className="text-sm text-destructive">
        Failed to load split data: {splitResult.error ?? 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <TrainingPreflight data={data} />
      <SplitManager projectId={projectId} data={splitResult.data} />
      <TrainingConfigEditor
        projectId={projectId}
        initialConfig={data.trainingConfig}
        trainCount={data.trainCount}
        valCount={data.valCount}
      />
    </div>
  );
}

function TrainingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </CardHeader>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="mt-2 h-4 w-96" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function TrainPage() {
  const cookieStore = await cookies();
  let activeProjectId = cookieStore.get('active_project')?.value ?? null;

  // Fallback to first project if cookie isn't set yet
  if (!activeProjectId) {
    const projects = await getUserProjects();
    activeProjectId = projects[0]?.id ?? null;
  }

  if (!activeProjectId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Training</h1>
        <p className="mt-1 text-sm text-muted-foreground">Select a project to start training</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Training</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pre-flight check and configuration for fine-tuning
        </p>
      </div>

      <Suspense fallback={<TrainingSkeleton />}>
        <TrainingContent projectId={activeProjectId} />
      </Suspense>
    </div>
  );
}
