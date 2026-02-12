"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TOGETHER_API_BASE = "https://api.together.xyz/v1";

export async function validateApiKey(apiKey: string) {
  try {
    const response = await fetch(`${TOGETHER_API_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return { valid: false, error: "Invalid API key" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Failed to connect to Together.ai" };
  }
}

export type TogetherModel = {
  id: string;
  display_name: string;
  context_length: number;
};

const RECOMMENDED_MODELS = [
  "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo",
  "mistralai/Mistral-7B-Instruct-v0.3",
];

export async function fetchModels(apiKey: string) {
  try {
    const response = await fetch(`${TOGETHER_API_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return { models: [], error: "Failed to fetch models" };
    }

    const data = (await response.json()) as TogetherModel[];

    // Filter to chat/instruct models and sort recommended first
    const chatModels = data
      .filter(
        (m) =>
          m.id.includes("Instruct") ||
          m.id.includes("chat") ||
          m.id.includes("Chat"),
      )
      .map((m) => ({
        id: m.id,
        display_name: m.display_name || m.id.split("/").pop() || m.id,
        context_length: m.context_length,
        recommended: RECOMMENDED_MODELS.includes(m.id),
      }))
      .sort((a, b) => {
        if (a.recommended && !b.recommended) return -1;
        if (!a.recommended && b.recommended) return 1;
        return a.display_name.localeCompare(b.display_name);
      });

    return { models: chatModels };
  } catch {
    return { models: [], error: "Failed to connect to Together.ai" };
  }
}

type SaveProjectInput = {
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
  invites: Array<{ email: string; role: "trainer" | "rater" }>;
};

export async function saveProject(input: SaveProjectInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Insert project (RLS: any authenticated user where created_by = auth.uid())
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: input.name,
      system_prompt: input.systemPrompt || null,
      provider: input.provider,
      base_model: input.model,
      provider_config: { api_key: input.apiKey },
      training_config: input.trainingConfig,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    return { error: projectError?.message ?? "Failed to create project" };
  }

  // Add creator as owner (RLS: user can add themselves as owner)
  const { error: memberError } = await supabase
    .from("project_members")
    .insert({
      project_id: project.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    return { error: memberError.message };
  }

  // Send invites (best-effort — needs admin client for auth.admin API)
  if (input.invites.length > 0) {
    const admin = createAdminClient();
    for (const invite of input.invites) {
      const { data: inviteData } = await admin.auth.admin.inviteUserByEmail(
        invite.email,
      );

      if (inviteData?.user) {
        await admin.from("project_members").insert({
          project_id: project.id,
          user_id: inviteData.user.id,
          role: invite.role,
        });
      }
    }
  }

  return { projectId: project.id };
}
