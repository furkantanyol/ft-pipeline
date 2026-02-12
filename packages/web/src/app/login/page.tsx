"use client";

import { useState } from "react";
import { signInWithMagicLink } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const result = await signInWithMagicLink(email);

    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    setSent(true);
    setPending(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-light tracking-tight text-foreground">
            aitelier
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fine-tuning dataset curation
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>
              Enter your email to receive a magic link
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Check your email for the login link.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sent to{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                  }}
                >
                  Try a different email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Sending..." : "Send Magic Link"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
