# Contributing

Contributions welcome: bug reports, feature requests, doc improvements, and code changes.

**Code changes require a fork.** Do not push branches directly to the main repository.

## Requirements

- Node.js ≥ 22.19
- npm

## Development setup

```bash
# 1. Fork on GitHub, then clone your fork
git clone https://github.com/<your-username>/3dx.git

# 2. Install dependencies
npm install

# 3. Build (re-run after source changes)
npm run build
```

## Code quality

- **Lint + Format:** `npm run lint` / `npm run format` — [Biome](https://biomejs.dev/); enforced in pre-commit via Husky
- **Commit messages:** [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `test:`, `chore:`); enforced by commitlint on commit

## Git hooks (Husky)

| Hook         | Runs            | What it does                                                                        |
|--------------|-----------------|-------------------------------------------------------------------------------------|
| `pre-commit` | on `git commit` | Runs `lint-staged` — applies Biome check + auto-fix to staged `.ts`/`.js` files     |
| `commit-msg` | on `git commit` | Validates the commit message against Conventional Commits via commitlint            |
| `pre-push`   | on `git push`   | Runs `npm run build` — ensures the project compiles before code leaves your machine |

## Testing

Uses [Vitest](https://vitest.dev/). Test files live in `test/` and run in ESM mode.

- **Unit tests (with coverage):**

  ```bash
  npm run test:only
  ```

  New code must satisfy the existing coverage thresholds in `vitest.config.ts`.

- **NUTs:**

  ```bash
  npm run test:nuts
  ```

  Runs serially against `**/*.nut.ts` using `vitest.nut.config.ts`.

- **Full pipeline:** `npm test` — compile + unit tests + lint.

## Pull request process

1. Branch from `main` in your fork (e.g. `fix/issue-description`, `feat/new-command`).
2. Make changes. Confirm `npm run lint`, `npm run test:only`, and `npm run test:nuts` pass.
3. Add or update tests for any behavior change.
4. Open a PR from your fork to `main`. Describe what changed and why; reference any issues.
5. Address review feedback. Maintainers merge on approval.

## Adding a new command

See [Adding a command](README.md#adding-a-command) in the README — it walks through the message file, command class, unit test, and NUT that a new command needs, and why they're named to mirror each other.
