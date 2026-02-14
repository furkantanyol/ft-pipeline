"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { rateExample } from "@/app/(app)/rate/actions";

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

  const handleRate = async (rating: number) => {
    setSaving(true);
    const result = await rateExample(example.id, rating);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    onRated(rating);
  };

  const handleSkip = () => {
    onRated(null);
  };

  return (
    <div className="space-y-4">
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

      {/* Rating controls */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Quick buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={() => handleRate(3)}
              disabled={saving}
            >
              Bad (1-4)
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300"
              onClick={() => handleRate(6)}
              disabled={saving}
            >
              Okay (5-7)
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
              onClick={() => handleRate(9)}
              disabled={saving}
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
            />
            <span className="text-xs text-muted-foreground">10</span>
            <span className="w-8 text-center text-sm font-medium tabular-nums">
              {sliderValue}
            </span>
            <Button
              size="sm"
              onClick={() => handleRate(sliderValue)}
              disabled={saving}
            >
              Rate
            </Button>
          </div>

          {/* Skip */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={saving}
              className="text-muted-foreground"
            >
              Skip
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
