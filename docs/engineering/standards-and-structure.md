# Atlasmith standards and structure plan

Status: **P0 docs PR** off main (baseline `@12741de`, D3 radial graph). Docs-only — no application code moves. Cloud agents remain paused; this PR opened locally via `gh`. Do not merge until owner/PM approve.

Product name going forward is **Atlasmith only**. The GitHub remote remains `github.com/zohaib089/structura` until the owner renames it; do not plan a GitHub rename. (`LEGACY_SLUG` in `packages/engine/src/brand.ts` is the sole code home for the historical slug.)

## 1. Current layout + problems → target

### Verified tree (`12741de`)

```
apps/web          Vue: hosted dashboard + static viewer mixed under src/
apps/api          Frozen hosted API (Fastify); still in CI
packages/engine   @atlasmith/engine — scan → graph.json
packages/cli      @atlasmith/cli — bin `atlasmith` → dist/bin.js
packages/brand    brand re-export surface (thin)
packages/scan-analysis   offline report.json (used by CLI)
packages/source-ingest   git/archive ingest (used by CLI)
packages/skills   legacy hosted-era skills package (CLI does not import)
packages/test-fixtures   small language fixtures
docs/design, docs/inputs
knowledge/decisions|architecture|coding-standards|progress|…
```

Root workspaces: `apps/*`, `packages/*`. Root scripts build/typecheck/lint/test engine+cli. `tsconfig.base.json`: strict NodeNext. ESLint flat config today only applies `no-restricted-imports` to `packages/engine/src` and `packages/cli/src`.

### Problems

1. **Dual brand leftovers** — `brand.ts` is Atlasmith; repo URL, Docker tags, Compose/DB defaults, Pages bases (`/structura/`), API copy, and many knowledge docs still say the legacy name.
2. **SaaS frozen mixed with live viewer** — `apps/web` hosts both; FE plan D1–D7 (and follow-on D3b node-detail) owns UI work. Do not split hosted vs viewer under `src/` until after **D7**.
3. **CONTRIBUTING.md stale** — claims engine/cli “not in this repository yet”, “no ESLint”, per-package installs only, omits active packages.
4. **Thin ESLint** — restricted-imports miss CONTRIBUTING bans (`vm`, `zlib`, `undici`, `http2`); no coverage for other packages/apps; no import-boundary rules.
5. **Hosted-era knowledge coding-standards** — auth UI / design-system docs still product-name the old stack; contributor standards should move to `docs/engineering`.
6. **docs vs knowledge split** — architecture lives in both; ADRs belong in `knowledge/decisions`; one architecture home.

### Target

| Area | Keep / change |
| --- | --- |
| `apps/web` | Keep; hosted vs viewer folder split **only after FE D7** (coordinate with FE). |
| `apps/api` | Freeze (security/build-break only). |
| Active packages | `engine`, `cli`, `brand`, `scan-analysis`, `source-ingest`, `test-fixtures`. |
| `packages/skills` | Freeze with banner if unused by CLI (confirmed: no CLI import). Do **not** freeze `source-ingest` / `scan-analysis` — CLI depends on both. |
| Contributor standards | `docs/engineering/` (new). |
| Architecture | Single home under `knowledge/architecture/`; ADRs stay in `knowledge/decisions/`. |

## 2. Coding standards (CI)

**Formatter: Prettier.** One-line why: ESLint flat is already the lint investment; Prettier formats without adding a second lint engine (Biome would overlap typescript-eslint).

- Expand ESLint flat to **all** `packages/*` and `apps/*` (ignore fixtures, `dist`, golden corpus).
- Align engine/cli `no-restricted-imports` with CONTRIBUTING: add `vm`, `zlib`, `undici`, `http2` (plus existing process/network bans). Keep `scripts/ci/import-guard.mjs` as the CI source of truth; ESLint mirrors it.
- Import boundaries: `cli → engine` (and cli → scan-analysis / source-ingest) OK; `engine ↛ cli`; apps must not deep-import engine internals except published exports.
- TypeScript: keep `strict` from `tsconfig.base.json`; ban bare `any` via `@typescript-eslint/no-explicit-any` (warn→error).
- Naming: kebab-case files (non-Vue); PascalCase SFCs; product strings **only** via brand module (`packages/engine/src/brand.ts` / `packages/brand`).
- Conventional Commits; PR template (behavior, checks run, gaps); **no push to `main`**; required checks green.
- CI jobs (evolve): lint, format, typecheck, tests, import-guard, later Atlasmith self-scan dogfood.

