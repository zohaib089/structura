# Status and competitor refresh

**Date:** 2026-11-12 (Lisbon)

Full working copy, with tables and sources: [Atlasmith competitor comparison and feature plan](https://cursor.com/canvas/store-99ca53d4-ef87-4dc3-acb8-ced305d5ac67/89e45de6-cab1-4362-be92-175fc2428055) (sections 4a to 4e). The durable version is in [`strategy/competitor-analysis.md`](../strategy/competitor-analysis.md).

## Status of main

- `main` is at `896260b`.
- PR #63 was squash-merged on 2026-11-11 (Lisbon). It added the Linear / Radial graph switch, zoom that keeps focus, and a Back button in the file drawer. All 7 CI checks passed.
- PR #62, the API restructure into `db`, `routes`, `services`, `workers` and `analysis` (Stages 1 to 5), is on main at `5e69ddc`.
- PR #61, S2 translations for 10 locales, is on main at `b3bdf1e`.

## Open local work (not pushed)

| Work | Branch | Commit | State |
| --- | --- | --- | --- |
| IDE extension E1 (`packages/vscode-extension`) | `cursor/e1-vscode-graph` | `cb1fa0a` | Desktop visual check passed. Narrow-pane fixes remain. Not published. |
| API restructure Stages 6 and 7 (auth-route extract, `tsconfig.build`) | `cursor/api-structure-stages-6-7` | `de7d1ec` | Done locally, 2 commits ahead of main. Not pushed. |
| Auth rate limit | `fix/auth-rate-limit` | `9e6e0f0` | Separate worktree. Not reviewed in this refresh. |

## What the competitor check found

- **repowise** is now the closest competitor. It is open source and self-hosted. It covers the graph, git hotspots and co-change, health scores, dead code, living docs, PR change risk and MCP tools.
- **CodeRabbit**, **Codacy** and **DeepSource** lead on PR comments, one-click fixes and editor checks for AI-written code.
- **Sonar** stopped selling Structure101 and deprecated its old architecture-as-code. It now lets an AI agent help define architecture rules (SonarQube Cloud only).
- **Sourcegraph Cody** reaches end of life on 2027-01-31.
- **CodeViz** offers maps and plain-English diagrams in VS Code, using cloud models.

## Gaps

Ranked gaps that are still open:

1. IDE extension
2. Full roles and permissions
3. PR / CI comment
4. Git hotspots
5. Languages
6. Duplicates and quality scores
7. Plain-English Q&A

The PR comment, hotspot and language gaps got wider tonight.

New gaps:

- One-click fix suggestions
- Impacted tests
- Packaged agent plugins or skills
- Living docs with freshness
- Agent-assisted rule setup

## Ahead-of-market ideas

These were not found in the sources checked. Size is in brackets.

- **A1 Agent pre-flight rule check (M):** before an AI agent edits, an MCP tool says whether the plan would break a rule.
- **A2 Graph picture in the PR comment (M):** a before/after picture of what changed, offline, with no source text.
- **A3 Offline map pack (S):** one HTML file with the map, file cards and findings, with no code in it.
- **A4 Story-mode tour (M):** a tour that starts at the entry point, built from the graph with no AI model.
- **A5 Privacy receipt (S):** each scan records hashes and a no-network statement that anyone can re-check.
- **A6 Ask the map, no AI model (S/M):** fixed plain-language questions answered from the graph.
- **A7 Rule-break timeline (M/L):** shows which commit first broke each rule.
- **A8 File cards in 10 languages (M):** plain-language cards and fix text in the reader's language.
- **A9 Locked current architecture (S):** today's structure becomes the rule set, and only new breaks are flagged.

## What to improve, in order

1. E1 narrow-pane fixes.
2. Linear graph fixes:
   - edge framing on dense files
   - fit that allows for the open drawer
   - indent for expanded groups
   - tooltip overlap
   - small pill text
   - "Used by" and "Uses" column titles
   - remember the layout choice (today it lasts one session)
3. Drift explanations: why each break matters and how to fix it.
4. Show every import cycle. Today only the top 10 are listed.
5. Rewrite the stale vision doc, or mark it superseded.
6. Settle Decision 012, which is still marked Proposed.
7. MCP: fuzzy `symbol_lookup` and batched calls.
8. Impact: mark test files.
9. Check that every landing example matches a finding Atlasmith really produces.

## Recommended next 3 builds (need zohaib's approval)

1. **Finish E1 and build a private VSIX.** Includes the shared viewer polish. Nothing is published.
2. **PR / CI check (R5).** A GitHub Action posts a plain-language comment with drift explanations.
3. **RBAC-1.** Change role, remove member, and protect the last owner, with server checks.

## Sources that were not fetched

The official Snyk and Madge pages were not opened. Facts about them come from third-party pages. CodeScene, Swimm and Greptile were not re-checked; their Nov 10 facts stand.
