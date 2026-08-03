import type { ToolSchema } from '../types/schemas.js';

export const listImageModelsSchema: ToolSchema = {
  name: 'listImageModels',
  description: `List available image models with status and best-use-case recommendations.

Returns the built-in verified model registry (not the unreliable Pollinations API endpoint).

Use When:
- user asks what image models are available
- user says "有哪些模型" / "what models can I use" / "list models"
- user wants to know which model is best for their use case
- user needs to pick a model before calling generateImage

Do not use for listing text models (use listTextModels).`,
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const listTextModelsSchema: ToolSchema = {
  name: 'listTextModels',
  description: `List available free text models with capabilities (reasoning, tools, aliases).

Returns the built-in model registry. Free tier includes openai-fast (GPT-OSS 20B reasoning LLM).

Use When:
- user asks what text/chat models are available
- user says "有哪些文本模型" / "what LLMs can I use"
- user wants to know if reasoning or tool-use is supported

Do not use for listing image models (use listImageModels).`,
  inputSchema: {
    type: 'object',
    properties: {},
  },
};