#!/usr/bin/env node
'use strict';

/*
 * Scaffold a new command. Run via `npm run generate:command`.
 *
 * Automates steps 1-6 of the README's "Adding a command" section: writes the
 * message file, a src/core/ logic stub, the thin SfCommand wrapper, a unit
 * test, and a NUT, then regenerates the README's Command Reference. Wiring
 * the command into the GitHub Action or MCP server (steps 7-8) stays manual
 * -- those are per-plugin decisions about which command(s) to expose.
 */

import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = { yes: false, readme: true };
  for (const arg of argv) {
    if (arg === '--yes' || arg === '-y') out.yes = true;
    else if (arg === '--no-readme') out.readme = false;
    else if (arg.startsWith('--topic=')) out.topic = arg.slice('--topic='.length);
    else if (arg.startsWith('--command=')) out.command = arg.slice('--command='.length);
    else if (arg.startsWith('--description=')) out.description = arg.slice('--description='.length);
  }
  return out;
}

function isValidSlug(value) {
  return /^[a-z0-9][a-z0-9-]*$/.test(value);
}

function pascalCase(slug) {
  const cased = slug
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
  return /^[0-9]/.test(cased) ? `Cmd${cased}` : cased;
}

async function existingTopics() {
  const commandsDir = path.join(repoRoot, 'src', 'commands');
  if (!existsSync(commandsDir)) return [];
  const entries = await fs.readdir(commandsDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

function coreTemplate(command, resultType, functionName) {
  return `'use strict';

export type ${resultType} = {
  success: boolean;
};

export function ${functionName}(): ${resultType} {
  return { success: true };
}
`;
}

function commandTemplate({ className, topic, command, packageName, functionName, resultType, coreImportPath }) {
  return `'use strict';

import { Messages } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';

import { type ${resultType}, ${functionName} } from '${coreImportPath}';

export type ${className}Result = ${resultType};

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
/* v8 ignore next -- always-executed SDK plumbing; v8 misattributes this line as a coverage miss when the module is imported directly by a unit test */
const messages = Messages.loadMessages('${packageName}', '${topic}.${command}');

export default class ${className} extends SfCommand<${className}Result> {
  public static override readonly summary = messages.getMessage('summary');
  public static override readonly description = messages.getMessage('description');
  public static override readonly examples = messages.getMessages('examples');

  public async run(): Promise<${className}Result> {
    const result = ${functionName}();
    this.log(JSON.stringify(result));
    return result;
  }
}
`;
}

function messageTemplate(topic, command, description) {
  return `# summary

${description}

# description

${description}

# examples

- \`sf ${topic} ${command}\`
`;
}

function unitTestTemplate(command, functionName) {
  return `'use strict';

import { describe, expect, it } from 'vitest';
import { ${functionName} } from '../../src/core/${command}.js';

describe('${functionName}', () => {
  it('succeeds', () => {
    expect(${functionName}()).toStrictEqual({ success: true });
  });
});
`;
}

function nutTemplate(topic, command) {
  return `'use strict';

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('${topic} ${command} NUTs', () => {
  let session: TestSession;

  beforeAll(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'NONE' });
  });

  afterAll(async () => {
    await session?.clean();
  });

  it('runs successfully', () => {
    const result = execCmd<{ success: boolean }>('${topic} ${command} --json', { ensureExitCode: 0 }).jsonOutput?.result;
    expect(result).toStrictEqual({ success: true });
  });
});
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const interactive = process.stdin.isTTY && process.stdout.isTTY;
  const rl = interactive ? readline.createInterface({ input: process.stdin, output: process.stdout }) : undefined;
  const ask = async (question, fallback) => {
    if (args[fallback] !== undefined) return args[fallback];
    if (!rl) throw new Error(`Missing --${fallback}=<value> (non-interactive session)`);
    return rl.question(question);
  };

  const topics = await existingTopics();
  const topicHint = topics.length > 0 ? ` [${topics.join(', ')}]` : '';
  const rawTopic = await ask(`Topic${topicHint}: `, 'topic');
  const topic = (rawTopic || topics[0] || '').trim();
  if (!isValidSlug(topic)) {
    console.error(`Invalid topic "${topic}": must be lowercase, start with a letter, and use only letters/numbers/hyphens.`);
    process.exitCode = 1;
    rl?.close();
    return;
  }

  const rawCommand = await ask('Command name (kebab-case): ', 'command');
  const command = (rawCommand || '').trim();
  if (!isValidSlug(command)) {
    console.error(`Invalid command "${command}": must be lowercase, start with a letter, and use only letters/numbers/hyphens.`);
    process.exitCode = 1;
    rl?.close();
    return;
  }

  const rawDescription = args.description ?? (rl ? await rl.question(`Description [TODO: describe ${topic} ${command}]: `) : '');
  const description = (rawDescription || `TODO: describe ${topic} ${command}`).trim();

  const pkgJsonPath = path.join(repoRoot, 'package.json');
  const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
  const packageName = pkgJson.name;

  const className = `${pascalCase(topic)}${pascalCase(command)}`;
  const functionName = `run${pascalCase(command)}`;
  const resultType = `${pascalCase(command)}Result`;

  const coreFile = path.join(repoRoot, 'src', 'core', `${command}.ts`);
  const commandFile = path.join(repoRoot, 'src', 'commands', topic, `${command}.ts`);
  const messageFile = path.join(repoRoot, 'messages', `${topic}.${command}.md`);
  const unitTestFile = path.join(repoRoot, 'test', 'core', `${command}.test.ts`);
  const nutFile = path.join(repoRoot, 'test', 'commands', topic, `${command}.nut.ts`);

  const targets = [coreFile, commandFile, messageFile, unitTestFile, nutFile];
  const collisions = targets.filter((target) => existsSync(target));
  if (collisions.length > 0) {
    console.error('Refusing to overwrite existing file(s):');
    for (const file of collisions) console.error(`  ${path.relative(repoRoot, file)}`);
    process.exitCode = 1;
    rl?.close();
    return;
  }

  console.log('');
  console.log('About to scaffold:');
  console.log(`  ${path.relative(repoRoot, messageFile)}`);
  console.log(`  ${path.relative(repoRoot, coreFile)}`);
  console.log(`  ${path.relative(repoRoot, commandFile)}`);
  console.log(`  ${path.relative(repoRoot, unitTestFile)}`);
  console.log(`  ${path.relative(repoRoot, nutFile)}`);
  console.log('');

  if (!args.yes) {
    const confirm = rl ? await rl.question('Proceed? [Y/n] ') : 'y';
    if (confirm.trim().toLowerCase().startsWith('n')) {
      console.log('Aborted.');
      rl?.close();
      return;
    }
  }
  rl?.close();

  await fs.mkdir(path.dirname(commandFile), { recursive: true });
  await fs.mkdir(path.dirname(nutFile), { recursive: true });

  await fs.writeFile(coreFile, coreTemplate(command, resultType, functionName), 'utf8');
  await fs.writeFile(
    commandFile,
    commandTemplate({
      className,
      topic,
      command,
      packageName,
      functionName,
      resultType,
      coreImportPath: `../../core/${command}.js`,
    }),
    'utf8',
  );
  await fs.writeFile(messageFile, messageTemplate(topic, command, description), 'utf8');
  await fs.writeFile(unitTestFile, unitTestTemplate(command, functionName), 'utf8');
  await fs.writeFile(nutFile, nutTemplate(topic, command), 'utf8');

  if (!topics.includes(topic)) {
    pkgJson.oclif ??= {};
    pkgJson.oclif.topics ??= {};
    pkgJson.oclif.topics[topic] ??= { description: `description for ${topic}` };
    await fs.writeFile(pkgJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`, 'utf8');
  }

  if (args.readme) {
    try {
      execSync('npm run readme', { cwd: repoRoot, stdio: 'inherit' });
    } catch {
      console.warn('\nCould not rebuild/regenerate the README automatically -- run `npm run readme` yourself.');
    }
  }

  console.log('');
  console.log(`Done. sf ${topic} ${command} scaffolded with a placeholder { success: true } result.`);
  console.log('Next: fill in real logic + flags in src/core, update the message file, and rerun `npm run readme`.');
  console.log('To expose it via the GitHub Action or MCP server, see README steps 7-8 under "Adding a command".');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
