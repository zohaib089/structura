# Atlasmith handoff

**Date:** 2026-11-24 (Lisbon)  
**Product name:** Atlasmith (the GitHub repo is still [zohaib089/structura](https://github.com/zohaib089/structura))  
**`main` tip:** `070c85a` (includes [#124](https://github.com/zohaib089/structura/pull/124))  
**Current `graph.json` schema:** 1.8.0

This is a pause handoff. It points at existing docs rather than repeating them.

## What Atlasmith is

A local-first tool for understanding code architecture. The engine and CLI write a deterministic, source-text-free `graph.json`. There is a static offline graph viewer, and an optional hosted dashboard (Fastify API + Postgres) for workspaces, sign-in, and project scans.

Supported languages today: TypeScript, JavaScript, Vue, Python, Go, Java, and Rust. Schema 1.8.0 added Rust; 1.7.0 added structured message codes (`code` and `params`).

## How to run it

Follow the root [README](../README.md). It covers Node.js 22+, `npm ci` / `npm run build`, the CLI (`npx atlasmith scan .`), the static viewer, and Docker Compose for the hosted web app (`http://localhost:5173`) and API (`http://localhost:4100`).

- Web / viewer detail: [apps/web/README.md](../apps/web/README.md)
- VS Code extension (E1, local only, not published): [packages/vscode-extension/README.md](../packages/vscode-extension/README.md)
- Package layout, tests, and engine/CLI rules: [CONTRIBUTING.md](../CONTRIBUTING.md)

The extension package is `@atlasmith/vscode-extension`, publisher `atlasmith`, version `0.1.0`, `private: true`, engines VS Code `^1.101.0` and Node 22+. Use its README for the local VSIX path; do not publish without zohaib's own approval.

## Plan and progress

- Plan page (private): [Atlasmith competitor comparison and feature plan](https://cursor.com/canvas/store-99ca53d4-ef87-4dc3-acb8-ced305d5ac67/89e45de6-cab1-4362-be92-175fc2428055). The Progress section lists merge commits for PRs #110–#122. Older sections of that page (competitor facts, open-PR status for #64–#69) may be stale.
- Repo knowledge base: [`knowledge/`](./). Decisions, architecture, skills, and dated progress notes live here.
- Latest progress note **on `main`:** [`knowledge/progress/2026-11-23-status-prs-94-109.md`](./progress/2026-11-23-status-prs-94-109.md).
- Open docs PR [#123](https://github.com/zohaib089/structura/pull/123) has the status note for PRs #110–#122 and records graph.json 1.7.0 / 1.8.0. It is not merged.

## Current main

`070c85a` is the merge of [#124](https://github.com/zohaib089/structura/pull/124): remaining scan-report and fallback chrome translated in all 10 locales, landing CTA arrows flipped under RTL, and the unused landing `Navbar.vue` / `FooterSection.vue` removed. Known residuals from that PR are listed below.

Everything through #122 is also on `main`, including project-scoped scans, Go / Java / Rust, message codes, and the S2 landing nav labels.

## Pending

1. **Publish the VS Code extension.** Needs Marketplace and Open VSX publisher accounts for `atlasmith`, a smoke test in VS Code 1.101+, then remove `private: true` and bump `0.1.0`. Publish only with zohaib's own approval. See also [issue #70](https://github.com/zohaib089/structura/issues/70).
2. **Large-project scale test.** A synthetic benchmark landed in #108 (`docs/scale-benchmark.md`); a broader measured test is still outstanding.
3. **IDE extension plan beyond VS Code** (E2–E8, and JetBrains later). E1 is in the repo but not published.
4. **Engine-sourced strings still in English** (quality tips, some explanations and answers that are not rendered from message codes, or codes that still fall back).
5. **A few allow-listed cognates:** French `Actions`, Dutch `Filters`, and `Info`.
6. **Urdu report back chevron** is not flipped under RTL.
7. **Phone graph labels** can overlap in dense spots; e2e does not catch this.
8. **Old PRs to close or rebase:** [#55](https://github.com/zohaib089/structura/pull/55) (workspace settings / members form) and [#59](https://github.com/zohaib089/structura/pull/59) (dashboard graph vs landing hero radial).
9. **Launch work:** benchmark post, launch, interviews, remaining RBAC, and a trademark check.

Do not push or merge to `main` without zohaib's own explicit yes, in his own words.
