# 3dx

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://raw.githubusercontent.com/mcarvin8/3dx/main/LICENSE.md)

A community template for building **Salesforce CLI (`sf`) plugins** on a current Node.js toolchain — npm, [Vitest](https://vitest.dev/), and [Biome](https://biomejs.dev/) — instead of the stack baked into Salesforce's own [`plugin-template`](https://github.com/salesforcecli/plugin-template): Yarn, Mocha, nyc, and ESLint/Prettier, several of which are archived or in maintenance-only mode upstream.

This repo is itself a working plugin (one example command, `sf 3dx hello`) so every piece of tooling — build, lint, test, coverage, mutation testing, CI, release — runs and is verified, not just described.

<details>
  <summary>Table of Contents</summary>

- [Why this exists](#why-this-exists)
- [What's inside](#whats-inside)
- [Using this template](#using-this-template)
- [Project layout](#project-layout)
- [Adding a command](#adding-a-command)
- [Command Reference](#command-reference)
- [Scripts](#scripts)
- [CI workflows](#ci-workflows)
- [Trimming it down](#trimming-it-down)
- [License](#license)

</details>

## Why this exists

Salesforce's official `plugin-template` is the standard starting point for a new `sf` plugin, but its dependency stack has drifted from what the Node.js ecosystem uses day to day:

| Concern           | `plugin-template`   | `3dx`                             |
|--------------------|---------------------|------------------------------------|
| Package manager    | Yarn                | npm                                |
| Test runner        | Mocha + Chai        | Vitest                             |
| Coverage           | nyc (Istanbul CLI)  | Vitest's built-in v8 coverage      |
| Lint + format      | ESLint + Prettier   | Biome (single tool, one config)    |
| Mutation testing    | none                | Stryker (optional, incremental on PRs) |
| Task orchestration | npm scripts only    | [Wireit](https://github.com/google/wireit) (caching, incremental builds) |
| Commit hygiene     | none built in       | Husky + commitlint + lint-staged   |
| Releases           | manual              | release-please + npm Trusted Publishing (OIDC) |

None of this changes what a plugin *is* — it's still an [oclif](https://oclif.io/) command tree using `@oclif/core` and `@salesforce/sf-plugins-core`, same as the official template. What changes is everything around it: faster installs, one linter instead of two, tests that don't need a compile step first, and CI that mirrors what you'd actually run locally.

## What's inside

- **Runtime deps**: `@oclif/core`, `@salesforce/core`, `@salesforce/sf-plugins-core` — the same three packages any `sf` plugin needs.
- **Build**: TypeScript (strict, ESM, Node16 resolution), orchestrated by Wireit so `npm run build` only redoes work when inputs changed.
- **Lint/format**: Biome, one config (`biome.json`), no ESLint/Prettier split to keep in sync.
- **Tests**: Vitest for unit tests (`test/**/*.test.ts`) with coverage thresholds, and `@salesforce/cli-plugins-testkit` for NUTs (`test/**/*.nut.ts`) that exercise the compiled plugin through a real `sf` process.
- **Mutation testing**: Stryker, wired to run incrementally against only the files a PR changed (`scripts/incremental-mutation.mjs`), with an optional full run and dashboard upload via `workflow_dispatch`.
- **Git hooks**: Husky runs `lint-staged` (Biome, staged files only) on commit, commitlint on the commit message (Conventional Commits), and a full `npm run build` before push.
- **Dependency hygiene**: `knip` flags unused exports/files/deps; `ls-engines` checks the dependency tree against the `engines.node` floor.
- **CI**: GitHub Actions for lint + unit tests + NUTs across OS/Node matrices, MegaLinter on PRs, incremental Stryker on PRs, and a release pipeline (release-please → npm publish via OIDC → post-publish smoke test).

## Using this template

1. Click **Use this template** on GitHub (or `gh repo create my-plugin --template mcarvin8/3dx --public`).
2. Rename the plugin — these all currently say `3dx`:
   - `package.json`: `name`, `oclif.topics`, `repository.url`, `bugs.url`
   - `src/commands/3dx/` → `src/commands/<your-topic>/`
   - `messages/3dx.hello.md` → `messages/<your-topic>.<command>.md` (and the `Messages.loadMessages('3dx', ...)` call in each command)
   - `test/commands/3dx/` → mirror the new command path
   - `.github/workflows/smoke-test.yml`: the `sf plugins install --force 3dx@latest` line
3. Replace the example `hello` command with your first real command (see [Adding a command](#adding-a-command)), or delete it if you're starting from a bare skeleton.
4. `npm install`, then `npm run build && npm test` to confirm everything still passes under the new name.
5. If you want npm Trusted Publishing (no `NPM_TOKEN` secret), register this repo + the `release.yml` workflow as a trusted publisher at `https://www.npmjs.com/package/<name>/access` before your first tagged release. Otherwise, see the comment in `release.yml` for the classic-token alternative.
6. Set repo secrets used by CI as needed: `CODECOV_TOKEN` (coverage upload), `TESTKIT_*` (NUTs against a real Dev Hub — optional, NUTs using `devhubAuthStrategy: 'NONE'` don't need it), `STRYKER_DASHBOARD_API_KEY` (optional, full mutation runs only).

## Project layout

```
src/
  commands/3dx/hello.ts   # one command = one file; class name matches the file
  index.ts                 # oclif plugin entry point (leave as `export default {}`)
messages/
  3dx.hello.md             # summary/description/examples/flag text, loaded via Messages
test/
  commands/3dx/hello.test.ts  # unit test — imports the command class directly
  commands/3dx/hello.nut.ts   # NUT — drives the compiled plugin through execCmd
```

Command, message file, unit test, and NUT are named to mirror each other 1:1 — that mapping is what `knip.config.ts` and the Stryker `mutate` excludes assume.

## Adding a command

1. Add `messages/<topic>.<command>.md` with `# summary`, `# description`, `# examples`, and `# flags.<name>.summary` sections per flag.
2. Add `src/commands/<topic>/<command>.ts` extending `SfCommand<YourResultType>`, loading the message file via `Messages.loadMessages('<package-name>', '<topic>.<command>')`.
3. Add a unit test under `test/commands/<topic>/<command>.test.ts` that calls `YourCommand.run([...])` directly and asserts on the returned result.
4. Add a NUT under `test/commands/<topic>/<command>.nut.ts` using `execCmd` from `@salesforce/cli-plugins-testkit`.
5. Run `npx oclif readme` (part of `npm run prepack`) to regenerate the [Command Reference](#command-reference) below from your command's flags and message file — commit the result along with `oclif.manifest.json`.

## Command Reference

<!-- commands -->
* [`sf 3dx hello`](#sf-3dx-hello)

## `sf 3dx hello`

Print a greeting. Reference command demonstrating this template's conventions: oclif command class, `@salesforce/core` Messages for i18n, flags, and a typed JSON result.

```
USAGE
  $ sf 3dx hello [--json] [--flags-dir <value>] [-n <value>]

FLAGS
  -n, --name=<value>  [default: World] Name to greet. Defaults to "World".

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Print a greeting. Reference command demonstrating this template's conventions: oclif command class, `@salesforce/core`
  Messages for i18n, flags, and a typed JSON result.

  Print a greeting. This is the one example command shipped with the 3dx template — replace it with your plugin's first
  real command, or use it as a reference for the file layout (command class, message file, unit test, NUT) when adding
  new ones.

EXAMPLES
  `sf 3dx hello`

  `sf 3dx hello --name "World"`
```

_See code: [src/commands/3dx/hello.ts](https://github.com/mcarvin8/3dx/blob/v0.1.0/src/commands/3dx/hello.ts)_
<!-- commandsstop -->

## Scripts

| Command                | Does |
|-------------------------|------|
| `npm run build`         | Compile + lint |
| `npm test`               | Compile tests + unit tests (with coverage) + lint |
| `npm run test:only`      | Unit tests + coverage, no lint/compile |
| `npm run test:nuts`      | NUTs against the built plugin |
| `npm run test:mutation`  | Full Stryker run |
| `npm run test:mutation:incremental` | Stryker against files changed vs. the base branch |
| `npm run lint` / `format` | Biome check / write |
| `npm run lint:dependencies` | knip — unused files/exports/deps |
| `npm run lint:engine`   | ls-engines — dependency tree vs. `engines.node` |
| `npm run clean`         | Remove build/test artifacts |

## CI workflows

- **`test.yml`** — runs on every push to a non-main branch and via `workflow_call`: lint, unit tests + coverage (matrix across ubuntu/windows/macos × Node 22/24/26), then NUTs on the same matrix.
- **`release.yml`** — on push to `main`: release-please opens/updates a release PR; when a release is published, it publishes to npm (OIDC Trusted Publishing) and triggers the smoke test.
- **`smoke-test.yml`** — installs the just-published plugin into a real `sf` CLI and reruns the NUT suite against it, cross-OS.
- **`megalinter.yml`** — broad-spectrum linting on PRs (secrets, Dockerfiles, shell scripts, YAML, etc. — Biome already owns JS/TS, so those linters are disabled in `.mega-linter.yml` to avoid overlap).
- **`mutation.yml`** — incremental Stryker on PRs (scoped to changed files, posts a PR comment); full run + optional dashboard upload via manual `workflow_dispatch`.

## Trimming it down

Everything here is meant to be deleted, not just configured. In particular:

- No plans to publish, or to publish infrequently? Delete `release.yml`'s smoke-test trigger and OIDC step; a plain `npm publish` locally is fine.
- Not doing cross-platform NUTs? Collapse the `test.yml`/`smoke-test.yml` matrices to `ubuntu-latest` only.
- Mutation testing and MegaLinter are the two heaviest, most opinionated pieces — drop `mutation.yml`, `stryker.config.json`, `scripts/incremental-mutation.mjs`, `megalinter.yml`, and `.mega-linter.yml` if they're not earning their CI minutes for your plugin.

## License

[MIT](LICENSE.md)
