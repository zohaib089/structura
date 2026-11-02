# Decision 012: Pivot to a Local-First Engine; SaaS Track Frozen

**Date:** 2026-10-25  
**Status:** Proposed. The re-scope was relayed by the Project Manager; it needs the owner's explicit confirmation (zohaib) before it is marked Accepted.

## Context

Decisions 007 to 011 assumed a hosted SaaS: accounts, source ingestion, retention limits, worldwide residency, localized product surfaces. That path carries large legal, security and operations cost before a user can see any value, and the safety gates in Decision 009 and the retention obligations in Decision 010 block ingestion of customer source.

The core value is the analysis itself: a trustworthy map of a repository that says honestly what it extracted and what it guessed. That can be delivered with no server, no accounts, and no source leaving the user's machine.

## Decision

1. Re-scope the product to a **local-first engine**: a TypeScript CLI (`packages/cli`) over a library (`packages/engine`) that scans a repository with `web-tree-sitter` (WASM) and writes a versioned `graph.json`, plus a **static Vue viewer** that opens that file with no server.
2. `graph.json` is the product contract (see the graph contract decisions): versioned (`schemaVersion`, semver), closed schema, deterministic byte-for-byte, no source text, no absolute paths, no timestamps. Every edge is `EXTRACTED` or `INFERRED` and an INFERRED edge carries confidence and a reason.
3. Coverage is loud: every discovered file is accounted for as parsed, partial, failed, skipped or ignored with a reason. A silent drop is an error (exit code 3).
4. The engine makes **no network calls, no telemetry, never executes scanned code, and never spawns processes (including `git`)**. Scanned repositories are treated as hostile input.
5. The **SaaS track is frozen**: `apps/api`, `apps/web` (landing, auth, dashboard), the auth and localization work, and hosted-layer tasks stay in the repository, their existing tests keep running, but they receive no new features and no new design work. They get only fixes for security issues or build breakage. The static viewer is a separate entry point and build and must not depend on them or call `/api/*`.
6. Decisions 009 (Phase 2 safety gates), 010 (retention and residency) and 011 (localization) are **not superseded**; they are dormant and apply again if a hosted layer is revived. Nothing in the local engine retains data beyond what the user writes to their own disk.
7. The product name is provisional (working name Atlasmith; repo still named Structura). Name, binary, config file, output and cache directory names live in one module (`packages/engine/src/brand.ts`); the schema `$id` is brand-free; graph.json contains no brand string.
8. Language scope for the first engine releases is TypeScript/JavaScript and Python, extending Decision 008 only as far as adapters ship with golden-corpus tests.

## Consequences

- Phase 2 hosted analysis work stops; planning docs referencing hosted ingestion should be marked frozen, not deleted.
- Security focus moves from multi-tenant isolation to hostile-repository and hostile-`graph.json` handling (threat model E-10).
- A hosted layer, an MCP server and exports can later consume the same `graph.json`; any change to it follows the compatibility policy (major bump for breaking changes).
- Revisiting the SaaS track requires a new decision that supersedes this one.
- Risk: the SaaS code rots while frozen; mitigated by keeping its test suites green in CI without extending them.

## References

- Graph contract decisions (graph.json v1, threat model inputs)
- [Decision 008](./008-multi-language-and-source-provider-scope.md), [009](./009-phase-2-safety-gates.md), [010](./010-source-retention-and-global-residency.md), [011](./011-localization-and-language-support.md)
