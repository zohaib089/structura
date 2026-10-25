# Phase 0 Discovery — Initial Findings

**Started:** 2026-10-20  
**Status:** Remaining discovery and security gates continue alongside Phase 1 and Phase 2 groundwork  
**Primary plan:** [Product Vision and Implementation Roadmap](../strategy/product-vision-and-implementation-roadmap.md)

## Repository evidence reviewed

- Current product shape is a Vue 3/TypeScript web client, Fastify/TypeScript API, PostgreSQL, and Docker Compose development setup.
- The web client has a landing page, authentication flows, initial dashboard, Vue Flow dependency, Lucide icons, and initial Vitest/Playwright tests.
- The Knowledge Base has initial design-system and coding standards. The updated change-impact protocol now requires contributors to search existing features, inspect consumers/contracts/data/tests, compare reuse vs new implementation, and assess relevant risks before changing behavior.
- The API has initial email/password auth, session records, workspace/project records and APIs, and server-side session/membership checks for those routes. Repository-source ownership, source ingestion, durable analysis jobs, report/graph persistence, and provider integrations are not implemented. A pure analysis-job lifecycle contract exists but is not wired to persistence or workers.
- No target customer research or representative repository corpus was found in the reviewed project documentation. The initial nine-language priority set and both GitHub/GitLab requirement are captured in Decision 008. Decision 010 sets 90-day maximum retention periods, 90-day backup expiry, and a worldwide compliance target; legal mapping and technical enforcement remain open.
- The current auth status note identifies production readiness gaps. Private source ingestion must remain out of scope until authorization, tenant isolation, session handling, and the source-code data threat model are approved and implemented.

## Product-owner direction captured

Responses received:

- **First user:** Product owner delegated selection. Initial choice: engineering leads/CTOs at software teams as the buyer/discovery focus; design role-aware workflows for developers and platform/security users too. This is a product hypothesis, not validated customer research.
- **Source paths:** Product direction is to support single-file upload, whole-project upload, and Git repository connection. All are desired capabilities, not a requirement to deliver in one release.
- **First vertical slice:** Whole-project archive upload.
- **Languages:** Multi-language support is required. Initial priorities selected: JavaScript/TypeScript, Python, Java, C#/.NET, Go, Rust, PHP, Ruby, and C/C++. Keep contracts language-neutral and validate each adapter against a representative corpus. Additional "other" languages were selected but not specified and need follow-up.
- **Git providers:** Both GitHub and GitLab are required product integrations. Defer implementation from the archive-first vertical slice; prototype both provider adapters in parallel against a shared contract.
- **Data handling:** Private by default; do not reuse source code for model training. Decision 010 sets 90-day maximum retention for source and derived artifacts, 90-day backup expiry, and a worldwide compliance target; the compliance and implementation evidence remains outstanding.
- **Recommendation:** Reports should be smart/role-aware across user types, keeping underlying evidence and severity stable while changing presentation and prioritization by context.

## Recommended product framing

Start with read-only multi-language repository analysis from a bounded project archive, with support depth validated per adapter and against a representative corpus. It should produce an explainable graph and evidence-backed report, identify candidate entry points, and disclose uncertainty. Build shared source-ingestion and analysis contracts so single-file and Git adapters can be added later without duplicating the analysis engine.

The first persona selection is a working assumption approved for planning; interview target engineering leads and developers before locking MVP positioning. The "smart enough" requirement is captured as role-aware report lenses, not an opaque AI score.

Decision 008 records the initial nine-language priority set and requires both GitHub and GitLab, with parallel provider prototypes. Phase 1 foundation work and Phase 2 source-independent groundwork are active while Phase 0 research and security gates continue; source ingestion itself remains blocked until those gates are satisfied.

## Discovery outputs still to create

- Persona and problem interviews; measurable MVP success criteria.
- Representative, permission-cleared JavaScript/TypeScript repositories with expected graph and finding results.
- Threat model/data-flow and legal/compliance mapping for the 90-day retention/deletion policy and worldwide region requirements.
- Versioned graph, finding, report, job-state, role-aware report, and change-guidance contract drafts.
- Decision records for language/provider contracts, parser approach, archive guardrails, storage/queue/worker boundary, and analyzer/plugin extensibility.
- Measured graph-quality, finding-precision, runtime, and size targets before making broad capability claims.

## Change-aware guidance requirement

The product should inspect existing repository behavior before it recommends adding or editing functionality. It should show related existing features, reusable implementations and patterns, likely affected dependents/contracts, safer implementation alternatives, and relevant regression/security/data/performance/reliability/UX/test risks. Each item must distinguish source-backed impact from inference or unknowns. Recommendations stay advisory unless the user explicitly asks Structura to implement a change. Presentation can adapt to a user's engineering-lead, developer, or platform/security role while preserving the source evidence.

## Password visibility follow-up

During Phase 0 work, the auth field audit found that all password inputs use the shared `AuthField` component and had no visibility toggle. Accessible per-field show/hide controls with Lucide icons were added and verified by unit and browser tests.
