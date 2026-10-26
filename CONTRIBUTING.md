# Contributing

Structura is being re-scoped to a local-first TypeScript CLI (`packages/cli`) over a library (`packages/engine`) that scans a repository with `web-tree-sitter` (WASM) and writes a deterministic `graph.json`, plus a static Vue viewer. `packages/engine` and `packages/cli` are not in this repository yet.

The hosted apps in `apps/` stay in the tree so their tests keep running. They are frozen.

## Setup

Use Node.js 22 and npm. This is not an npm/pnpm workspace: `apps/api`, `apps/web`, and `packages/skills` each have their own `package-lock.json`. Install with lifecycle scripts ignored, then run the package's own scripts.

```sh
cd apps/api
npm ci --ignore-scripts
npm run typecheck
npm test

cd ../web
npm ci --ignore-scripts
npm run typecheck
npm run test:unit
npx playwright install --with-deps chromium
npm run test:e2e

cd ../../packages/skills
npm ci --ignore-scripts
npm run typecheck
npm test
```

Playwright is Chromium only. Install that browser, not the full browser set.

There is no ESLint (or other linter) configuration yet, so there is no `npm run lint`. The import guard below is the check that engine and CLI source must pass. When an ESLint config is added, keep the paths in `.eslintignore` (ESLint flat config does not read that file unless you point it at those patterns).

```sh
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

## Branches and pull requests

Do not push directly to `main`. Open a branch, commit there, and open a pull request.

- Keep commits focused. The message should say what changed and why.
- The pull request description should list the behavior change, how you ran typecheck and tests, and any check you could not run.
- CI on the pull request has to be green before merge. Do not merge with a red required check, and do not paper over a failure with `continue-on-error`.
- `apps/api` and `apps/web` are frozen. Change them only to fix a security issue or a build break. Do not add product features, new screens, or new hosted workflows there. `packages/skills` and `knowledge/` can still be updated when the change is about the local engine, contributor docs, or CI.

## Engine and CLI rules

These apply to `packages/engine` and `packages/cli` once they exist, and to anything that scans a repository:

- No network calls and no telemetry.
- Do not spawn processes. That includes `git`, shells, and `child_process` / `cluster`. `worker_threads` is allowed. Parsing runs in-process or in a worker, using WASM.
- Scanned repositories are hostile input. Never execute their scripts, tests, binaries, or Dockerfiles.
- Do not import Node's `vm`, `http`, `https`, `http2`, `net`, `tls`, `dgram`, `dns`, `zlib`, or `undici` from engine or CLI source. The guard matches module specifiers (`import` / `export from`, `require()`, `import()`), with or without the `node:` prefix. It does not flag the word `cluster` in graph code. Non-literal `require()` and `import()` are rejected. Runtime dependencies whose names match `telemetry`, `analytics`, `sentry`, `posthog`, `mixpanel`, or `update-notifier` are rejected.

`scripts/ci/` is the CI harness. It is allowed to use the network during install, and it is allowed to call `child_process` to spawn the guard and the sandbox. Do not copy those patterns into engine or CLI source.

## Golden corpus

QA's golden-corpus repositories are vendored fixture repos used for golden tests. They are not project source.

They are not in the tree yet. The roadmap names `packages/test-fixtures` ("small licensed/owned repositories and golden outputs"). CI also excludes a root `test-fixtures/` directory and any directory named `golden-corpus`. The list lives in `scripts/ci/golden-corpus-paths.txt`. Those paths are excluded from every `tsconfig*.json`, from `.eslintignore`, and from the offline hostile-fixture scan. `node scripts/ci/check-corpus-excludes.mjs` fails if a tsconfig drops the exclude.

Hostile fixtures for the offline scan, when they exist, are only these directories: `packages/engine/fixtures/hostile`, `packages/engine/test/fixtures/hostile`, `packages/engine/test/hostile`, `packages/cli/fixtures/hostile`, `packages/cli/test/fixtures/hostile`, `packages/cli/test/hostile`, and `fixtures/hostile`. They must not be placed inside the golden corpus. The scan command is `node <cli bin or main> scan <fixture>`. The offline job does not scan the corpus.

## CI

GitHub Actions runs on free GitHub-hosted runners only (no larger runners, no self-hosted runners, no paid services). Workflows are pinned to full action SHAs. Jobs:

| Job | What it runs |
| --- | --- |
| API typecheck and tests | `apps/api`: `npm run typecheck`, `npm test` |
| Web typecheck, unit, and Playwright | `apps/web`: `npm run typecheck`, `npm run test:unit`, Playwright on Chromium. The HTML report is uploaded only when this job fails. |
| Skills typecheck and tests | `packages/skills`: `npm run typecheck`, `npm test` |
| Engine and CLI offline | Proves an empty network namespace blocks `net.connect` to `1.1.1.1:443`. Engine/CLI install, tests, hostile scan, and `strace` are skipped until those packages and fixtures exist. |
| Import guard and corpus excludes | Scans `packages/engine/src` and `packages/cli/src` (a no-op until they exist), rejects a temp file that imports `node:child_process`, and checks golden-corpus excludes. |

`.gitattributes` forces LF for text (including fixture sources) and marks `*.wasm` binary so future `graph.json` output does not change across operating systems because of line endings.
