'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateExample, deleteExample } from '@/app/(app)/examples/actions';

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

type ExampleDetailDialogProps = {
  example: Example | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
};

function RatingBadge({ rating }: { rating: number | null }) {
  if (rating === null) return <Badge variant="outline">Unrated</Badge>;
  if (rating >= 8) return <Badge className="bg-green-500/15 text-green-500">{rating}/10</Badge>;
  if (rating >= 5) return <Badge className="bg-yellow-500/15 text-yellow-500">{rating}/10</Badge>;
  return <Badge className="bg-red-500/15 text-red-500">{rating}/10</Badge>;
}

function SplitBadge({ split }: { split: string | null }) {
  if (!split) return <Badge variant="outline">Unassigned</Badge>;
  if (split === 'train') return <Badge className="bg-blue-500/15 text-blue-500">Train</Badge>;
  return <Badge className="bg-purple-500/15 text-purple-500">Val</Badge>;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ExampleDetailDialog({
  example,
  open,
  onOpenChange,
  onUpdated,
}: ExampleDetailDialogProps) {
  const [editing, setEditing] = useState(false);
  const [editInput, setEditInput] = useState('');
  const [editOutput, setEditOutput] = useState('');
  const [editRating, setEditRating] = useState('');
  const [isPending, startTransition] = useTransition();

  if (!example) return null;

  const handleEdit = () => {
    setEditInput(example.input);
    setEditOutput(example.output);
    setEditRating(example.rating?.toString() ?? '');
    setEditing(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      const updates: { input?: string; output?: string; rating?: number | null } = {};
      if (editInput !== example.input) updates.input = editInput;
      if (editOutput !== example.output) updates.output = editOutput;
      const newRating = editRating === '' ? null : parseInt(editRating, 10);
      if (newRating !== example.rating) updates.rating = newRating;

      if (Object.keys(updates).length === 0) {
        setEditing(false);
        return;
      }

      const result = await updateExample(example.id, updates);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Example updated');
        setEditing(false);
        onUpdated();
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteExample(example.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Example deleted');
        onOpenChange(false);
        onUpdated();
      }
    });
  };

  const handleCancel = () => {
    setEditing(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) setEditing(false);
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Example Details</DialogTitle>
          <DialogDescription>
            Created {formatDate(example.created_at)}
            {example.rated_at && ` · Rated ${formatDate(example.rated_at)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <RatingBadge
              rating={
                editing ? (editRating === '' ? null : parseInt(editRating, 10)) : example.rating
              }
            />
            <SplitBadge split={example.split} />
          </div>

          {editing ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Input</label>
                <Textarea
                  value={editInput}
                  onChange={(e) => setEditInput(e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Output</label>
                <Textarea
                  value={editOutput}
                  onChange={(e) => setEditOutput(e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rating (1-10)</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={editRating}
                  onChange={(e) => setEditRating(e.target.value)}
                  placeholder="Unrated"
                  className="w-24"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Input</label>
                <div className="rounded-md border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                  {example.input}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Output</label>
                <div className="rounded-md border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                  {example.output}
                </div>
              </div>
              {example.rewrite && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Rewrite</label>
                  <div className="rounded-md border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                    {example.rewrite}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isPending}>
                <Trash2 className="size-4 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete example?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the example.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={isPending}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isPending}>
                  {isPending ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Pencil className="size-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
