#!/usr/bin/env node
'use strict';

/*
 * One-time template init. Run via `npm run init`.
 *
 * Replaces every "3dx" reference (package name, oclif topic, command/message
 * file paths, repo URLs) with the new plugin's name, sets package.json's
 * description, resets its version to 0.0.1, clears CHANGELOG.md, then
 * removes itself.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OLD_TOPIC = '3dx';

const SWEEP_EXCLUDE_DIRS = new Set([
  'node_modules', '.git', '.wireit', 'lib', 'coverage', 'reports', '.stryker-tmp', 'dist',
]);
const SWEEP_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml']);
const SWEEP_SKIP_FILES = new Set(['package-lock.json', 'CHANGELOG.md']);

function parseArgs(argv) {
  const out = { yes: false, keepScript: false };
  for (const arg of argv) {
    if (arg === '--yes' || arg === '-y') out.yes = true;
    else if (arg === '--keep-script') out.keepScript = true;
    else if (arg.startsWith('--name=')) out.name = arg.slice('--name='.length);
    else if (arg.startsWith('--topic=')) out.topic = arg.slice('--topic='.length);
    else if (arg.startsWith('--repo=')) out.repo = arg.slice('--repo='.length);
    else if (arg.startsWith('--description=')) out.description = arg.slice('--description='.length);
  }
  return out;
}

function splitPackageName(name) {
  const match = /^(?:@([^/]+)\/)?([^/]+)$/.exec(name.trim());
  if (!match) return null;
  const [, scope, unscoped] = match;
  return { scope, unscoped, full: scope ? `@${scope}/${unscoped}` : unscoped };
}

function isValidTopic(topic) {
  return /^[a-z][a-z0-9-]*$/.test(topic);
}

function guessRepoFromGit() {
  try {
    const url = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    const match = /github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/.exec(url);
    return match ? `${match[1]}/${match[2]}` : undefined;
  } catch {
    return undefined;
  }
}

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SWEEP_EXCLUDE_DIRS.has(entry.name)) continue;
      await walk(path.join(dir, entry.name), out);
    } else if (entry.isFile()) {
      if (SWEEP_SKIP_FILES.has(entry.name)) continue;
      if (SWEEP_EXTENSIONS.has(path.extname(entry.name))) out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

async function renameIfExists(from, to) {
  if (!existsSync(from)) return false;
  if (existsSync(to)) throw new Error(`Cannot rename ${from} -> ${to}: target already exists`);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
  return true;
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

  const pkgJsonPath = path.join(repoRoot, 'package.json');
  const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
  const defaultRepo = guessRepoFromGit();

  const rawName = await ask('New npm package name (e.g. @myorg/my-plugin or my-plugin): ', 'name');
  const pkgName = splitPackageName(rawName ?? '');
  if (!pkgName) {
    console.error(`Invalid package name: "${rawName}"`);
    process.exitCode = 1;
    return;
  }

  const topicDefault = pkgName.unscoped;
  const rawTopic = args.topic ?? (rl ? await rl.question(`oclif topic / command namespace [${topicDefault}]: `) : '');
  const topic = (rawTopic || topicDefault).trim();
  if (!isValidTopic(topic)) {
    console.error(`Invalid topic "${topic}": must be lowercase, start with a letter, and use only letters/numbers/hyphens.`);
    process.exitCode = 1;
    return;
  }

  const rawRepo = args.repo ?? (rl ? await rl.question(`GitHub "owner/repo" [${defaultRepo ?? 'skip'}]: `) : '');
  const repo = (rawRepo || defaultRepo || '').trim();

  const rawDescription =
    args.description ?? (rl ? await rl.question(`package.json description [${pkgJson.description}]: `) : '');
  const description = (rawDescription || pkgJson.description || '').trim();

  console.log('');
  console.log('About to initialize this plugin with:');
  console.log(`  package name : ${pkgName.full}`);
  console.log(`  oclif topic  : ${topic}`);
  console.log(`  github repo  : ${repo || '(left as-is)'}`);
  console.log(`  description  : ${description}`);
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

  // 1. Rename the topic directories and message file.
  await renameIfExists(path.join(repoRoot, 'src', 'commands', OLD_TOPIC), path.join(repoRoot, 'src', 'commands', topic));
  await renameIfExists(path.join(repoRoot, 'test', 'commands', OLD_TOPIC), path.join(repoRoot, 'test', 'commands', topic));
  await renameIfExists(
    path.join(repoRoot, 'messages', `${OLD_TOPIC}.hello.md`),
    path.join(repoRoot, 'messages', `${topic}.hello.md`),
  );

  // 2. Sweep file contents: most-specific replacements first so a generic
  // "3dx" replacement doesn't clobber the package/repo substitutions.
  const replacements = [
    [`@mcarvin/${OLD_TOPIC}`, pkgName.full],
    ...(repo ? [[`mcarvin8/${OLD_TOPIC}`, repo]] : []),
    [new RegExp(`\\b${OLD_TOPIC}\\b`, 'g'), topic],
  ];

  const files = await walk(repoRoot);
  for (const file of files) {
    const original = await fs.readFile(file, 'utf8');
    let updated = original;
    for (const [search, replace] of replacements) {
      updated = typeof search === 'string' ? updated.split(search).join(replace) : updated.replace(search, replace);
    }
    if (updated !== original) await fs.writeFile(file, updated, 'utf8');
  }

  // 3. Reset version and description. Re-read: the sweep above may have
  // rewritten package.json (name/repo/bugs fields) since pkgJson was loaded.
  const sweptPkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
  sweptPkgJson.version = '0.0.1';
  sweptPkgJson.description = description;
  delete sweptPkgJson.scripts.init;
  await fs.writeFile(pkgJsonPath, `${JSON.stringify(sweptPkgJson, null, 2)}\n`, 'utf8');

  // 4. Clear the changelog.
  await fs.writeFile(path.join(repoRoot, 'CHANGELOG.md'), '# Changelog\n', 'utf8');

  // 5. Remove this script now that it's done its job.
  if (!args.keepScript) {
    await fs.rm(__filenameSafe(), { force: true });
  }

  console.log('Done. Review README.md/CONTRIBUTING.md, then run `npm install` to refresh package-lock.json.');
}

function __filenameSafe() {
  return fileURLToPath(import.meta.url);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
