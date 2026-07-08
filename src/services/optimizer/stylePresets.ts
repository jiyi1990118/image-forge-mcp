export const STYLE_STRATEGIES: Record<string, string> = {
  realistic: 'realistic: keep material/lighting words, remove redundant modifiers',
  anime: 'anime: keep character traits, remove background details',
  painting: 'painting: keep art style + subject, remove physical descriptions',
  scifi: 'scifi: keep core tech words, remove narrative',
  portrait: 'portrait: keep subject + atmosphere, remove environment',
};

export function detectStyle(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (/anime|manga|girl|boy|kawaii|chibi/.test(lower)) return 'anime';
  if (/painting|ink|brush|scroll|mural|oil|watercolor|silkscreen/.test(lower)) return 'painting';
  if (/mech|robot|cyberpunk|space|galaxy|neon|plasma|laser|sci-?fi/.test(lower)) return 'scifi';
  if (/portrait|girl|woman|face|person|model/.test(lower)) return 'portrait';
  return 'realistic';
}

export function buildOptimizeSystemPrompt(style: string, targetWords: number): string {
  const strategy = STYLE_STRATEGIES[style] || STYLE_STRATEGIES.realistic;
  return `You are a prompt optimizer for Pollinations free-tier image generation.
The free tier downsamples to 768px with limited steps, so complex prompts produce worse results.
Your job: compress the prompt to under ${targetWords} words while preserving the MAIN subject and ONE key atmosphere descriptor.

Remove: redundant adjectives, excessive scene elements, contradictory terms, redundant quality descriptors.
Keep: main subject, one lighting/mood word, one quality word.

Style preset: ${strategy}

Return ONLY the optimized prompt, nothing else. No explanation. No quotes.`;
}
