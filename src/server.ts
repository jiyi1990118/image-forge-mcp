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
import { createRequire } from 'module';
import { getAllToolSchemas } from './schemas/index.js';
import { handleGenerateImage, handleGenerateImageUrl } from './tools/generateImage.js';
import { handleListImageModels, handleListTextModels } from './tools/textTools.js';
import { imagePromptGuide } from './prompts/imagePromptGuide.js';
import { info, error } from './utils/logger.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };
export const SERVER_VERSION = packageJson.version;

const authConfig = null;

export function createServer(): Server {
  const server = new Server(
    { name: 'image-forge-mcp', version: SERVER_VERSION },
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

    try {
      switch (name) {
        case 'generateImage':
          return await handleGenerateImage(args || {}, authConfig);
        case 'generateImageUrl':
          return await handleGenerateImageUrl(args || {}, authConfig);
        case 'listImageModels':
          return await handleListImageModels();
        case 'listTextModels':
          return await handleListTextModels();
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      error('Tool call failed:', name, '-', message);
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  });

  return server;
}

export async function runServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  info('image-forge-mcp server running on stdio');
}