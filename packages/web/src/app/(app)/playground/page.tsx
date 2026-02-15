import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { PlaygroundInterface } from '@/components/playground-interface';
import { getAvailableModels, getSystemPrompt } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserProjects } from '@/lib/projects';

async function PlaygroundContent({ projectId }: { projectId: string }) {
  const [modelsResult, promptResult] = await Promise.all([
    getAvailableModels(projectId),
    getSystemPrompt(projectId),
  ]);

  if (modelsResult.error || !modelsResult.models) {
    return (
      <div className="text-sm text-destructive">
        Failed to load models: {modelsResult.error ?? 'Unknown error'}
      </div>
    );
  }

  if (promptResult.error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load system prompt: {promptResult.error ?? 'Unknown error'}
      </div>
    );
  }

  return (
    <PlaygroundInterface
      projectId={projectId}
      models={modelsResult.models}
      systemPrompt={promptResult.systemPrompt}
    />
  );
}

function PlaygroundSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-[400px] w-full" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

export default async function PlaygroundPage() {
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
        <h1 className="text-2xl font-semibold tracking-tight">Playground</h1>
        <p className="mt-1 text-sm text-muted-foreground">Select a project to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Playground</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Test your models and save promising outputs as training examples
        </p>
      </div>

      <Suspense fallback={<PlaygroundSkeleton />}>
        <PlaygroundContent projectId={activeProjectId} />
      </Suspense>
    </div>
  );
}
