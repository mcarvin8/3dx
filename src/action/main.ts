'use strict';

import * as core from '@actions/core';
import { greet } from '../core/hello.js';

export async function run(): Promise<void> {
  try {
    const name = core.getInput('name') || 'World';
    const result = greet(name);

    core.setOutput('message', result.message);
    core.info(result.message);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}
