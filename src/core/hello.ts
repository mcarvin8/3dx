'use strict';

export type GreetResult = {
  message: string;
};

export function greet(name: string): GreetResult {
  return { message: `Hello, ${name}!` };
}
