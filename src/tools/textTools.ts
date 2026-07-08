import { respondText } from '../services/pollinations/textService.js';
import { IMAGE_MODELS, TEXT_MODELS } from '../config/models.js';
import { DEFAULTS } from '../config/constants.js';
import type { AuthConfig } from '../services/pollinations/client.js';

export async function handleRespondText(
  args: Record<string, unknown>,
  authConfig: AuthConfig | null
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const prompt = String(args.prompt || '').trim();
  if (!prompt) {
    return { content: [{ type: 'text', text: 'Error: prompt is required and must be a non-empty string.' }], isError: true };
  }
  const result = await respondText({
    prompt: String(args.prompt || ''),
    system: args.system ? String(args.system) : '',
    temperature: args.temperature ? Number(args.temperature) : DEFAULTS.TEXT_TEMPERATURE,
    top_p: args.top_p ? Number(args.top_p) : DEFAULTS.TEXT_TOP_P,
    seed: args.seed ? Number(args.seed) : undefined,
    authConfig,
  });
  return { content: [{ type: 'text', text: result }] };
}

export async function handleListImageModels(): Promise<{ content: Array<{ type: string; text: string }> }> {
  const available = IMAGE_MODELS.filter(m => m.status === 'available');
  const unavailable = IMAGE_MODELS.filter(m => m.status === 'unavailable');
  let text = `Available image models (${available.length}):\n`;
  available.forEach(m => { text += `  - ${m.name}: ${m.bestFor}\n`; });
  text += `\nUnavailable (free tier):\n`;
  unavailable.forEach(m => { text += `  - ${m.name}: ${m.bestFor}\n`; });
  return { content: [{ type: 'text', text }] };
}

export async function handleListTextModels(): Promise<{ content: Array<{ type: string; text: string }> }> {
  let text = `Available text models (${TEXT_MODELS.length}):\n`;
  TEXT_MODELS.forEach(m => {
    text += `  - ${m.name}: ${m.description}\n`;
    text += `    aliases: ${m.aliases.join(', ')}\n`;
    text += `    reasoning: ${m.reasoning}, tools: ${m.tools}\n`;
  });
  return { content: [{ type: 'text', text }] };
}
