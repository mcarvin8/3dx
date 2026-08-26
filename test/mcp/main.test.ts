'use strict';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { run } from '../../src/mcp/main.js';
import { createServer } from '../../src/mcp/server.js';

vi.mock('@modelcontextprotocol/sdk/server/stdio.js');
vi.mock('../../src/mcp/server.js');

describe('MCP entrypoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('connects the server to a stdio transport', async () => {
    const connect = vi.fn();
    vi.mocked(createServer).mockReturnValue({ connect } as never);

    await run();

    expect(createServer).toHaveBeenCalledOnce();
    expect(connect).toHaveBeenCalledWith(expect.any(StdioServerTransport));
  });
});
