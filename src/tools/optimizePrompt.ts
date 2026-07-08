import { optimizePrompt } from '../services/optimizer/promptOptimizer.js';
import type { AuthConfig } from '../services/pollinations/client.js';

export async function handleOptimizePrompt(
  args: Record<string, unknown>,
  authConfig: AuthConfig | null
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const prompt = String(args.prompt || '').trim();
  if (!prompt) {
    return { content: [{ type: 'text', text: 'Error: prompt is required and must be a non-empty string.' }], isError: true };
  }
  const style = String(args.style || 'auto');
  const targetWords = args.targetWords ? Number(args.targetWords) : 30;

  const result = await optimizePrompt(prompt, style, targetWords, authConfig);

  const text = `Optimized prompt (${result.style} style, ${result.originalWords}→${result.optimizedWords} words, ${Math.round((1 - result.compressionRatio) * 100)}% reduction):

${result.optimizedPrompt}

---
Original (${result.originalWords} words): ${result.originalPrompt}`;

  return { content: [{ type: 'text', text }] };
}