## 3. Atlasmith self-scan (main @ `12741de`)

**Not blocked** — real run succeeded.

Commands:

```sh
npm ci                          # Node >= 22
npm run build -w packages/engine
npm run build -w packages/source-ingest
npm run build -w packages/scan-analysis
npm run build -w packages/cli
node packages/cli/dist/bin.js scan . --out <store>/standards-and-structure --report --verbose --json
```

CLI entry: `packages/cli` bin `atlasmith` → `./dist/bin.js` (main `dist/index.js`).

### Real numbers

| Metric | Value |
| --- | --- |
| Files discovered / parsed / partial / failed / skipped / ignored | 574 / 345 / 1 / 0 / 209 / 19 |
| Graph files (summary) | 555 |
| Nodes / edges | **2619** / **3838** |
| Edge types | contains 2566, imports 1180, reexports 92 |
| Entry candidates | 9 across 9 files |
| Unresolved | non-literal-specifier 3, not-found 9 |
| Skipped | unsupported-language 208, sensitive-file 1 |
| Findings (report) | **1396** (all `graph-heuristics`) |
| Finding mix | unused-export 1021, unused-file 327, large-function 14, high-fan-in 12, god-module 9, import-cycle 8, large-file 5 |
| Analysers skipped | eslint, ruff, semgrep, gitleaks, pip-audit (not on PATH); history + npm-audit + graph-heuristics ran |

Artifacts: `scan-output.txt`, `graph.json`, `report.json`, `run.json` (and `cache.json`) in this folder.

### Top issues (from scan)

1. **Import cycles (8)** in CLI around `packages/cli/src/run.ts` ↔ `bench/command`, `export-commands`, `graph-commands`, `impact-command`, `mcp-command`.
2. **God modules / high fan-in** — `engine/src/graph/types.ts` (30 in), `adapters/adapter.ts` (23), `engine/src/index.ts` (20); also `locale.ts`, report types, `cli/src/run.ts`.
3. **Large files/functions** — web message catalogs + viewer `overview.ts` / `read-graph.ts`; `engine/src/scan/scan.ts` (`scanRepository` ~354 lines); frozen API route registrars still flagged.
4. **Unused-export / unused-file flood** — mostly info/low; treat as dogfood signal, not a mass-delete mandate.
5. **External hotspots** — highest in-degree are Node builtins (`fs`, `path`, `assert`, `test`) and `vitest` (expected for a TS monorepo).

## 4. PR sequence (respect FE D3b–D7)

**FE gate:** Open / land PR **#44 D3b** (`cursor/d3b-node-detail-panel-3ef1`) on the FE track. **No `apps/web` refactors** for structure/hosted-vs-viewer until **D7** unless FE explicitly coordinates.

| Step | Scope | Notes |
| --- | --- | --- |
| **P0** | This plan + scan artifacts | Docs-only. |
| **P1** | Refresh CONTRIBUTING + PR template | Fix stale “no ESLint / packages missing”; document workspaces, brand module, offline CI, active packages. |
| **P2** | **Strip leftover legacy slug** | Dedicated small PR (not mixed with formatter/ESLint). Grep sweep of user-facing + code refs: package.json `name`/`description`/`keywords`, UI copy, docs (non-ADR historical OK to leave or footnote), Docker image/user names, Compose/env defaults, Pages `PAGES_*_BASE`, CI smoke tags. **Leave git remotes and GitHub repo URL `zohaib089/structura` alone.** CI must stay green. Prefer `atlasmith` / Atlasmith; keep `LEGACY_SLUG` only inside brand. |
| **P3** | Brand import surface | Enforce brand-only literals; wire `packages/brand` where apps still hard-code. |
| **P4** | Prettier + expanded ESLint + CI | Owner/PM go-ahead required. |
| **P5** | Dogfood CI self-scan job | Run `atlasmith scan` on the repo; upload/store graph+report; fail on agreed gates later. |
| **P6** | Freeze banners | `apps/api` + unused `packages/skills` (and any truly orphan package). |
| **P7** | After D7 | Split hosted vs viewer under `apps/web/src/` only. |

