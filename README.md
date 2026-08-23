# 3dx

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://raw.githubusercontent.com/mcarvin8/3dx/main/LICENSE.md)

**3dx** is a community-built **third-party developer experience for Salesforce CLI**, providing a modern `sf` plugin template — and, optionally, a matching GitHub Action wrapper — built on npm, [Vitest](https://vitest.dev/), and [Biome](https://biomejs.dev/) instead of the legacy-leaning toolchain in Salesforce's official plugin template.

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
- [GitHub Action](#github-action)
- [Trimming it down](#trimming-it-down)
- [License](#license)

</details>

## Why this exists

Salesforce's official template is the standard starting point for a new `sf` plugin, but its dependency stack has drifted from the latest the Node.js ecosystem has to offer:

| Concern            | `plugin-template`  | `3dx`                                                                    |
|--------------------|--------------------|--------------------------------------------------------------------------|
| Package manager    | Yarn               | npm                                                                      |
| Test runner        | Mocha + Chai       | Vitest                                                                   |
| Coverage           | nyc (Istanbul CLI) | Vitest's built-in v8 coverage + upload to Codecov                        |
| Lint + format      | ESLint + Prettier  | Biome (single tool, one config)                                          |
| Mutation testing   | none               | Stryker (optional, incremental on PRs)                                   |
| Task orchestration | npm scripts only   | [Wireit](https://github.com/google/wireit) (caching, incremental builds) |
| Commit hygiene     | none built in      | Husky + commitlint + lint-staged                                         |
| Releases           | manual             | release-please + npm Trusted Publishing (OIDC)                           |
| GitHub Action      | none               | native node Action, sharing logic with the CLI command — see [GitHub Action](#github-action) |

None of this changes what a plugin *is* — it's still an [oclif](https://oclif.io/) command tree using `@oclif/core` and `@salesforce/sf-plugins-core`, same as the official template. What changes is everything around it: faster installs, one linter instead of two, tests that don't need a compile step first, and CI that mirrors what you'd actually run locally.

## What's inside

- **Runtime deps**: `@oclif/core`, `@salesforce/core`, `@salesforce/sf-plugins-core` — the same three packages any `sf` plugin needs.
- **Build**: TypeScript (strict, ESM, Node16 resolution), orchestrated by Wireit so `npm run build` only redoes work when inputs changed.
- **Lint/format**: Biome, one config (`biome.json`), no ESLint/Prettier split to keep in sync.
- **Tests**: Vitest for unit tests (`test/**/*.test.ts`) with coverage thresholds, and `@salesforce/cli-plugins-testkit` for NUTs (`test/**/*.nut.ts`) that exercise the compiled plugin through a real `sf` process.
- **Mutation testing**: Stryker, wired to run incrementally against only the files a PR changed (`scripts/incremental-mutation.mjs`), with an optional full run and dashboard upload via `workflow_dispatch`.
- **Git hooks**: Husky, via three hooks:
  - **commit**: `lint-staged` runs Biome against staged files only.
  - **commit-msg**: commitlint enforces Conventional Commits.
  - **pre-push**: `npm run readme` (a full build, via wireit's dependency graph, then `oclif readme`) — the push is blocked if regenerating the README's [Command Reference](#command-reference) produces a diff, so it never drifts from the actual commands.
- **Dependency hygiene**: `knip` flags unused exports/files/deps; `ls-engines` checks the dependency tree against the `engines.node` floor.
- **CI**: GitHub Actions for lint + unit tests + NUTs across OS/Node matrices, MegaLinter on PRs, incremental Stryker on PRs, and a release pipeline (release-please → npm publish via OIDC → post-publish smoke test).
- **GitHub Action**: the example command is also wrapped as a committed, bundled `action.yml` so consumers can `uses: <owner>/<repo>@v1` in their own workflows without installing the plugin — see [GitHub Action](#github-action).

## Using this template

1. Click **Use this template** on GitHub (or `gh repo create my-plugin --template mcarvin8/3dx --public`), then clone it.
2. Run `npm install` followed by `npm run init` to rename the plugin. It prompts for the new npm package name, oclif topic, `package.json` description, and GitHub `owner/repo` (guessed from `git remote origin` if one is set), then:
   - renames `src/commands/3dx/` and `test/commands/3dx/` to your topic
   - renames `messages/3dx.hello.md` and updates the `Messages.loadMessages('3dx', ...)` call in each command
   - rewrites `package.json` (`name`, `description`, `oclif.topics`, `repository.url`, `bugs.url`) and the `sf plugins install --force 3dx@latest` line in `.github/workflows/smoke-test.yml`
   - resets the version to `0.0.1`, clears `CHANGELOG.md`, and deletes itself when done

   For a non-interactive run, pass flags instead: `npm run init -- --name=@myorg/my-plugin --topic=my-plugin --description="..." --repo=myorg/my-plugin --yes`.
3. Replace the example `hello` command with your first real command (see [Adding a command](#adding-a-command)), or delete it if you're starting from a bare skeleton.
4. `npm install` again to refresh `package-lock.json` under the new name, then `npm run build && npm test` to confirm everything still passes.
5. If you want npm Trusted Publishing (no `NPM_TOKEN` secret), register this repo + the `release.yml` workflow as a trusted publisher at `https://www.npmjs.com/package/<name>/access` before your first tagged release. Otherwise, see the comment in `release.yml` for the classic-token alternative.
6. **Grant the `GITHUB_TOKEN` write access.** In repo **Settings → Actions → General → Workflow permissions**, select **Read and write permissions** and check **Allow GitHub Actions to create and approve pull requests**. Both are required:
   - `release-please` (`release.yml`) needs write access to open/update the release PR and push the release commit.
   - MegaLinter's auto-fix step (`megalinter.yml`, `git-auto-commit-action`) needs write access to push formatting fixes back to PR branches.

   Without this, both fail with a 403 (`release-please` errors on PR creation; MegaLinter's commit step is silently skipped).
7. **Add repo secrets** under **Settings → Secrets and variables → Actions → New repository secret**:
   - `CODECOV_TOKEN` — required for the coverage upload step in `test.yml`/`release.yml` to succeed.
     - Add this repo at [codecov.io](https://about.codecov.io/) first, then copy the token from the repo's Codecov settings.
     - Scaffolding several plugins from this template? Use your [global upload token](https://docs.codecov.com/docs/codecov-uploader#organization-token) instead (Codecov org settings → **Global Upload Token**) — one token works across all your repos, so there's no per-repo token to hunt down each time.
     - `test.yml` also runs on Dependabot's PRs (e.g. the dev-dependencies bump), but Dependabot-triggered runs can't see regular Actions secrets — GitHub withholds them unless the secret is also added under **Settings → Secrets and variables → Dependabot → New repository secret**. Add `CODECOV_TOKEN` there too (same value, global or per-repo), or coverage upload silently fails on every Dependabot PR.
   - `TESTKIT_*` (`TESTKIT_AUTH_URL`, `TESTKIT_HUB_USERNAME`, `TESTKIT_JWT_CLIENT_ID`, `TESTKIT_JWT_KEY`, `TESTKIT_HUB_INSTANCE`) — optional, only needed if you point NUTs at a real Dev Hub instead of `devhubAuthStrategy: 'NONE'`.
   - `STRYKER_DASHBOARD_API_KEY` — optional, only needed for the full mutation run's dashboard upload (`workflow_dispatch`).

## Project layout

```
src/
  commands/3dx/hello.ts   # one command = one file; thin wrapper over src/core
  core/hello.ts             # the actual logic — a plain function, no oclif/Action deps
  action/{index,main}.ts    # GitHub Action entrypoint, wraps src/core the same way
  index.ts                  # oclif plugin entry point (leave as `export default {}`)
messages/
  3dx.hello.md             # summary/description/examples/flag text, loaded via Messages
test/
  commands/3dx/hello.test.ts  # unit test — imports the command class directly
  commands/3dx/hello.nut.ts   # NUT — drives the compiled plugin through execCmd
  core/hello.test.ts          # unit test — imports the pure logic function directly
  action/main.test.ts         # unit test — mocks @actions/core and src/core
action.yml                    # GitHub Action manifest, see GitHub Action
dist/action/index.cjs         # committed esbuild bundle the Action manifest points at
```

Command, message file, unit test, and NUT are named to mirror each other 1:1 — that mapping is what `knip.config.ts` and the Stryker `mutate` excludes assume. `src/core/hello.ts` is what makes the command and the Action reusable from one place — see [GitHub Action](#github-action).

## Adding a command

1. Add `messages/<topic>.<command>.md` with `# summary`, `# description`, `# examples`, and `# flags.<name>.summary` sections per flag.
2. Add `src/commands/<topic>/<command>.ts` extending `SfCommand<YourResultType>`, loading the message file via `Messages.loadMessages('<package-name>', '<topic>.<command>')`.
3. Add a unit test under `test/commands/<topic>/<command>.test.ts` that calls `YourCommand.run([...])` directly and asserts on the returned result.
4. Add a NUT under `test/commands/<topic>/<command>.nut.ts` using `execCmd` from `@salesforce/cli-plugins-testkit`.
5. Run `npm run readme` to regenerate the [Command Reference](#command-reference) from your command's flags and message file, then commit the updated `README.md`.
6. Want this command exposed as a [GitHub Action](#github-action) too? Extract its logic into `src/core/<command>.ts` as a plain function (that's already how `hello` is wired), then have both the command class and `src/action/main.ts` call it. The template only wires the Action to one command at a time — exposing more than one is a per-plugin decision (either branch on an Action input, or ship additional `action.yml` files in subdirectories).

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

_See code: [src/commands/3dx/hello.ts](https://github.com/mcarvin8/3dx/blob/v1.3.0/src/commands/3dx/hello.ts)_
<!-- commandsstop -->

## Scripts

| Command                             | Does                                              |
|-------------------------------------|---------------------------------------------------|
| `npm run build`                     | Compile + lint + Action bundle                    |
| `npm run build:action`              | Bundle `src/action` into `dist/action/index.cjs`  |
| `npm test`                          | Compile tests + unit tests (with coverage) + lint |
| `npm run test:only`                 | Unit tests + coverage, no lint/compile            |
| `npm run test:nuts`                 | NUTs against the built plugin                     |
| `npm run test:mutation`             | Full Stryker run                                  |
| `npm run test:mutation:incremental` | Stryker against files changed vs. the base branch |
| `npm run lint` / `format`           | Biome check / write                               |
| `npm run lint:dependencies`         | knip — unused files/exports/deps                  |
| `npm run lint:engine`               | ls-engines — dependency tree vs. `engines.node`   |
| `npm run clean`                     | Remove build/test artifacts                       |

## CI workflows

- **`test.yml`** — runs on every push to a non-main branch and via `workflow_call`: lint (including a check that `dist/action` is rebuilt and committed), unit tests + coverage (matrix across ubuntu/windows/macos × Node 22/24/26), then NUTs on the same matrix.
- **`release.yml`** — on push to `main`: rebuilds `dist/action` if stale; release-please opens/updates a release PR; when a release is published, it publishes to npm (OIDC Trusted Publishing), moves the floating `vN` tag consumers pin the Action to, and triggers the smoke test.
- **`smoke-test.yml`** — installs the just-published plugin into a real `sf` CLI and reruns the NUT suite against it, cross-OS.
- **`smoke-test-action.yml`** — exercises the GitHub Action itself: `./` (the checkout about to merge) on PRs touching Action files, `@vN` (the live published tag) on manual `workflow_dispatch`.
- **`megalinter.yml`** — broad-spectrum linting on PRs (secrets, Dockerfiles, shell scripts, YAML, etc. — Biome already owns JS/TS, so those linters are disabled in `.mega-linter.yml` to avoid overlap).
- **`mutation.yml`** — incremental Stryker on PRs (scoped to changed files, posts a PR comment); full run + optional dashboard upload via manual `workflow_dispatch`. Both jobs `npm install typescript@6.0.3 --no-save` right after `npm run compile` — Stryker's TypeScript checker plugin doesn't yet support TS 7 (only "experimental support" as of Stryker 10), so the repo's real TS 7 toolchain builds the plugin, then gets swapped for a TS 6 copy for just the mutation run. `--no-save` keeps `package.json`/the lockfile untouched, and the downgrade never leaves the job — runners are thrown away after each run.

## GitHub Action

The `hello` example is also shipped as a native GitHub Action (`action.yml`, `runs.using: node24`) — not a wrapper that shells out to `sf plugins install`. It imports the same `src/core/hello.ts` function the CLI command calls, and esbuild bundles it (plus `@actions/core` for typed inputs/outputs) into a single, git-committed `dist/action/index.cjs`. A consumer's workflow gets:

```yaml
- uses: <owner>/<repo>@v1
  with:
    name: 'World'
```

with no `sf` CLI install step, no plugin install, and typed `outputs.message` — just the Node runtime GitHub Actions already provides.

**Why the bundle is committed, not built on demand:** GitHub Actions runs a `node24`-type Action's `main` file straight from the git ref a consumer pins (`@v1`, a SHA, a branch) — there's no build step in between. `dist/action/index.cjs` has to already exist at that ref. `test.yml`'s lint job re-runs `npm run build:action` and fails on any diff against the committed copy, so the bundle can't silently drift from `src/action`/`src/core`; `release.yml`'s `rebuild-dist` job is the safety net that keeps `main` itself current.

**Versioning:** `release.yml` moves a floating `vN` tag (major version only) to every published release commit, so consumers pin `@v1` rather than an exact patch — the same convention `actions/checkout` and most published Actions use.

**Extending to more commands:** the template wires exactly one command to the Action. See step 6 of [Adding a command](#adding-a-command) for the pattern (extract to `src/core/`) and its options for exposing more than one command.

**Not shipping a GitHub Action?** Delete `action.yml`, `src/action/`, `test/action/`, `dist/action/`, the `build:action` wireit task and its `!/lib/action` entry in `package.json`'s `files`, `smoke-test-action.yml`, and the `rebuild-dist` job + floating-tag step in `release.yml`. The `src/core/` split is still good practice to keep even without the Action — it's what makes the command's logic unit-testable without going through oclif's parser.

## Trimming it down

Everything here is meant to be deleted, not just configured. In particular:

- No plans to publish, or to publish infrequently? Delete `release.yml`'s smoke-test trigger and OIDC step; a plain `npm publish` locally is fine.
- Not doing cross-platform NUTs? Collapse the `test.yml`/`smoke-test.yml` matrices to `ubuntu-latest` only.
- Mutation testing and MegaLinter are the two heaviest, most opinionated pieces — drop `mutation.yml`, `stryker.config.json`, `scripts/incremental-mutation.mjs`, `megalinter.yml`, and `.mega-linter.yml` if they're not earning their CI minutes for your plugin.
- Not shipping a GitHub Action? See the last paragraph of [GitHub Action](#github-action) for what to delete.

## License

[MIT](LICENSE.md)
