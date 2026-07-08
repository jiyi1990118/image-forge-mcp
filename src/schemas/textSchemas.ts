import type { ToolSchema } from '../types/schemas.js';

export const optimizePromptSchema: ToolSchema = {
  name: 'optimizePrompt',
  description: `Purpose
--------
Compress and optimize a text prompt for Pollinations free-tier image generation quality, using a free LLM (openai-fast).

Reduces prompt to ~30 words while preserving the main subject. Returns optimized prompt + original + compression ratio + detected style.

Use When
--------
Use this tool when the user:
- has a long or complex prompt (> 40 words) before generating an image
- says "优化提示词" / "improve my prompt" / "compress this prompt"
- got poor results from generateImage and wants to retry with a cleaner prompt
- has redundant adjectives, multiple subjects, or overly verbose descriptions
- wants to see what style was detected (auto mode)

Do Not Use
--------
Do not use for:
- generating an image directly (use generateImage instead — it auto-optimizes by default, so you usually don't need this first)
- general text chat or Q&A (use respondText instead)
- generating a URL (use generateImageUrl instead)
- enhancing/upscaling an existing image file (use enhanceImage instead)

Input
--------
prompt: string — The original prompt to optimize.
style: enum (optional, default: auto) — auto|realistic|anime|painting|scifi|portrait. auto=detect from prompt.
targetWords: number (optional, default: 30) — Target word count. 20-40 recommended.

Output
--------
content: [text (optimized prompt + original + compression ratio + detected style)]

Limitations
--------
- Uses free LLM (openai-fast / gpt-oss-20b); quality depends on model availability.
- Zero cost, but may take a few seconds.

Examples
--------
User: "Optimize this prompt: a beautiful majestic lion with golden fur standing on a rock at sunset with dramatic lighting and cinematic composition"
→ Use this tool.

User: "优化我的提示词"
→ Use this tool.

User: "I got a bad image from generateImage, can you fix the prompt?"
→ Use this tool.

User: "Generate an image of a cat"
→ Do NOT use. Use generateImage instead (it auto-optimizes internally).

User: "What's the capital of France?"
→ Do NOT use. Use respondText instead.`,
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'The original prompt to optimize.' },
      style: { type: 'string', default: 'auto', enum: ['auto', 'realistic', 'anime', 'painting', 'scifi', 'portrait'], description: "Style preset. auto=detect from prompt." },
      targetWords: { type: 'number', default: 30, description: 'Target word count. 20-40 recommended.' },
    },
    required: ['prompt'],
  },
};

export const respondTextSchema: ToolSchema = {
  name: 'respondText',
  description: `Purpose
--------
Generate text using a free LLM (openai-fast / GPT-OSS 20B with reasoning) via Pollinations text API.

OpenAI-compatible. Supports system prompts and temperature/top_p tuning.

Use When
--------
Use this tool when the user:
- asks a question or wants a text answer (Q&A, factual, reasoning)
- says "回答问题" / "解释一下" / "summarize" / "translate" / "explain"
- wants code explanation, translation, or summarization
- needs a free text generation without API keys

Do Not Use
--------
Do not use for:
- generating images (use generateImage instead)
- optimizing an image prompt (use optimizePrompt instead — it's specialized for image prompts)
- listing available models (use listImageModels or listTextModels instead)

Input
--------
prompt: string — User input or question.
system: string (optional, default: "") — System prompt to guide model behavior.
temperature: number (optional, default: 0.7) — 0=focused, 2=creative.
top_p: number (optional, default: 0.9) — Nucleus sampling.
seed: number (optional) — Reproducibility seed.

Output
--------
content: [text (LLM response)]

Limitations
--------
- Uses free LLM; quality may vary and response can be slow.
- No streaming; returns full response at once.

Examples
--------
User: "Explain how Real-ESRGAN works in simple terms"
→ Use this tool.

User: "翻译这段话成英文"
→ Use this tool.

User: "Summarize this article: ..."
→ Use this tool.

User: "Generate an image of a cat"
→ Do NOT use. Use generateImage instead.

User: "Optimize my image prompt for better quality"
→ Do NOT use. Use optimizePrompt instead.`,
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'User input / question.' },
      system: { type: 'string', default: '', description: 'System prompt for behavior.' },
      temperature: { type: 'number', default: 0.7, description: '0=focused, 2=creative.' },
      top_p: { type: 'number', default: 0.9, description: 'Nucleus sampling.' },
      seed: { type: 'number', description: 'Seed for reproducibility.' },
    },
    required: ['prompt'],
  },
};

export const listImageModelsSchema: ToolSchema = {
  name: 'listImageModels',
  description: `Purpose
--------
List all available image models with status and best-use-case recommendations.

Returns the built-in verified model registry (not the unreliable Pollinations API endpoint).

Use When
--------
Use this tool when the user:
- asks what image models are available
- says "有哪些模型" / "what models can I use" / "list models"
- wants to know which model is best for their use case (text rendering, Chinese scenes, etc.)
- needs to pick a model before calling generateImage

Do Not Use
--------
Do not use for:
- listing text models (use listTextModels instead)
- generating an image (use generateImage instead — you don't need to list models first, flux is the default)
- optimizing a prompt (use optimizePrompt instead)

Input
--------
(No parameters required)

Output
--------
content: [text (model list with name, status, best-use-case)]

Limitations
--------
- Returns hardcoded registry, not a live API call (Pollinations model API is unreliable).

Examples
--------
User: "What image models are available?"
→ Use this tool.

User: "Which model is best for rendering text in images?"
→ Use this tool.

User: "Generate an image of a cat"
→ Do NOT use. Use generateImage instead (flux is the default, no need to list first).

User: "What text models do you have?"
→ Do NOT use. Use listTextModels instead.`,
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const listTextModelsSchema: ToolSchema = {
  name: 'listTextModels',
  description: `Purpose
--------
List all available free text models with capabilities (reasoning, tools, aliases).

Returns the built-in model registry. Free tier includes openai-fast (GPT-OSS 20B reasoning LLM).

Use When
--------
Use this tool when the user:
- asks what text/chat models are available
- says "有哪些文本模型" / "what LLMs can I use"
- wants to know if reasoning or tool-use is supported
- needs to pick a model before calling respondText

Do Not Use
--------
Do not use for:
- listing image models (use listImageModels instead)
- generating text (use respondText instead — openai-fast is the default)
- generating images (use generateImage instead)

Input
--------
(No parameters required)

Output
--------
content: [text (model list with name, description, aliases, reasoning/tools flags)]

Limitations
--------
- Returns hardcoded registry, not a live API call.

Examples
--------
User: "What text models do you have?"
→ Use this tool.

User: "Does the free LLM support reasoning?"
→ Use this tool.

User: "Answer this question: what is 2+2?"
→ Do NOT use. Use respondText instead.

User: "What image models are available?"
→ Do NOT use. Use listImageModels instead.`,
  inputSchema: {
    type: 'object',
    properties: {},
  },
};
