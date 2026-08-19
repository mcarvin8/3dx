'use strict';

import { describe, expect, it } from 'vitest';
import ThreeDxHello from '../../../src/commands/3dx/hello.js';

describe('3dx hello unit tests', () => {
  // Passing import.meta.url as the load root avoids a benign oclif Config.load()
  // warning: without an explicit root, it falls back to `require.main`, which
  // is unset under Vitest's ESM runner and resolves to @oclif/core's own
  // package.json instead of this plugin's.
  it('greets "World" by default', async () => {
    const result = await ThreeDxHello.run([], import.meta.url);
    expect(result.message).toBe('Hello, World!');
  });

  it('greets the name passed to --name', async () => {
    const result = await ThreeDxHello.run(['--name', 'Trailblazer'], import.meta.url);
    expect(result.message).toBe('Hello, Trailblazer!');
  });
});
