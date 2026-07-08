#!/usr/bin/env node
import { runServer } from './server.js';

runServer().catch((error) => {
  console.error('Fatal error starting image-forge-mcp:', error);
  process.exit(1);
});
