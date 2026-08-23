'use strict';

import { describe, expect, it } from 'vitest';
import { greet } from '../../src/core/hello.js';

describe('greet', () => {
  it('greets the given name', () => {
    expect(greet('World')).toStrictEqual({ message: 'Hello, World!' });
  });

  it('greets any other name', () => {
    expect(greet('Trailblazer')).toStrictEqual({ message: 'Hello, Trailblazer!' });
  });
});
