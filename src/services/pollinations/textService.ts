import { fetchWithAuth, type AuthConfig } from './client.js';
import { DEFAULTS } from '../../config/constants.js';

export interface RespondTextOptions {
  prompt: string;
  system?: string;
  temperature?: number;
  top_p?: number;
  seed?: number;
  model?: string;
  authConfig?: AuthConfig | null;
}

export async function respondText(opts: RespondTextOptions): Promise<string> {
  const {
    prompt,
    system = '',
    temperature = DEFAULTS.TEXT_TEMPERATURE,
    top_p = DEFAULTS.TEXT_TOP_P,
    seed,
    model = DEFAULTS.TEXT_MODEL,
    authConfig = null,
  } = opts;

  // 用 OpenAI 兼容格式 POST
  const messages: Array<{ role: string; content: string }> = [];
  if (system) {
    messages.push({ role: 'system', content: system });
  }
  messages.push({ role: 'user', content: prompt });

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    top_p,
  };
  if (seed !== undefined) body.seed = seed;

  const response = await fetchWithAuth('https://text.pollinations.ai/openai', authConfig, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Unexpected text API response format');
  }
  return content;
}

export interface OptimizeViaLlmOptions {
  prompt: string;
  system: string;
  model?: string;
  authConfig?: AuthConfig | null;
}

export async function optimizeViaLlm(opts: OptimizeViaLlmOptions): Promise<string> {
  const result = await respondText({
    prompt: opts.prompt,
    system: opts.system,
    model: opts.model || DEFAULTS.TEXT_MODEL,
    temperature: 0.3,
    top_p: 0.9,
    authConfig: opts.authConfig,
  });
  return result.trim();
}
