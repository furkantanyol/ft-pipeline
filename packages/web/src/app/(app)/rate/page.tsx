import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getUnratedExamples } from './actions';
import { RatingSession } from '@/components/rating-session';
import { Card, CardContent } from '@/components/ui/card';

export default async function RatePage() {
  const cookieStore = await cookies();
  const activeProjectId = cookieStore.get('active_project')?.value ?? null;

  const initialExamplesPromise = activeProjectId
    ? getUnratedExamples(activeProjectId)
    : Promise.resolve({ examples: [] });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rate Examples</h1>
        <p className="text-sm text-muted-foreground">
          Review and rate training examples to build a quality dataset.
        </p>
      </div>
      <Suspense
        fallback={
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Loading examples...
            </CardContent>
          </Card>
        }
      >
        <RatingSession key={activeProjectId} initialExamplesPromise={initialExamplesPromise} />
      </Suspense>
    </div>
  );
}
