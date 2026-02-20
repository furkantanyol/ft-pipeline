'use client';

import { useState, useTransition, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { MoreHorizontal, Trash2, ChevronLeft, ChevronRight, Database } from 'lucide-react';
import { toast } from 'sonner';
import { deleteExample, deleteExamples, updateExamplesSplit } from '@/app/(app)/examples/actions';
import { ExampleDetailDialog } from '@/components/example-detail-dialog';
import { EmptyState } from '@/components/empty-state';
import type { ExamplesFilterType, ExamplesSortType } from '@/app/(app)/examples/actions';

type Example = {
  id: string;
  input: string;
  output: string;
  rating: number | null;
  rewrite: string | null;
  split: string | null;
  created_at: string;
  rated_at: string | null;
};

type ExamplesTableProps = {
  dataPromise: Promise<{ examples: Example[]; total: number; error?: string }>;
  filter: ExamplesFilterType;
  sort: ExamplesSortType;
  page: number;
};

function RatingBadge({ rating }: { rating: number | null }) {
  if (rating === null) return <Badge variant="outline">-</Badge>;
  if (rating >= 8) return <Badge className="bg-green-500/15 text-green-500">{rating}</Badge>;
  if (rating >= 5) return <Badge className="bg-yellow-500/15 text-yellow-500">{rating}</Badge>;
  return <Badge className="bg-red-500/15 text-red-500">{rating}</Badge>;
}

function SplitBadge({ split }: { split: string | null }) {
  if (!split) return null;
  if (split === 'train') return <Badge className="bg-blue-500/15 text-blue-500">Train</Badge>;
  return <Badge className="bg-purple-500/15 text-purple-500">Val</Badge>;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

const PAGE_SIZE = 50;

export function ExamplesTable({ dataPromise, filter, sort, page }: ExamplesTableProps) {
  const data = use(dataPromise);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailExample, setDetailExample] = useState<Example | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (data.error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">{data.error}</CardContent>
      </Card>
    );
  }

  const { examples, total } = data;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      params.set(key, value);
    }
    router.push(`/examples?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage.toString() });
  };

  const handleFilterChange = (newFilter: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('filter', newFilter);
    params.delete('page');
    router.push(`/examples?${params.toString()}`);
  };

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', newSort);
    params.delete('page');
    router.push(`/examples?${params.toString()}`);
  };

  const allSelected = examples.length > 0 && selected.size === examples.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(examples.map((e) => e.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const handleDeleteSingle = (id: string) => {
    setDeleteTarget(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteSingle = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteExample(deleteTarget);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Example deleted');
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget);
          return next;
        });
        router.refresh();
      }
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    });
  };

  const handleBulkDelete = () => {
    setBulkDeleteOpen(true);
  };

  const confirmBulkDelete = () => {
    startTransition(async () => {
      const result = await deleteExamples(Array.from(selected));
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${selected.size} examples deleted`);
        setSelected(new Set());
        router.refresh();
      }
      setBulkDeleteOpen(false);
    });
  };

  const handleBulkSplit = (split: 'train' | 'val' | null) => {
    startTransition(async () => {
      const result = await updateExamplesSplit(Array.from(selected), split);
      if (result.error) {
        toast.error(result.error);
      } else {
        const label = split ? `Moved to ${split}` : 'Split cleared';
        toast.success(`${selected.size} examples: ${label}`);
        setSelected(new Set());
        router.refresh();
      }
    });
  };

  const handleUpdated = () => {
    router.refresh();
  };

  if (examples.length === 0 && filter === 'all' && page === 1) {
    return (
      <>
        <div className="flex flex-wrap gap-3">
          <FilterControls
            filter={filter}
            sort={sort}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
          />
        </div>
        <EmptyState
          icon={Database}
          title="No examples yet"
          description="Add training examples to start building your dataset."
          action={{ label: 'Add Examples', href: '/add' }}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterControls
          filter={filter}
          sort={sort}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
        />
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? 'example' : 'examples'}
        </p>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => handleBulkSplit('train')}
            >
              Move to Train
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => handleBulkSplit('val')}
            >
              Move to Val
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => handleBulkSplit(null)}
            >
              Clear Split
            </Button>
            <Button size="sm" variant="destructive" disabled={isPending} onClick={handleBulkDelete}>
              <Trash2 className="size-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Input</TableHead>
              <TableHead>Output</TableHead>
              <TableHead className="w-20">Rating</TableHead>
              <TableHead className="w-20">Split</TableHead>
              <TableHead className="w-24">Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {examples.map((example) => (
              <TableRow
                key={example.id}
                className="cursor-pointer"
                onClick={() => setDetailExample(example)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(example.id)}
                    onCheckedChange={() => toggleOne(example.id)}
                    aria-label={`Select example`}
                  />
                </TableCell>
                <TableCell className="max-w-[250px]">
                  <span className="text-sm">{truncate(example.input, 60)}</span>
                </TableCell>
                <TableCell className="max-w-[250px]">
                  <span className="text-sm">{truncate(example.output, 60)}</span>
                </TableCell>
                <TableCell>
                  <RatingBadge rating={example.rating} />
                </TableCell>
                <TableCell>
                  <SplitBadge split={example.split} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(example.created_at)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDetailExample(example)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteSingle(example.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {start}–{end} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              <ChevronLeft className="size-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              Next
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <ExampleDetailDialog
        example={detailExample}
        open={detailExample !== null}
        onOpenChange={(open) => {
          if (!open) setDetailExample(null);
        }}
        onUpdated={handleUpdated}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete example?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSingle}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} examples?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All selected examples will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FilterControls({
  filter,
  sort,
  onFilterChange,
  onSortChange,
}: {
  filter: ExamplesFilterType;
  sort: ExamplesSortType;
  onFilterChange: (value: string) => void;
  onSortChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Filter:</label>
        <Select value={filter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="rated">Rated</SelectItem>
            <SelectItem value="unrated">Unrated</SelectItem>
            <SelectItem value="quality">Quality</SelectItem>
            <SelectItem value="train">Train</SelectItem>
            <SelectItem value="val">Val</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Sort:</label>
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="rating-asc">Rating (low to high)</SelectItem>
            <SelectItem value="rating-desc">Rating (high to low)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
