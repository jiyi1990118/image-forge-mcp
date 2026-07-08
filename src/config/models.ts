export interface ImageModelInfo {
  name: string;
  status: 'available' | 'unavailable';
  bestFor: string;
}

export interface TextModelInfo {
  name: string;
  description: string;
  reasoning: boolean;
  tools: boolean;
  vision: boolean;
  audio: boolean;
  aliases: string[];
}

export const IMAGE_MODELS: ImageModelInfo[] = [
  { name: 'flux', status: 'available', bestFor: 'general purpose' },
  { name: 'turbo', status: 'available', bestFor: 'fast generation' },
  { name: 'gptimage', status: 'available', bestFor: 'photorealistic' },
  { name: 'qwen-image', status: 'available', bestFor: 'Chinese scenes, cultural art (default)' },
  { name: 'grok-imagine', status: 'available', bestFor: 'creative' },
  { name: 'zimage', status: 'available', bestFor: 'general' },
  { name: 'wan-image', status: 'available', bestFor: 'Chinese scenes' },
  { name: 'ideogram-v4-turbo', status: 'available', bestFor: 'text rendering' },
  { name: 'nova-canvas', status: 'available', bestFor: 'general' },
  { name: 'klein', status: 'available', bestFor: 'general' },
  { name: 'sana', status: 'available', bestFor: 'fast' },
  { name: 'p-image', status: 'available', bestFor: 'general' },
  { name: 'nanobanana', status: 'unavailable', bestFor: 'image-to-image (server error)' },
  { name: 'seedream', status: 'unavailable', bestFor: 'image-to-image (server error)' },
  { name: 'kontext', status: 'unavailable', bestFor: 'image editing (server error)' },
];

export const TEXT_MODELS: TextModelInfo[] = [
  {
    name: 'openai-fast',
    description: 'GPT-OSS 20B Reasoning LLM (OVH)',
    reasoning: true,
    tools: true,
    vision: false,
    audio: false,
    aliases: ['openai', 'gpt-oss', 'gpt-oss-20b', 'ovh-reasoning'],
  },
];
