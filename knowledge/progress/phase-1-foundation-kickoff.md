# Phase 1 — Product Foundation Kickoff

**Started:** 2026-10-20  
**Status:** Active; workspace/project API and dashboard vertical slice is implemented, but the broader foundation is incomplete  
**Primary plan:** [Product Vision and Implementation Roadmap](../strategy/product-vision-and-implementation-roadmap.md)  
**Product scope:** [Decision 008 — Multi-Language and Git Provider Scope](../decisions/008-multi-language-and-source-provider-scope.md)

## Phase objective

Establish the secure multi-tenant product foundation needed before Structura accepts customer source code. This phase is not yet repository ingestion or code analysis.

## Existing baseline

- Vue 3/TypeScript web application, Fastify/TypeScript API, and PostgreSQL in a monorepo.
- Current auth issues expiring opaque tokens and persists them in browser localStorage; product APIs now validate those sessions server-side.
- Workspace, membership/role, and project models are now created by versioned migrations; repository source, analysis, artifact, report, and audit models remain future work.
- The dashboard now reads workspace/project data and presents loading, empty, error, and permission-aware project creation states rather than static analysis metrics.
- Source ingestion must remain disabled until tenant authorization, source isolation, worker safety, retention/deletion, and data-flow controls have been reviewed.

## Phase 1 workstreams

1. **Secure identity/tenancy:** define and implement production-appropriate sessions, workspace membership, roles, authorization boundaries, and cross-tenant denial tests.
2. **Product domain:** define migrations and API contracts for workspaces, projects, repository sources, analysis jobs, artifacts, findings, and audit events with ownership relationships.
3. **Shared analysis contracts:** define language-neutral versioned contracts for source snapshots, per-language adapters/capabilities, graph nodes/edges, analysis coverage/limitations, findings, and provenance.
4. **Shared source-provider contracts:** design the adapter boundary for uploads, GitHub, and GitLab. Provider-specific credential storage and API access are separate integrations, but both providers remain required scope; prototype provider adapters in parallel when Phase 4 begins.
5. **Language adapter contracts:** keep graph/report schemas language-neutral and plan adapter coverage for JavaScript/TypeScript, Python, Java, C#/.NET, Go, Rust, PHP, Ruby, and C/C++, with support depth declared per adapter.
6. **Web product shell:** replace fake dashboard metrics with project/workspace states and clear loading, empty, error, and permission-denied views as the APIs become available.
7. **Delivery quality:** add CI gates, schema/migration checks, contract tests, threat-model review, and operational telemetry without logging source or secrets.

## First implementation slice

Start with a **workspace/project access-control vertical slice**, not source upload:

- Add an explicit database migration mechanism rather than expanding runtime `CREATE TABLE IF NOT EXISTS` calls.
- Define workspace, membership, role, and project schema with foreign keys and indexes.
- Make authentication/session validation reusable for product routes, and enforce membership/role checks server-side.
- Add minimal create/list project operations scoped to the current workspace, including negative cross-tenant tests.
- Replace at least one static dashboard project/metric area with an honest project empty/loading/error state.

Do not begin repository upload or Git provider ingestion in this slice. This avoids accepting private code before authorization, isolation, retention, and worker security gates exist.

## Progress update

- Added a versioned migration runner and wired it into API startup.
- The initial migrations preserve the existing authentication tables and add workspaces, membership roles, and projects.
- Migrations run under a PostgreSQL transaction-scoped advisory lock using one checked-out connection, so startup concurrency and rollback stay transaction-safe.
- Added migration tests for applying once, repeat startup, and failure rollback.
- Added authenticated workspace listing/creation and project listing/creation APIs. Project reads require membership; project creation requires owner/admin role. Unauthorized workspace reads return not found to avoid exposing tenant existence.
- Workspace creation inserts the workspace and creator's owner membership in one transaction. Account deletion is prevented while the account owns a workspace; project creator references are nullable so deleting an account does not remove shared projects.
- Added API tests for unauthenticated requests, cross-tenant denial, role enforcement, workspace ownership, and the web's dashboard data display.
- Source ingestion, invitation/member management, role updates, ownership transfer, audit events, and the wider analysis domain remain outstanding.
- Phase 2 source-independent groundwork has started; it does not count as completion of Phase 1. See [Phase 2 kickoff](./phase-2-analysis-platform-kickoff.md).

## Migration operation

- API startup applies unapplied migrations automatically after PostgreSQL is reachable; the migration history is recorded in `schema_migrations`.
- Existing data is preserved by the additive migrations in this slice. There is no destructive reset or automatic down-migration.
- Back up a local or hosted database before deploying schema changes. To roll back an application release, restore a matching database backup; do not remove the PostgreSQL volume to undo a migration.

## Acceptance criteria for the first slice

- Unauthenticated requests are denied on workspace/project APIs.
- A user cannot read or mutate a project from a workspace they do not belong to.
- Workspace membership and owner/admin/member permissions are explicit, tested, and consistently enforced.
- Project creation is validated and scoped; list responses contain only authorized project data.
- Database migrations are repeatable, versioned, and have a documented local reset/upgrade path.
- The UI does not display fabricated analysis counts, quality scores, or healthy-system status as real data.
- API and web tests/build pass, with migration and authorization tests included.
- Source upload endpoints remain absent/disabled until Phase 0 data and threat-model decisions are approved.

## Concurrent Phase 0 gates

Phase 1 foundation work runs in parallel with:

- User interviews to validate engineering-lead/CTO buyer and developer workflows.
- Representative, permission-cleared projects spanning a proposed multi-language cohort.
- Language-adapter graph/report contract and provider-adapter contract review.
- Initial parser feasibility and corpus across the nine selected language families; additional languages beyond those named require a follow-up list.
- Source threat model, implementation of the approved 90-day retention and worldwide residency direction, report-sharing policy, and deletion verification plan.
- Resource benchmarks, target repository sizes, and per-language support-depth expectations.

The phase does not claim completion until the planned foundation gates and acceptance criteria are verified. New product owner decisions should be recorded in a superseding Knowledge Base decision record.