P0 is docs-only. **P4+ need owner/PM go-ahead.** P2 is early so contributor docs (P1) and brand enforcement (P3) do not keep teaching the legacy name.


## Appendix A — CONTRIBUTING drift (verified)

Stale claims to fix in **P1**:

- Opens with the legacy product name and says engine/cli are “not in this repository yet” — both exist and root `npm run build` builds them.
- “There is no ESLint … no `npm run lint`” — root has `eslint.config.mjs` and `npm run lint` (engine restriction script + eslint on engine/cli src).
- Describes non-workspace per-app `npm ci` only — root `package-lock.json` + npm workspaces `apps/*`, `packages/*` now exist (apps still keep their own locks for CI cache paths).
- Frozen-app policy still useful for `apps/api`; `apps/web` is **not** feature-frozen (FE D-track is active) — CONTRIBUTING must not ban viewer/dashboard work wholesale.
- Import-guard section is still correct in spirit; expand listed banned modules to match the guard + this plan (`vm`, `zlib`, `undici`, `http2`).

## Appendix B — ESLint today vs target

**Today (`eslint.config.mjs`):** single block, files `packages/engine/src/**/*.ts` and `packages/cli/src/**/*.ts`, rule `no-restricted-imports` for `child_process`, `cluster`, `net`, `http`, `https`, `dns`, `tls`, `dgram` (and `node:` variants).

**Gaps:** missing CONTRIBUTING modules above; no `apps/web`, `apps/api`, `scan-analysis`, `source-ingest`, `brand`, `skills`; no `no-explicit-any`; no boundary rule forbidding `engine → cli`.

**Target (P4):** flat config ignores for `**/dist/**`, fixtures, golden corpus; prettier as format gate; eslint across packages/apps; engine/cli keep strict network/process bans; other packages get baseline typescript-eslint recommended + import boundaries.

## Appendix C — P2 rename checklist (legacy slug → Atlasmith)

Do in one focused PR; do not combine with P4 tooling.

1. `rg -i 'structura' --glob '!**/package-lock.json' --glob '!**/.git/**'` and triage hits.
2. Update user-facing strings: `apps/api` descriptions/keywords/runtime messages; web UI/copy if any; README wording (repo URL link may remain).
3. Docker/CI: image tags `structura-api:ci` / `structura-web:ci`, Dockerfile user/group, `docker-smoke.sh` names, Compose `POSTGRES_*` / `EMAIL_FROM` defaults, `apps/api/.env.example`.
4. Pages workflow `PAGES_LANDING_BASE` / `PAGES_VIEWER_BASE` (`/structura/…`) — change only with a deliberate Pages URL decision; if public URLs must stay stable short-term, document exception in the PR and track follow-up.
5. Scripts using temp prefixes (`structura-corpus-`, etc.).
6. **Do not** change `git remote`, GitHub repo name, or clone URLs in docs that point humans at `github.com/zohaib089/structura`.
7. Historical ADRs under `knowledge/decisions/*` may keep past tense references once, or add a one-line “now Atlasmith” note — prefer not rewriting history in place during P2 if it churns review; new docs use Atlasmith only.
8. Confirm `packages/engine/src/brand.ts` remains the only intentional `LEGACY_SLUG` definition; brand tests still pass; CI green.

## Appendix D — Freeze policy detail

- **`apps/api`:** frozen product surface; P6 adds an explicit README/banner. Touch only for security or CI break. Self-scan large-function hits here are informational until unfrozen.
- **`packages/skills`:** not imported by CLI; freeze or archive path in P6.
- **`packages/source-ingest` + `packages/scan-analysis`:** **active** — required by `@atlasmith/cli` (`scan-target.ts`, `run.ts`). Build them before CLI.
- **`packages/brand`:** keep; P3 tightens consumers to import brand constants instead of literals.

## Appendix E — FE coordination

| Item | Action |
| --- | --- |
| D3 landed | Radial graph @ `12741de` (#42) |
| D3b | Node detail panel — open PR #44 branch `cursor/d3b-node-detail-panel-3ef1` on FE track |
| D4–D7 | Report, stepper, projects, landing — FE-owned |
| Hosted vs viewer `src/` split | **P7 only after D7** |

Standards PRs must not reorder FE D-track work.

## Out of scope now

Opening the GitHub PR from CloudAgent, renaming the GitHub repository, mass-deleting “unused” exports from the self-scan, and any `apps/web` structural split before D7.
