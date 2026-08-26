'use strict';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { greet } from '../core/hello.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: '3dx',
    version: '1.0.0',
  });

  server.registerTool(
    'hello',
    {
      title: 'Hello',
      description:
        "Print a greeting. Reference tool demonstrating this template's MCP conventions: same src/core/hello.ts logic the CLI command and GitHub Action call.",
      inputSchema: {
        name: z.string().optional().describe('Name to greet. Defaults to "World".'),
      },
    },
    ({ name }) => {
      const result = greet(name ?? 'World');
      return {
        content: [{ type: 'text' as const, text: result.message }],
      };
    },
  );

  return server;
}
