'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { rateExample } from '@/app/(app)/rate/actions';

type Example = {
  id: string;
  input: string;
  output: string;
};

type Props = {
  example: Example;
  onRated: (rating: number | null) => void;
};

export function RatingCard({ example, onRated }: Props) {
  const [sliderValue, setSliderValue] = useState(5);
  const [saving, setSaving] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteText, setRewriteText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleRate = useCallback(
    async (rating: number, rewrite?: string) => {
      setSaving(true);
      const result = await rateExample(example.id, rating, rewrite);
      setSaving(false);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      onRated(rating);
    },
    [example.id, onRated],
  );

  const handleSkip = useCallback(() => {
    onRated(null);
  }, [onRated]);

  const handleRewriteToggle = useCallback(() => {
    if (isRewriting) {
      setIsRewriting(false);
      setRewriteText('');
    } else {
      setIsRewriting(true);
      setRewriteText(example.output);
    }
  }, [isRewriting, example.output]);

  const handleSaveRewrite = useCallback(() => {
    if (!rewriteText.trim()) {
      toast.error('Rewrite cannot be empty');
      return;
    }
    handleRate(sliderValue, rewriteText);
  }, [rewriteText, sliderValue, handleRate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in textarea
      if (e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Number keys 1-0 for ratings (0 = 10)
      if (e.key >= '1' && e.key <= '9' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const rating = parseInt(e.key);
        handleRate(rating);
        return;
      }
      if (e.key === '0' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleRate(10);
        return;
      }

      // 'r' for rewrite
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey && !isRewriting) {
        e.preventDefault();
        handleRewriteToggle();
        return;
      }

      // 's' for skip
      if (e.key === 's' && !e.metaKey && !e.ctrlKey && !isRewriting) {
        e.preventDefault();
        handleSkip();
        return;
      }

      // Arrow right for next (after rating, same as skip)
      if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey && !isRewriting) {
        e.preventDefault();
        handleSkip();
        return;
      }

      // Escape to cancel rewrite
      if (e.key === 'Escape' && isRewriting) {
        e.preventDefault();
        setIsRewriting(false);
        setRewriteText('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRewriting, handleRate, handleSkip, handleRewriteToggle]);

  // Focus textarea when rewrite mode is activated
  useEffect(() => {
    if (isRewriting && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isRewriting]);

  return (
    <motion.div
      key={example.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Example card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            What the AI saw
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
            {example.input}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            What the AI said
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
            {example.output}
          </pre>
        </CardContent>
      </Card>

      {/* Rewrite panel (slide up animation) */}
      <AnimatePresence>
        {isRewriting && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-primary/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-primary">Rewrite Output</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  ref={textareaRef}
                  value={rewriteText}
                  onChange={(e) => setRewriteText(e.target.value)}
                  className="min-h-[120px] font-mono text-sm"
                  placeholder="Edit the output..."
                  disabled={saving}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={handleRewriteToggle} disabled={saving}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveRewrite}
                    disabled={saving || !rewriteText.trim()}
                  >
                    Save Rewrite
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating controls */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Quick buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={() => handleRate(3)}
              disabled={saving || isRewriting}
            >
              Bad (1-4)
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300"
              onClick={() => handleRate(6)}
              disabled={saving || isRewriting}
            >
              Okay (5-7)
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
              onClick={() => handleRate(9)}
              disabled={saving || isRewriting}
            >
              Great (8-10)
            </Button>
          </div>

          {/* Precise slider */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">1</span>
            <Slider
              value={[sliderValue]}
              onValueChange={([v]) => setSliderValue(v)}
              min={1}
              max={10}
              step={1}
              className="flex-1"
              disabled={saving || isRewriting}
            />
            <span className="text-xs text-muted-foreground">10</span>
            <span className="w-8 text-center text-sm font-medium tabular-nums">{sliderValue}</span>
            <Button
              size="sm"
              onClick={() => handleRate(sliderValue)}
              disabled={saving || isRewriting}
            >
              Rate
            </Button>
          </div>

          {/* Actions row */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handleRewriteToggle} disabled={saving}>
              {isRewriting ? 'Cancel Rewrite' : 'Rewrite'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={saving || isRewriting}
              className="text-muted-foreground"
            >
              Skip
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard shortcuts legend */}
      <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <div>
            <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground/80">
              1-0
            </kbd>{' '}
            Quick rate
          </div>
          <div>
            <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground/80">
              R
            </kbd>{' '}
            Rewrite
          </div>
          <div>
            <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground/80">
              S
            </kbd>{' '}
            Skip
          </div>
          <div>
            <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground/80">
              →
            </kbd>{' '}
            Next
          </div>
        </div>
      </div>
    </motion.div>
  );
}
