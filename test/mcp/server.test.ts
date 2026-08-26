'use strict';

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Client as McpClient } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { beforeEach, describe, expect, it } from 'vitest';

import { createServer } from '../../src/mcp/server.js';

describe('MCP server', () => {
  let client: Client;

  beforeEach(async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new McpClient({ name: 'test-client', version: '1.0.0' });

    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  });

  it('lists the hello tool', async () => {
    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name)).toContain('hello');
  });

  it('defaults the name to World', async () => {
    const result = await client.callTool({ name: 'hello', arguments: {} });

    expect(result.content).toStrictEqual([{ type: 'text', text: 'Hello, World!' }]);
  });

  it('greets the given name', async () => {
    const result = await client.callTool({ name: 'hello', arguments: { name: 'Trailblazer' } });

    expect(result.content).toStrictEqual([{ type: 'text', text: 'Hello, Trailblazer!' }]);
  });
});
