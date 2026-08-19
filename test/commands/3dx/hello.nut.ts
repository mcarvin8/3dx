'use strict';

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('3dx hello NUTs', () => {
  let session: TestSession;

  beforeAll(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'NONE' });
  });

  afterAll(async () => {
    await session?.clean();
  });

  it('greets "World" by default', () => {
    const output = execCmd('3dx hello', { ensureExitCode: 0 }).shellOutput.stdout;
    expect(output.trim()).toBe('Hello, World!');
  });

  it('greets the name passed to --name', () => {
    const output = execCmd('3dx hello --name "Trailblazer"', { ensureExitCode: 0 }).shellOutput.stdout;
    expect(output.trim()).toBe('Hello, Trailblazer!');
  });
});
