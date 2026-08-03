import { optimizeViaLlm } from '../pollinations/textService.js';
import { detectStyle, buildOptimizeSystemPrompt } from './stylePresets.js';
import { warn } from '../../utils/logger.js';
import type { AuthConfig } from '../pollinations/client.js';

export interface OptimizeResult {
  optimizedPrompt: string;
  originalPrompt: string;
  originalWords: number;
  optimizedWords: number;
  compressionRatio: number;
  style: string;
  optimizationFailed?: boolean;
}

export async function optimizePrompt(
  prompt: string,
  style: string = 'auto',
  targetWords: number = 30,
  authConfig: AuthConfig | null = null
): Promise<OptimizeResult> {
  const actualStyle = style === 'auto' ? detectStyle(prompt) : style;
  const system = buildOptimizeSystemPrompt(actualStyle, targetWords);
  const originalWords = countWords(prompt);

  try {
    const optimized = await optimizeViaLlm({ prompt, system, authConfig });
    const optimizedWords = countWords(optimized);
    const compressionRatio = originalWords > 0 ? optimizedWords / originalWords : 1;

    return {
      optimizedPrompt: optimized,
      originalPrompt: prompt,
      originalWords,
      optimizedWords,
      compressionRatio: Math.round(compressionRatio * 100) / 100,
      style: actualStyle,
    };
  } catch (error) {
    warn(`Prompt optimization failed (external API error): ${error instanceof Error ? error.message : String(error)}`);
    return {
      optimizedPrompt: prompt,
      originalPrompt: prompt,
      originalWords,
      optimizedWords: originalWords,
      compressionRatio: 1,
      style: actualStyle,
      optimizationFailed: true,
    };
  }
}

export function shouldOptimize(prompt: string, threshold: number = 40): boolean {
  if (countWords(prompt) > threshold) return true;
  const compactCjk = prompt.match(/[\u3400-\u9fff]/g)?.length || 0;
  return compactCjk > 60;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
