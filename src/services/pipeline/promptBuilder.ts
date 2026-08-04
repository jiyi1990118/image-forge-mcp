import { optimizePrompt, shouldOptimize } from '../optimizer/promptOptimizer.js';
import {
  addAssetConstraint,
  addNoTextConstraint,
  shouldApplyNoTextConstraint,
} from '../../config/assetKeywords.js';
import { DEFAULTS } from '../../config/constants.js';
import { log } from '../../utils/logger.js';
import type { AuthConfig } from '../pollinations/client.js';

export interface BuildGenerationPromptResult {
  generationPrompt: string;
  optimizedFrom: string | null;
}

export interface BuildGenerationPromptArgs {
  autoOptimize?: unknown;
  optimizeStyle?: unknown;
  noTextConstraint?: unknown;
}

export async function buildGenerationPrompt(
  prompt: string,
  args: BuildGenerationPromptArgs,
  authConfig: AuthConfig | null
): Promise<BuildGenerationPromptResult> {
  const autoOptimize = args.autoOptimize !== undefined ? args.autoOptimize !== false : DEFAULTS.IMAGE_AUTO_OPTIMIZE;
  const optimizeStyle = String(args.optimizeStyle || DEFAULTS.IMAGE_OPTIMIZE_STYLE);

  let finalPrompt = prompt;
  let optimizedFrom: string | null = null;

  if (autoOptimize && shouldOptimize(prompt)) {
    log('Auto-optimizing prompt...');
    const result = await optimizePrompt(prompt, optimizeStyle, 30, authConfig);
    finalPrompt = result.optimizedPrompt;
    optimizedFrom = prompt;
  }

  const constrainedPrompt = addAssetConstraint(finalPrompt);
  const generationPrompt = shouldApplyNoTextConstraint(args.noTextConstraint)
    ? addNoTextConstraint(constrainedPrompt)
    : constrainedPrompt;

  return { generationPrompt, optimizedFrom };
}