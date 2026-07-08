import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { getAllToolSchemas } from './schemas/index.js';
import { handleGenerateImage, handleGenerateImageUrl } from './tools/generateImage.js';
import { handleEnhanceImage } from './tools/enhanceImage.js';
import { handleOptimizePrompt } from './tools/optimizePrompt.js';
import { handleRespondText, handleListImageModels, handleListTextModels } from './tools/textTools.js';
import { imagePromptGuide } from './prompts/imagePromptGuide.js';
import { log } from './utils/logger.js';

const authConfig = null;

export function createServer(): Server {
  const server = new Server(
    { name: 'image-forge-mcp', version: '0.2.0' },
    { capabilities: { tools: {}, prompts: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getAllToolSchemas(),
  }));

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: 'image-prompt-guide',
        description: 'Guide for writing effective prompts for Pollinations free-tier image generation.',
        arguments: [],
      },
    ],
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;
    if (name === 'image-prompt-guide') {
      return {
        description: 'Pollinations free-tier image prompt guide',
        messages: [{ role: 'user', content: { type: 'text', text: imagePromptGuide } }],
      };
    }
    throw new McpError(ErrorCode.InvalidParams, `Unknown prompt: ${name}`);
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    log('Tool call:', name);

    try {
      switch (name) {
        case 'generateImage':
          return await handleGenerateImage(args || {}, authConfig);
        case 'generateImageUrl':
          return await handleGenerateImageUrl(args || {}, authConfig);
        case 'enhanceImage':
          return await handleEnhanceImage(args || {});
        case 'optimizePrompt':
          return await handleOptimizePrompt(args || {}, authConfig);
        case 'respondText':
          return await handleRespondText(args || {}, authConfig);
        case 'listImageModels':
          return await handleListImageModels();
        case 'listTextModels':
          return await handleListTextModels();
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log('Tool error:', message);
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  });

  return server;
}

export async function runServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('image-forge-mcp server running on stdio');
}
