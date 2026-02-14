'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { validateApiKey, fetchModels, saveProject } from '@/app/(app)/setup/actions';
import { Check, Loader2, ArrowRight, ArrowLeft, X, ChevronDown, Trash2 } from 'lucide-react';

export type WizardData = {
  name: string;
  description: string;
  provider: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  trainingConfig: {
    epochs: number;
    batch_size: number;
    learning_rate: number;
    lora_r: number;
    lora_alpha: number;
    lora_dropout: number;
  };
  invites: Array<{ email: string; role: 'trainer' | 'rater' }>;
};

type ModelOption = {
  id: string;
  display_name: string;
  context_length: number;
  recommended: boolean;
};

const DEFAULT_TRAINING_CONFIG = {
  epochs: 3,
  batch_size: 4,
  learning_rate: 0.00001,
  lora_r: 16,
  lora_alpha: 32,
  lora_dropout: 0.05,
};

const PROMPT_TEMPLATES = [
  {
    label: 'Customer Support',
    prompt:
      'You are a helpful customer support agent. Respond to customer inquiries professionally, empathetically, and concisely. Always try to resolve the issue or escalate appropriately.',
  },
  {
    label: 'Code Review',
    prompt:
      'You are an expert code reviewer. Analyze the provided code for bugs, performance issues, and style problems. Suggest specific improvements with code examples.',
  },
  {
    label: 'Creative Writing',
    prompt:
      'You are a creative writing assistant. Help users craft engaging, well-structured prose with vivid descriptions and natural dialogue. Match the requested tone and style.',
  },
  {
    label: 'Domain Q&A',
    prompt:
      'You are a knowledgeable domain expert. Answer questions accurately and thoroughly, citing relevant context. If unsure, say so rather than guessing.',
  },
];

