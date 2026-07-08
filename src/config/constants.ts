export const API_ENDPOINTS = {
  IMAGE_BASE: 'https://image.pollinations.ai',
  TEXT_BASE: 'https://text.pollinations.ai',
  IMAGE_PROMPT: 'https://image.pollinations.ai/prompt',
  TEXT_PROMPT: 'https://text.pollinations.ai',
  TEXT_OPENAI: 'https://text.pollinations.ai/openai',
} as const;

function readBooleanEnv(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return /^(1|true|yes)$/i.test(value);
}

function readNumberEnv(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export const DEFAULTS = {
  OUTPUT_DIR: process.env.OUTPUT_DIR || './vision-output',
  IMAGE_MODEL: process.env.IMAGE_MODEL || 'flux',
  IMAGE_WIDTH: readNumberEnv('IMAGE_WIDTH', 1024),
  IMAGE_HEIGHT: readNumberEnv('IMAGE_HEIGHT', 1024),
  IMAGE_AUTO_OPTIMIZE: readBooleanEnv('IMAGE_AUTO_OPTIMIZE', true),
  IMAGE_OPTIMIZE_STYLE: process.env.IMAGE_OPTIMIZE_STYLE || 'auto',
  IMAGE_ENHANCE: readBooleanEnv('IMAGE_ENHANCE', false),
  IMAGE_SAFE: readBooleanEnv('IMAGE_SAFE', false),
  TEXT_MODEL: process.env.TEXT_MODEL || 'openai-fast',
  TEXT_TEMPERATURE: readNumberEnv('TEXT_TEMPERATURE', 0.7),
  TEXT_TOP_P: readNumberEnv('TEXT_TOP_P', 0.9),
  DEBUG: /^(1|true|yes)$/i.test(process.env.DEBUG || ''),
} as const;
