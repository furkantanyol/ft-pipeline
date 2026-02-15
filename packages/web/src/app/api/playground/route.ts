import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TOGETHER_API_BASE = 'https://api.together.xyz/v1';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { projectId, model, messages, temperature, maxTokens } = body;

    if (!projectId || !model || !messages) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Get project to access provider config
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('provider_config')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return new Response('Project not found', { status: 404 });
    }

    const providerConfig = project.provider_config as { api_key?: string };
    const apiKey = providerConfig.api_key;

    if (!apiKey) {
      return new Response('API key not configured', { status: 400 });
    }

    // Make streaming request to Together.ai
    const response = await fetch(`${TOGETHER_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens ?? 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(`Together.ai error: ${error}`, { status: response.status });
    }

    // Return the SSE stream
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Playground API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