const TOTAL_STEPS = 6;

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    name: '',
    description: '',
    provider: 'together',
    apiKey: '',
    model: '',
    systemPrompt: '',
    trainingConfig: { ...DEFAULT_TRAINING_CONFIG },
    invites: [],
  });

  // Step 2 state
  const [keyStatus, setKeyStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [keyError, setKeyError] = useState<string | null>(null);

  // Step 3 state
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Step 5 state
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Step 6 state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'trainer' | 'rater'>('rater');

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function canProceed() {
    switch (step) {
      case 1:
        return data.name.trim().length > 0;
      case 2:
        return keyStatus === 'valid';
      case 3:
        return data.model.length > 0;
      case 4:
        return true; // System prompt is optional
      case 5:
        return true; // Config has defaults
      case 6:
        return true; // Invites are optional
      default:
        return false;
    }
  }

  async function handleTestConnection() {
    setKeyStatus('testing');
    setKeyError(null);

    const result = await validateApiKey(data.apiKey);

    if (result.valid) {
      setKeyStatus('valid');
      setModelsLoading(true);
      const modelsResult = await fetchModels(data.apiKey);
      setModels(modelsResult.models);
      setModelsError(modelsResult.error ?? null);
      setModelsLoading(false);
    } else {
      setKeyStatus('invalid');
      setKeyError(result.error ?? 'Invalid API key');
    }
  }

  function handleNext() {
    if (step < TOTAL_STEPS) setStep(step + 1);
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  function addInvite() {
    if (!inviteEmail.trim() || data.invites.some((i) => i.email === inviteEmail.trim())) return;
    setData({
      ...data,
      invites: [...data.invites, { email: inviteEmail.trim(), role: inviteRole }],
    });
    setInviteEmail('');
  }

  function removeInvite(email: string) {
    setData({
      ...data,
      invites: data.invites.filter((i) => i.email !== email),
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    const result = await saveProject({
      name: data.name,
      description: data.description,
      provider: data.provider,
      apiKey: data.apiKey,
      model: data.model,
      systemPrompt: data.systemPrompt,
      trainingConfig: data.trainingConfig,
      invites: data.invites,
    });

    if (result.error) {
      setSaveError(result.error);
      setSaving(false);
      return;
    }

    if (result.projectId) {
      document.cookie = `active_project=${result.projectId}; path=/; max-age=${60 * 60 * 24 * 365}`;
    }

    router.push('/dashboard');
  }

  // Rough cost estimate based on model size and epochs
  function estimateCost() {
    const modelId = data.model.toLowerCase();
    let pricePerEpoch = 0.5; // default $/epoch for small models
    if (modelId.includes('70b')) pricePerEpoch = 5;
    else if (modelId.includes('34b') || modelId.includes('32b')) pricePerEpoch = 3;
    else if (modelId.includes('13b') || modelId.includes('11b')) pricePerEpoch = 1.5;
    else if (modelId.includes('7b') || modelId.includes('8b')) pricePerEpoch = 0.8;
    return (pricePerEpoch * data.trainingConfig.epochs).toFixed(2);
  }

  return (
    <div className="mx-auto max-w-xl">
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : s < step
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {s < step ? <Check className="size-4" /> : s}
            </div>
            {s < TOTAL_STEPS && (
              <div className={`h-px w-8 ${s < step ? 'bg-primary/40' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Project basics</CardTitle>
            <CardDescription>Give your fine-tuning project a name</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project name</Label>
              <Input
                id="name"
                placeholder="e.g. Customer Support Bot"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="What will this model do?"
                value={data.description}
                onChange={(e) => setData({ ...data, description: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Provider & API Key */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Provider</CardTitle>
            <CardDescription>Connect to your fine-tuning provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <div className="flex gap-2">
                <Button
                  variant={data.provider === 'together' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setData({ ...data, provider: 'together' })}
                >
                  Together.ai
                </Button>
                <Button variant="outline" className="flex-1" disabled>
                  OpenAI
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Soon
                  </Badge>
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API key</Label>
              <div className="flex gap-2">
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your Together.ai API key"
                  value={data.apiKey}
                  onChange={(e) => {
                    setData({ ...data, apiKey: e.target.value });
                    setKeyStatus('idle');
                    setKeyError(null);
                  }}
                />
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={!data.apiKey.trim() || keyStatus === 'testing'}
                >
                  {keyStatus === 'testing' ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : keyStatus === 'valid' ? (
                    <Check className="size-4 text-green-500" />
                  ) : keyStatus === 'invalid' ? (
                    <X className="size-4 text-destructive" />
                  ) : (
                    'Test'
                  )}
                </Button>
              </div>
              {keyStatus === 'valid' && (
                <p className="text-sm text-green-500">Connected successfully</p>
              )}
              {keyError && <p className="text-sm text-destructive">{keyError}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Model */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Base model</CardTitle>
            <CardDescription>Choose the model to fine-tune</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {modelsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading models...</span>
              </div>
            ) : modelsError ? (
              <p className="text-sm text-destructive">{modelsError}</p>
            ) : (
              <div className="space-y-2">
                <Label>Model</Label>
                <Select
                  value={data.model}
                  onValueChange={(value) => setData({ ...data, model: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <span>{model.display_name}</span>
                          {model.recommended && (
                            <Badge variant="secondary" className="text-xs">
                              Recommended
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {data.model && <p className="text-xs text-muted-foreground">{data.model}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: System Prompt */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>System prompt</CardTitle>
            <CardDescription>
              Define how your model should behave. This is prepended to every training example.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {PROMPT_TEMPLATES.map((t) => (
                <Button
                  key={t.label}
                  variant={data.systemPrompt === t.prompt ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setData({ ...data, systemPrompt: t.prompt })}
                >
                  {t.label}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">
                Prompt <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="systemPrompt"
                placeholder="You are a helpful assistant that..."
                value={data.systemPrompt}
                onChange={(e) => setData({ ...data, systemPrompt: e.target.value })}
                rows={6}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Training Config */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Training config</CardTitle>
            <CardDescription>
              Defaults work well for most projects. Adjust if you know what you&apos;re doing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="epochs">Epochs</Label>
                <Input
                  id="epochs"
                  type="number"
                  min={1}
                  max={20}
                  value={data.trainingConfig.epochs}
                  onChange={(e) =>
                    setData({
                      ...data,
                      trainingConfig: {
                        ...data.trainingConfig,
                        epochs: parseInt(e.target.value) || 3,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batchSize">Batch size</Label>
                <Input
                  id="batchSize"
                  type="number"
                  min={1}
                  max={32}
                  value={data.trainingConfig.batch_size}
                  onChange={(e) =>
                    setData({
                      ...data,
                      trainingConfig: {
                        ...data.trainingConfig,
                        batch_size: parseInt(e.target.value) || 4,
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lr">Learning rate</Label>
              <Input
                id="lr"
                type="number"
                step={0.000001}
                min={0}
                value={data.trainingConfig.learning_rate}
                onChange={(e) =>
                  setData({
                    ...data,
                    trainingConfig: {
                      ...data.trainingConfig,
                      learning_rate: parseFloat(e.target.value) || 0.00001,
                    },
                  })
                }
              />
            </div>

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 px-0">
                  <ChevronDown
                    className={`size-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                  />
                  Advanced LoRA settings
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="loraR">LoRA r</Label>
                    <Input
                      id="loraR"
                      type="number"
                      min={1}
                      value={data.trainingConfig.lora_r}
                      onChange={(e) =>
                        setData({
                          ...data,
                          trainingConfig: {
                            ...data.trainingConfig,
                            lora_r: parseInt(e.target.value) || 16,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loraAlpha">LoRA alpha</Label>
                    <Input
                      id="loraAlpha"
                      type="number"
                      min={1}
                      value={data.trainingConfig.lora_alpha}
                      onChange={(e) =>
                        setData({
                          ...data,
                          trainingConfig: {
                            ...data.trainingConfig,
                            lora_alpha: parseInt(e.target.value) || 32,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loraDropout">Dropout</Label>
                    <Input
                      id="loraDropout"
                      type="number"
                      step={0.01}
                      min={0}
                      max={1}
                      value={data.trainingConfig.lora_dropout}
                      onChange={(e) =>
                        setData({
                          ...data,
                          trainingConfig: {
                            ...data.trainingConfig,
                            lora_dropout: parseFloat(e.target.value) || 0.05,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="rounded-md border border-border bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                Estimated cost:{' '}
                <span className="font-medium text-foreground">~${estimateCost()}</span> per training
                run
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Invite Team */}
      {step === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>Invite team</CardTitle>
            <CardDescription>
              Add collaborators to rate examples and review training. You can skip this and invite
              people later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="teammate@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addInvite();
                  }
                }}
              />
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as 'trainer' | 'rater')}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rater">Rater</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={addInvite} disabled={!inviteEmail.trim()}>
                Add
              </Button>
            </div>

            {data.invites.length > 0 && (
              <div className="space-y-2">
                {data.invites.map((invite) => (
                  <div
                    key={invite.email}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{invite.email}</span>
                      <Badge variant="secondary" className="text-xs">
                        {invite.role}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeInvite(invite.email)}>
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {data.invites.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No invites yet. You can always add team members later in Settings.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={handleBack} disabled={step === 1}>
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
        {step < TOTAL_STEPS ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next
            <ArrowRight className="ml-2 size-4" />
          </Button>
        ) : (
          <div className="space-y-1 text-right">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {saving ? 'Creating...' : 'Create Project'}
            </Button>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
