#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { bambooConfig } from './config.js';
import { startStreamableHttpServer } from './httpServer.js';
import { createBambooMcpServer } from './server.js';

if (bambooConfig.transport === 'streamable-http') {
  await startStreamableHttpServer();
} else {
  const server = createBambooMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('BambooHR MCP Server is running on stdio...');
}
