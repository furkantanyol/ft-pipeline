'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Zap, ShieldCheck, Loader2, DollarSign, Clock } from 'lucide-react';
import type { TrainingConfig } from '@/app/(app)/train/actions';
import { updateTrainingConfig } from '@/app/(app)/train/actions';
import { estimateTrainingCost, estimateTrainingDuration } from '@/lib/training-utils';
import { useRouter } from 'next/navigation';

type TrainingConfigEditorProps = {
  projectId: string;
  initialConfig: TrainingConfig;
  trainCount: number;
  valCount: number;
};

const PRESETS: Record<string, { label: string; config: TrainingConfig; description: string }> = {
  conservative: {
    label: 'Conservative',
    description: 'Safe defaults for most use cases',
    config: {
      epochs: 3,
      batch_size: 4,
      learning_rate: 0.00001,
      lora_r: 16,
      lora_alpha: 32,
      lora_dropout: 0.05,
    },
  },
  aggressive: {
    label: 'Aggressive',
    description: 'Higher learning rate, more epochs',
    config: {
      epochs: 5,
      batch_size: 8,
      learning_rate: 0.0001,
      lora_r: 32,
      lora_alpha: 64,
      lora_dropout: 0.1,
    },
  },
};

export function TrainingConfigEditor({
  projectId,
  initialConfig,
  trainCount,
  valCount,
}: TrainingConfigEditorProps) {
  const router = useRouter();
  const [config, setConfig] = useState<TrainingConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const cost = estimateTrainingCost(trainCount, valCount, config);
  const duration = estimateTrainingDuration(trainCount, config);

  const handleConfigChange = useCallback((field: keyof TrainingConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSaveError(null);
  }, []);

  const applyPreset = useCallback((presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setConfig(preset.config);
      setHasChanges(true);
      setSaveError(null);
    }
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    const result = await updateTrainingConfig(projectId, config);

    setIsSaving(false);

    if (result.success) {
      setHasChanges(false);
      router.refresh();
    } else {
      setSaveError(result.error ?? 'Failed to save config');
    }
  }, [projectId, config, router]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Training Configuration</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => applyPreset('conservative')}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Conservative
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset('aggressive')}>
                <Zap className="mr-2 h-4 w-4" />
                Aggressive
              </Button>
            </div>
          </div>
          <CardDescription>
            Adjust hyperparameters for fine-tuning. Changes affect cost and duration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic params */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="epochs">Epochs</Label>
              <Input
                id="epochs"
                type="number"
                min={1}
                max={10}
                value={config.epochs}
                onChange={(e) => handleConfigChange('epochs', parseInt(e.target.value, 10))}
              />
              <p className="text-xs text-muted-foreground">Number of training passes (1-10)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch_size">Batch Size</Label>
              <Input
                id="batch_size"
                type="number"
                min={1}
                max={32}
                value={config.batch_size}
                onChange={(e) => handleConfigChange('batch_size', parseInt(e.target.value, 10))}
              />
              <p className="text-xs text-muted-foreground">Examples per gradient update</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="learning_rate">Learning Rate</Label>
              <Input
                id="learning_rate"
                type="number"
                step={0.000001}
                min={0.000001}
                max={0.001}
                value={config.learning_rate}
                onChange={(e) => handleConfigChange('learning_rate', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Step size for weight updates</p>
            </div>
          </div>

          {/* LoRA params */}
          <div>
            <h4 className="mb-3 text-sm font-medium">LoRA Parameters</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="lora_r">LoRA Rank (r)</Label>
                <Input
                  id="lora_r"
                  type="number"
                  min={4}
                  max={128}
                  step={4}
                  value={config.lora_r}
                  onChange={(e) => handleConfigChange('lora_r', parseInt(e.target.value, 10))}
                />
                <p className="text-xs text-muted-foreground">Low-rank dimension (4-128)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lora_alpha">LoRA Alpha</Label>
                <Input
                  id="lora_alpha"
                  type="number"
                  min={4}
                  max={128}
                  step={4}
                  value={config.lora_alpha}
                  onChange={(e) => handleConfigChange('lora_alpha', parseInt(e.target.value, 10))}
                />
                <p className="text-xs text-muted-foreground">Scaling factor (typically 2× rank)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lora_dropout">LoRA Dropout</Label>
                <Input
                  id="lora_dropout"
                  type="number"
                  step={0.01}
                  min={0}
                  max={0.5}
                  value={config.lora_dropout}
                  onChange={(e) => handleConfigChange('lora_dropout', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Dropout probability (0-0.5)</p>
              </div>
            </div>
          </div>

          {/* Live estimates */}
          <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">${cost.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">estimated cost</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{duration}</span>
              <span className="text-xs text-muted-foreground">estimated duration</span>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center justify-between">
            <div>
              {hasChanges && (
                <Badge variant="secondary" className="text-xs">
                  Unsaved changes
                </Badge>
              )}
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            </div>
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
