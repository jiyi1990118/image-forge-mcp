import { optimizeViaLlm } from '../pollinations/textService.js';
import { detectStyle, buildOptimizeSystemPrompt } from './stylePresets.js';
import type { AuthConfig } from '../pollinations/client.js';

export interface OptimizeResult {
  optimizedPrompt: string;
  originalPrompt: string;
  originalWords: number;
  optimizedWords: number;
  compressionRatio: number;
  style: string;
}

export async function optimizePrompt(
  prompt: string,
  style: string = 'auto',
  targetWords: number = 30,
  authConfig: AuthConfig | null = null
): Promise<OptimizeResult> {
  const actualStyle = style === 'auto' ? detectStyle(prompt) : style;
  const system = buildOptimizeSystemPrompt(actualStyle, targetWords);
  const optimized = await optimizeViaLlm({ prompt, system, authConfig });

  const originalWords = countWords(prompt);
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
}

export function shouldOptimize(prompt: string, threshold: number = 40): boolean {
  return countWords(prompt) > threshold;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
