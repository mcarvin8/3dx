import * as core from '@actions/core';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { run } from '../../src/action/main.js';
import { greet } from '../../src/core/hello.js';

vi.mock('@actions/core');
vi.mock('../../src/core/hello.js');

const greetMock = greet as unknown as Mock;
const getInputMock = core.getInput as unknown as Mock;

function stubInput(name = ''): void {
  getInputMock.mockImplementation(() => name);
}

describe('GitHub Action entrypoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults the name input to World when empty', async () => {
    stubInput('');
    greetMock.mockReturnValue({ message: 'Hello, World!' });

    await run();

    expect(greetMock).toHaveBeenCalledWith('World');
  });

  it('passes through a non-empty name input', async () => {
    stubInput('Trailblazer');
    greetMock.mockReturnValue({ message: 'Hello, Trailblazer!' });

    await run();

    expect(greetMock).toHaveBeenCalledWith('Trailblazer');
  });

  it('sets the message output and logs it on success', async () => {
    stubInput('World');
    greetMock.mockReturnValue({ message: 'Hello, World!' });

    await run();

    expect(core.setOutput).toHaveBeenCalledWith('message', 'Hello, World!');
    expect(core.info).toHaveBeenCalledWith('Hello, World!');
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('fails the action with the error message when greet throws', async () => {
    stubInput('World');
    greetMock.mockImplementation(() => {
      throw new Error('boom');
    });

    await run();

    expect(core.setFailed).toHaveBeenCalledWith('boom');
  });

  it('fails the action with String(error) when the thrown value is not an Error instance', async () => {
    stubInput('World');
    greetMock.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'a plain string rejection';
    });

    await run();

    expect(core.setFailed).toHaveBeenCalledWith('a plain string rejection');
  });
});
