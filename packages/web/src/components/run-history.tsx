'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrainingRunRow } from '@/app/(app)/train/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, XCircle, Loader2, Clock, AlertCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

type RunHistoryProps = {
  runs: TrainingRunRow[];
};

type SortField = 'version' | 'status' | 'count' | 'duration' | 'cost' | 'eval' | 'date';

type SortableHeaderProps = {
  field: SortField;
  children: React.ReactNode;
  currentField: SortField;
  direction: 'asc' | 'desc';
  onSort: (field: SortField) => void;
};

function SortableHeader({ field, children, currentField, direction, onSort }: SortableHeaderProps) {
  return (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {currentField === field && (
          <span className="text-xs">{direction === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </TableHead>
  );
}

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-muted-foreground',
  },
  uploading: {
    label: 'Uploading',
    icon: Loader2,
    variant: 'secondary' as const,
    color: 'text-blue-500',
  },
  queued: {
    label: 'Queued',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-yellow-500',
  },
  training: {
    label: 'Training',
    icon: Loader2,
    variant: 'default' as const,
    color: 'text-blue-500',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    variant: 'default' as const,
    color: 'text-green-500',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    variant: 'destructive' as const,
    color: 'text-destructive',
  },
  cancelled: {
    label: 'Cancelled',
    icon: AlertCircle,
    variant: 'outline' as const,
    color: 'text-muted-foreground',
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '-';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatCost(cost: number | null): string {
  if (cost === null) return '-';
  return `$${cost.toFixed(2)}`;
}

function formatEvalScore(score: number | null): string {
  if (score === null) return '-';
  return score.toFixed(1);
}

export function RunHistory({ runs }: RunHistoryProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('version');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedRuns = [...runs].sort((a, b) => {
    let aVal: number | string | null;
    let bVal: number | string | null;

    switch (sortField) {
      case 'version':
        aVal = a.version;
        bVal = b.version;
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'count':
        aVal = a.example_count;
        bVal = b.example_count;
        break;
      case 'duration':
        aVal = a.duration ?? -1;
        bVal = b.duration ?? -1;
        break;
      case 'cost':
        aVal = a.cost_actual ?? a.cost_estimate ?? -1;
        bVal = b.cost_actual ?? b.cost_estimate ?? -1;
        break;
      case 'eval':
        aVal = a.eval_score ?? -1;
        bVal = b.eval_score ?? -1;
        break;
      case 'date':
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
        break;
      default:
        aVal = 0;
        bVal = 0;
    }

    if (aVal === null) aVal = -1;
    if (bVal === null) bVal = -1;

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleCopyModelId = async (modelId: string, runId: string) => {
    try {
      await navigator.clipboard.writeText(modelId);
      setCopiedId(runId);
      toast.success('Model ID copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy model ID');
    }
  };

  if (runs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Training Run History</CardTitle>
          <CardDescription>View and manage all training runs for this project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No training runs yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start your first training run to see it here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Run History</CardTitle>
        <CardDescription>
          {runs.length} {runs.length === 1 ? 'run' : 'runs'} • Click any row to view details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader
                  field="version"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Version
                </SortableHeader>
                <SortableHeader
                  field="status"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Status
                </SortableHeader>
                <TableHead>Model</TableHead>
                <SortableHeader
                  field="count"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Examples
                </SortableHeader>
                <SortableHeader
                  field="duration"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Duration
                </SortableHeader>
                <SortableHeader
                  field="cost"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Cost
                </SortableHeader>
                <SortableHeader
                  field="eval"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Eval Score
                </SortableHeader>
                <SortableHeader
                  field="date"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Date
                </SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRuns.map((run) => {
                const config =
                  statusConfig[run.status as keyof typeof statusConfig] ?? statusConfig.pending;
                const Icon = config.icon;
                const isActive = run.status === 'training' || run.status === 'uploading';

                return (
                  <TableRow
                    key={run.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/train/${run.id}`)}
                  >
                    <TableCell className="font-medium">v{run.version}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon
                          className={`h-3.5 w-3.5 ${config.color} ${isActive ? 'animate-spin' : ''}`}
                        />
                        <Badge variant={config.variant} className="text-xs">
                          {config.label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {run.model_id ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="max-w-[200px] truncate text-xs font-mono"
                            title={run.model_id}
                          >
                            {run.model_id}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyModelId(run.model_id!, run.id);
                            }}
                          >
                            {copiedId === run.id ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{run.example_count}</TableCell>
                    <TableCell className="text-sm">{formatDuration(run.duration)}</TableCell>
                    <TableCell className="text-sm">
                      {formatCost(run.cost_actual ?? run.cost_estimate)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {run.eval_score !== null ? (
                        <span
                          className={
                            run.eval_score >= 8
                              ? 'text-green-500 font-medium'
                              : run.eval_score >= 6
                                ? 'text-yellow-500'
                                : 'text-destructive'
                          }
                        >
                          {formatEvalScore(run.eval_score)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(run.created_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
