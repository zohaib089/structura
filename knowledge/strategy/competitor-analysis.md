# Competitor analysis

**Last updated:** 2026-11-12 (Lisbon). Live working copy: [Atlasmith competitor comparison and feature plan](https://cursor.com/canvas/store-99ca53d4-ef87-4dc3-acb8-ced305d5ac67/89e45de6-cab1-4362-be92-175fc2428055).

This file is the lasting summary. Update it when the market or Atlasmith changes. "Unknown" means a fetched source did not confirm it.

## Where Atlasmith stands

Atlasmith turns a codebase into a map that anyone can read.

- It scans locally and deterministically, with no network and no telemetry.
- It parses TS, JS, TSX and Python.
- It shows a Nucleus graph (radial or linear) that starts from the entry point.
- Architecture rules live in `atlasmith.yml`, and CI fails with exit code 4 when one is broken.
- It has `query`, `explain` and `impact` commands, and a read-only MCP server for AI agents.
- It exports to Mermaid, Structurizr, LikeC4, SVG and Obsidian.
- The hosted dashboard shows reports with findings, including unused files, exports and dependencies, and import cycles.
- The UI is translated into 10 locales.

## Competitors (as of Nov 2026)

| Tool | Strength | Atlasmith difference |
| --- | --- | --- |
| repowise | Open source, self-hosted. Graph in many languages, git hotspots, co-change, ownership, health scores, dead code, living docs, decision records, PR change risk, 10 MCP tools. | Closest rival. Atlasmith has a simpler UI for non-technical users, an entry-point map, enforced rules, and no AI model anywhere in the path. |
| CodeRabbit | AI PR review, code graph, one-click fixes, a VS Code / Cursor extension and a CLI, agent plugins. | It is a review bot, not a map. It works in the cloud. |
| Codacy | 49 languages, AI reviewer, editor checks on AI-written code, merge gates. | Cloud only. No architecture map. |
| DeepSource | Static analysis with Autofix, PR report cards. | No architecture map. |
| Snyk Code | Security scanning, Agent Fix. | Security focus only. |
| SonarQube | Quality gates, IDE extension. It bought Structure101 and now lets an agent help define architecture in the cloud. | Atlasmith's rules work offline and in plain language. |
| Sonargraph | Java architecture conformance. | Java only. 2026 details Unknown. |
| CodeScene | Hotspots, CodeHealth, knowledge silos, IDE extension. | Atlasmith has no history signal yet. |
| Sourcegraph | Code Search, Deep Search, MCP. Cody ends on 2027-01-31. | Enterprise search, not a map. |
| CodeViz | VS Code maps, plain-English diagrams, C4 views. | Needs internet and cloud models. |
| DeepWiki / Google Code Wiki | AI wikis for public repos. | Hosted, public code first. |
| Swimm | Docs that stay tied to code, `/ask`. | Docs, not structure. |
| Greptile | AI PR review with graph context. | Review, not a map. |
| dependency-cruiser / Madge | Free JS import graphs, cycles, rules. | Developer-only output. |
| CodeCharta | 3D city map of metrics. | No rules or MCP. |
| CodeSee | Gone as a standalone product (now part of GitKraken). | The visual-map space is open. |

## What sets Atlasmith apart

1. A fully local, zero-telemetry, deterministic scan with a graph that contains no source text.
2. An entry-point Nucleus map in plain language for non-technical people, in 10 languages.
3. Architecture rules as code that work offline and in CI.
4. Context for AI agents through MCP, with a bench that measures it.
5. No lock-in, through open export formats.

## Gaps, ranked

1. IDE extension (E1 is local and not published)
2. Full roles and permissions
3. PR / CI comment
4. Git hotspots and co-change
5. More languages
6. Duplicates and quality scores
7. Plain-English Q&A

New gaps since 2026-11-12:

- One-click fixes
- Impacted tests
- Packaged agent plugins or skills
- Living docs with freshness
- Agent-assisted rule setup
- SSO
- Proven large-project scale

## Ahead-of-market ideas

These were not found in the sources checked on 2026-11-10 and 2026-11-12:

- A1 Agent pre-flight rule check
- A2 Graph picture in the PR comment
- A3 Offline map pack
- A4 Story-mode tour
- A5 Privacy receipt
- A6 Ask the map with no AI model
- A7 Rule-break timeline
- A8 File cards in 10 languages
- A9 Locked current architecture

Size, why each matters, and which existing parts each reuses are on the Page (section 4c).

## Main sources

- https://docs.repowise.dev/
- https://docs.coderabbit.ai/overview/introduction
- https://www.codacy.com/comparison/codacy-vs-deepsource
- https://corgea.com/learn/auto-remediation-tools
- https://www.sonarsource.com/structure101/
- https://community.sonarsource.com/t/define-your-architecture-with-your-coding-agent-in-sonarqube/190754
- https://sourcegraph.com/blog/sunsetting-cody-future-of-code-intelligence
- https://marketplace.visualstudio.com/items?itemName=CodeViz.codeviz
- https://repowise.dev/blog/comparisons/best-codebase-visualization-tools (written by a vendor)

Nov 10 sources for CodeScene, Swimm, Greptile, dependency-cruiser and CodeCharta are listed on the Page.
