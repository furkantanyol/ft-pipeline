'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Shuffle, Lock, Unlock, Database, Split, TrendingUp } from 'lucide-react';
import type { SplitData } from '@/app/(app)/train/actions';
import { autoSplit, unlockValidationSet } from '@/app/(app)/train/actions';
import { useRouter } from 'next/navigation';

type SplitManagerProps = {
  projectId: string;
  data: SplitData;
};

export function SplitManager({ projectId, data }: SplitManagerProps) {
  const router = useRouter();
  const [isAutoSplitting, setIsAutoSplitting] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleAutoSplit = useCallback(async () => {
    setIsAutoSplitting(true);
    try {
      const result = await autoSplit(projectId, 0.8);
      if (result.success) {
        router.refresh();
      } else {
        console.error('Auto-split failed:', result.error);
      }
    } catch (error) {
      console.error('Auto-split error:', error);
    } finally {
      setIsAutoSplitting(false);
    }
  }, [projectId, router]);

  const handleUnlockVal = useCallback(async () => {
    setIsUnlocking(true);
    try {
      const result = await unlockValidationSet(projectId);
      if (result.success) {
        setShowUnlockDialog(false);
        router.refresh();
      } else {
        console.error('Unlock failed:', result.error);
      }
    } catch (error) {
      console.error('Unlock error:', error);
    } finally {
      setIsUnlocking(false);
    }
  }, [projectId, router]);

  const formatRating = (rating: number | null) => {
    if (rating === null) return 'N/A';
    return rating.toFixed(1);
  };

  const totalExamples = data.unassigned.length + data.train.length + data.val.length;

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Split Management</CardTitle>
              <CardDescription>Manage train/validation splits for your examples</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {data.isValLocked && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUnlockDialog(true)}
                  className="gap-2"
                >
                  <Unlock className="h-4 w-4" />
                  Unlock Validation
                </Button>
              )}
              <Button
                onClick={handleAutoSplit}
                disabled={isAutoSplitting || totalExamples === 0}
                className="gap-2"
              >
                <Shuffle className="h-4 w-4" />
                {isAutoSplitting ? 'Splitting...' : 'Auto-Split (80/20)'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Split overview cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Unassigned */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
              </div>
              <Badge variant="secondary">{data.unassigned.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Rating</span>
                <span className="font-medium">{formatRating(data.stats.unassignedAvgRating)}</span>
              </div>
              {totalExamples > 0 && (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-zinc-400"
                      style={{
                        width: `${(data.unassigned.length / totalExamples) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {((data.unassigned.length / totalExamples) * 100).toFixed(0)}% of total
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Train */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Split className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm font-medium">Training</CardTitle>
              </div>
              <Badge variant="default">{data.train.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Rating</span>
                <span className="font-medium">{formatRating(data.stats.trainAvgRating)}</span>
              </div>
              {totalExamples > 0 && (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(data.train.length / totalExamples) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {((data.train.length / totalExamples) * 100).toFixed(0)}% of total
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Validation */}
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <CardTitle className="text-sm font-medium">Validation</CardTitle>
                {data.isValLocked && <Lock className="h-3 w-3 text-green-500" />}
              </div>
              <Badge variant="default" className="bg-green-600">
                {data.val.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Rating</span>
                <span className="font-medium">{formatRating(data.stats.valAvgRating)}</span>
              </div>
              {totalExamples > 0 && (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${(data.val.length / totalExamples) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {((data.val.length / totalExamples) * 100).toFixed(0)}% of total
                  </p>
                </div>
              )}
              {data.isValLocked && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Locked - val set won&apos;t change on auto-split
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Split quality indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Split Quality</CardTitle>
          <CardDescription>Quality indicators for your train/validation splits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                  <Split className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Training Split</p>
                  <p className="text-xs text-muted-foreground">{data.train.length} examples</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatRating(data.stats.trainAvgRating)}</p>
                <p className="text-xs text-muted-foreground">avg rating</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Validation Split</p>
                  <p className="text-xs text-muted-foreground">{data.val.length} examples</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatRating(data.stats.valAvgRating)}</p>
                <p className="text-xs text-muted-foreground">avg rating</p>
              </div>
            </div>

            {data.unassigned.length > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/10">
                    <Database className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Unassigned</p>
                    <p className="text-xs text-muted-foreground">
                      {data.unassigned.length} examples not in any split
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatRating(data.stats.unassignedAvgRating)}
                  </p>
                  <p className="text-xs text-muted-foreground">avg rating</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unlock validation dialog */}
      <AlertDialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock Validation Set?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move all {data.val.length} validation examples back to unassigned. The next
              auto-split will create a new validation set. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnlocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlockVal} disabled={isUnlocking}>
              {isUnlocking ? 'Unlocking...' : 'Unlock Validation Set'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
