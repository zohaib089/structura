# Contributing

**Atlasmith** is a local-first TypeScript CLI (`packages/cli`) over a library (`packages/engine`) that scans a repository with `web-tree-sitter` (WASM) and writes a deterministic `graph.json`, plus a static Vue viewer in `apps/web`. The product name is Atlasmith only. The GitHub remote remains `github.com/zohaib089/structura` until the owner renames it — that URL is fine in clone/docs links; do not reintroduce the legacy product name in new copy.

Product strings in code should come from the brand module (`packages/engine/src/brand.ts`, re-exported via `packages/brand`), not hard-coded literals.

Engineering standards and the cleanup PR sequence live in [`docs/engineering/standards-and-structure.md`](docs/engineering/standards-and-structure.md) (land via the P0 docs PR if it is not on `main` yet).

## Setup

Use Node.js 22+ and npm. The root is an **npm workspaces** monorepo (`apps/*`, `packages/*`) with a root `package-lock.json`. Some apps also keep their own lockfiles for CI cache paths.

```sh
npm ci --ignore-scripts
npm run build          # engine + cli (and their workspace deps)
npm run typecheck
npm run lint
npm test
```

Per-app installs still work when you need them:

```sh
cd apps/api && npm ci --ignore-scripts && npm run typecheck && npm test
cd apps/web && npm ci --ignore-scripts && npm run typecheck && npm run test:unit
npx playwright install --with-deps chromium
npm run test:e2e
```

Playwright is Chromium only.

### Lint and import guard

Root `eslint.config.mjs` applies today to `packages/engine/src` and `packages/cli/src` (`no-restricted-imports` for process/network modules). Run:

```sh
npm run lint
node scripts/ci/import-guard.mjs
bash scripts/ci/import-guard-self-test.sh
node scripts/ci/check-corpus-excludes.mjs
```

On Linux, the offline wrapper is:

```sh
bash scripts/ci/with-netns.sh node scripts/ci/assert-network-denied.mjs
bash scripts/ci/with-netns.sh bash scripts/ci/run-engine-cli-offline.sh
```

`with-netns.sh` needs `sudo` because Ubuntu 24.04 blocks unprivileged user namespaces. It drops back to your uid/gid before running the command.

## Active packages

| Path | Role |
| --- | --- |
| `packages/engine` | `@atlasmith/engine` — scan → `graph.json` |
| `packages/cli` | `@atlasmith/cli` — bin `atlasmith` |
| `packages/brand` | Brand re-exports |
| `packages/scan-analysis` | Offline `report.json` (CLI dependency) |
| `packages/source-ingest` | Git/archive ingest (CLI dependency) |
| `packages/test-fixtures` | Small language fixtures |
| `packages/skills` | Legacy hosted-era package; not imported by the CLI — treat as frozen unless a change is explicitly about it |
| `packages/vscode-extension` | `@atlasmith/vscode-extension` — local-only VS Code / Cursor / VSCodium graph webview (E1; not published) |

Build `source-ingest` and `scan-analysis` before the CLI when building packages individually.

## Apps policy

- **`apps/api`** — frozen hosted API. Change only for security fixes or build breaks. No new product features.
- **`apps/web`** — contains both the frozen hosted surfaces and the **active** Atlasmith viewer/dashboard track (FE D-track). Viewer and local-first UI work is allowed; do not add new hosted SaaS product features. Do not restructure hosted vs viewer folders until FE D7 lands (see the standards plan).

## Branches and pull requests

Do not push directly to `main`. Open a branch, commit there, and open a pull request.

- Prefer [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, …).
- Keep commits focused. The message should say what changed and why.
- Use the PR template: behavior change, checks you ran, and any check you could not run.
- CI on the pull request has to be green before merge. Do not merge with a red required check, and do not paper over a failure with `continue-on-error`.

## Engine and CLI rules

These apply to `packages/engine` and `packages/cli`, and to anything that scans a repository:

- No network calls and no telemetry.
- Do not spawn processes. That includes `git`, shells, and `child_process` / `cluster`. `worker_threads` is allowed. Parsing runs in-process or in a worker, using WASM.
- Scanned repositories are hostile input. Never execute their scripts, tests, binaries, or Dockerfiles.
- Do not import Node's `vm`, `http`, `https`, `http2`, `net`, `tls`, `dgram`, `dns`, `zlib`, or `undici` from engine or CLI source. The guard matches module specifiers (`import` / `export from`, `require()`, `import()`), with or without the `node:` prefix. It does not flag the word `cluster` in graph code. Non-literal `require()` and `import()` are rejected. Runtime dependencies whose names match `telemetry`, `analytics`, `sentry`, `posthog`, `mixpanel`, or `update-notifier` are rejected.

`scripts/ci/` is the CI harness. It is allowed to use the network during install, and it is allowed to call `child_process` to spawn the guard and the sandbox. Do not copy those patterns into engine or CLI source.

Import direction: `cli → engine` (and CLI → `scan-analysis` / `source-ingest`) is OK; `engine` must not import `cli`.

## Golden corpus

QA's golden-corpus repositories are vendored fixture repos used for golden tests. They are not project source.

The roadmap names `packages/test-fixtures` ("small licensed/owned repositories and golden outputs"). CI also excludes a root `test-fixtures/` directory and any directory named `golden-corpus`. The list lives in `scripts/ci/golden-corpus-paths.txt`. Those paths are excluded from every `tsconfig*.json`, from `.eslintignore`, and from the offline hostile-fixture scan. `node scripts/ci/check-corpus-excludes.mjs` fails if a tsconfig drops the exclude.

Hostile fixtures for the offline scan, when they exist, are only these directories: `packages/engine/fixtures/hostile`, `packages/engine/test/fixtures/hostile`, `packages/engine/test/hostile`, `packages/cli/fixtures/hostile`, `packages/cli/test/fixtures/hostile`, `packages/cli/test/hostile`, and `fixtures/hostile`. They must not be placed inside the golden corpus. The scan command is `node packages/cli/dist/bin.js scan <fixture>` (or the `atlasmith` bin after install). The offline job does not scan the corpus.

## CI

GitHub Actions runs on free GitHub-hosted runners only (no larger runners, no self-hosted runners, no paid services). Workflows are pinned to full action SHAs. Jobs include API/web/skills checks, engine/CLI offline proof, and the import guard / corpus excludes. Prefer extending root workspace scripts rather than inventing parallel install paths.

`.gitattributes` forces LF for text (including fixture sources) and marks `*.wasm` binary so `graph.json` output does not change across operating systems because of line endings.
