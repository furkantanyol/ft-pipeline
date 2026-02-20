import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getExamplesList, type ExamplesFilterType, type ExamplesSortType } from './actions';
import { ExamplesTable } from '@/components/examples-table';
import { Card, CardContent } from '@/components/ui/card';
import { getUserProjects } from '@/lib/projects';

type PageProps = {
  searchParams: Promise<{
    filter?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function ExamplesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  let activeProjectId = cookieStore.get('active_project')?.value ?? null;

  if (!activeProjectId) {
    const projects = await getUserProjects();
    activeProjectId = projects[0]?.id ?? null;
  }

  const filter = (params.filter ?? 'all') as ExamplesFilterType;
  const sort = (params.sort ?? 'newest') as ExamplesSortType;
  const page = parseInt(params.page ?? '1', 10);

  const dataPromise = activeProjectId
    ? getExamplesList(activeProjectId, { filter, sort, page })
    : Promise.resolve({ examples: [], total: 0 });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Examples</h1>
        <p className="text-sm text-muted-foreground">
          Browse, edit, and manage all training examples in your dataset.
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
        <ExamplesTable
          key={`${activeProjectId}-${filter}-${sort}-${page}`}
          dataPromise={dataPromise}
          filter={filter}
          sort={sort}
          page={page}
        />
      </Suspense>
    </div>
  );
}
