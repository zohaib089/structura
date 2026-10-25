# Phase 2 — Source Ingestion and Asynchronous Analysis Kickoff

**Started:** 2026-10-21  
**Status:** Workspace invitations and a synthetic architecture demo are available; customer-source acceptance and public localization claims remain blocked by unresolved security, compliance, and translation gates  
**Roadmap:** [Product Vision and Implementation Roadmap](../strategy/product-vision-and-implementation-roadmap.md)  
**Safety decision:** [Decision 009 — Phase 2 Safety Gates and Sequencing](../decisions/009-phase-2-safety-gates.md)
**Data policy:** [Decision 010 — Source Retention and Global Residency Direction](../decisions/010-source-retention-and-global-residency.md)
**Localization:** [Decision 011 — Product Localization and Language Support](../decisions/011-localization-and-language-support.md)

## Objective

Prepare a bounded, asynchronous analysis platform without accepting customer repository content before the security and privacy prerequisites are approved.

## Work completed in this kickoff

- Added a typed analysis-job lifecycle with explicit validation, inventory, analysis, finalization, success, failure, cancellation, and retry transitions.
- Added unit tests for stage progress, terminal states, invalid transitions, and retry exhaustion.
- Added versioned TypeScript contracts and runtime parsers for source snapshot manifests, analysis requests, progress events, and inventory results. Parsers reject malformed digests, unsupported values, unsafe or duplicate inventory paths, inconsistent counts/totals, duplicate analyzer IDs, and invalid timestamps; they return only declared fields.
- Added a deterministic, metadata-only inventory builder that sorts paths consistently, estimates file categories and programming-language IDs from names/extensions, and validates safe paths and aggregate counts. It never reads file contents, executes repository code, or claims parser-backed language analysis.
- Added a test-only synthetic pipeline integration test that composes the existing request and progress parsers, metadata inventory builder, and job lifecycle transitions using hard-coded fixture metadata. It runs in memory and does not accept file bytes, access customer projects, persist jobs or artifacts, call external providers, or execute code.
- Added a database migration for source-independent analysis-job metadata and ordered progress-event records, including project ownership, request attribution, idempotency keys, bounded lifecycle values, analyzer-version JSON, and a database-enforced maximum 90-day job metadata deadline. There are no job submission, source snapshot, or worker endpoints wired to these tables.
- Added source-independent retention deadline helpers for 90-day maximum artifact retention and backup purge timing after primary deletion, with tests for exact-boundary expiry, invalid timestamps, and date overflow. These helpers do not persist policy metadata or enforce deletion.
- Added a proposed source data-flow and threat-model review draft with assets, trust boundaries, threats, control expectations, and explicit owner sign-off checklist. It is not approved and does not authorize source handling.
- Hardened the web workspace/project API boundary: response JSON is treated as untrusted, object envelopes and records are validated at runtime, identifiers/names/timestamps/roles/descriptions are checked, and undeclared server fields are discarded. Malformed responses surface explicit errors instead of entering dashboard state.
- The workspace/project boundary also rejects duplicate record IDs and reports malformed JSON explicitly; it never converts malformed, duplicate, or unauthorized responses into empty success states.
- Added locale metadata for the initial ten locales, content-surface coverage types, BCP 47 resolution/fallback behavior, and Urdu RTL metadata. The web router negotiates locale-prefixed routes, preserves legacy URLs, and sets document language/direction. The shared navbar includes a native-name language selector, preserves route/query/hash when switching, and translates its navigation labels for all ten locales. Auth-flow navigation also retains the active locale between auth views and protected destinations.
- Added a typed dashboard message catalog for all ten target locales and wired workspace/project navigation, loading, empty, retry, form, and fallback labels to it. Catalog-shape tests cover all locale entries; a Portuguese dashboard E2E test checks rendered localized states. Catalog parity proves structural completeness, not translation quality.
- Added a localized dismissible success toast for workspace/project creation, an accessible dashboard content skeleton, and an in-place submit spinner; reduced-motion preferences disable the loading animations. Focused browser coverage checks skeleton visibility, disabled/loading submit state, and the success toast. This is UI feedback polish, not analysis-job progress or source-ingestion functionality.
- Expanded the dashboard shell to use the available viewport width, and made the shared navbar show a localized logout action on authenticated dashboard routes while keeping login/launch links for unauthenticated routes. Replaced the native locale-select arrow with a spaced, theme-aware indicator and added browser checks for these states and wide-screen layout.
- Wired the dashboard sidebar to switch among Overview, Projects, Architecture, and Team sections. Overview shows workspace/project information; Projects contains the project list and create form.
- Added interactive Architecture demo using six bundled synthetic service nodes, six relationships, selectable node details, and an illustrative report. The UI identifies the demo as synthetic and explicitly states it does not read, upload, or analyze customer code.
- Implemented Team member listing and email invitations for workspace owners/admins. Invitations are member-only, expire after seven days, store only a token digest, require verified acceptance by the matching email address, and can be revoked. A unique workspace/email constraint and conflict-safe insert prevent concurrent duplicate active invitations; mail-delivery failures revoke the invitation and return an explicit error.
- Preserved invitation links through login/signup/email verification navigation. After a signed-in invitee accepts, the dashboard loads the workspace, selects Team, and removes the raw invitation token from the URL.
- Real source analysis, repository connections, customer upload/fetch, source storage, and worker execution remain unavailable until the required security, legal/compliance, retention, tenancy, and worker-isolation gates are approved and evidenced.
- Added a typed auth message catalog for all ten target locales covering the shared promo shell and login, signup, password recovery/reset, email verification, OTP, and account-deletion screens. This includes local validation copy, button states, and accessible password-toggle labels. Catalog-shape tests and Portuguese, Spanish, and Japanese E2E flows verify rendering/coverage, not translation quality. API-provided error messages, emails, reports, legal copy, and repository prose remain unlocalized and translations require human review.
- Added the Safe Source Ingestion skill and connected its requirements to the general coding-principles skill and standard.
- Added the Product Localization skill for catalog completeness, human review, legal-content review, RTL/CJK testing, and separation of human-language prose from programming-language support.
- Recorded the 90-day maximum retention period for source and derived artifacts, 90-day backup expiry, and a worldwide compliance target.
- Kept upload, provider-fetch, source-storage, and runtime worker-execution paths absent; pipeline integration coverage uses synthetic metadata only.
- Removed the API development dependency `nodemon` after the container build reported three high-severity advisories through `nodemon -> chokidar -> braces`; the development command now uses the already-installed `tsx watch`. `npm audit` reports zero API dependency vulnerabilities after the lockfile update. This addresses the reported development-chain advisories only and is not a security approval for source ingestion.

## Validation

- API unit and synthetic pipeline tests: 40 passed.
- API TypeScript build: passed.
- API dependency audit: 0 vulnerabilities after removing the vulnerable development-only `nodemon` chain.
- Web unit tests: 30 passed.
- Web E2E tests: 16 passed.
- Web production build: passed.
- Skills package tests: 5 passed.
- Skills package TypeScript check: passed.
- `git diff --check`: passed.

## Current gates

| Gate | Status | Evidence needed |
|---|---|---|
| Threat model and source data-flow map | Open | Approved data-flow covering API, storage, queue, workers, artifacts, logs, backups, and deletion |
| Threat-model draft | Review draft | [Threat model and data-flow draft](../architecture/phase-2-threat-model-and-data-flow.md); named security, privacy/legal, infrastructure, and product sign-off required |
| Retention and deletion | Policy set; helper only | 90-day deadline calculation is tested; persistence, scheduled deletion, primary/derived cleanup, replicas/caches, backup expiry, and deletion verification remain |
| Analysis metadata | Migration only | Job/progress schema exists; no API repository, queue, source snapshot, artifact persistence, or worker execution is enabled |
| Inventory | Synthetic metadata utility | Deterministic filename/extension estimates tested; no real source input or parser-backed analysis |
| Hosting and residency | All-country launch target set; compliance mapping open | Country-by-country legal/data-flow review across EU, USA, UK, Australia, New Zealand, every Asian and African country, and all other countries in launch scope |
| Localization | Navbar, dashboard, and auth UI catalogs implemented; review/coverage open | Human-reviewed catalogs and end-to-end coverage for every required content surface; API errors, emails, reports, and legal content remain; legal copy needs qualified review |
| Tenant/session production readiness | Incomplete | Reviewed session model plus negative authorization tests for every source-bearing resource |
| Worker isolation and quotas | Open | Least-privileged worker boundary, network policy, and measured per-job limits |
| Secret redaction and observability | Open | Tests proving source and raw secrets do not enter logs, telemetry, or error responses |

## Next implementation increments

1. Obtain formal multidisciplinary approval of the threat model/data-flow draft, and complete a qualified country-by-country and applicable subnational legal/residency review.
2. Implement and verify actual 90-day retention/deletion enforcement across primary storage, derived artifacts, temporary workers, caches, replicas, and backups.
3. Complete production session/tenant authorization review and measured worker-isolation, network, and resource-limit evidence.
4. Build structured, completeness-checked catalogs for API error states and remaining global UI, with human review and locale-specific accessibility/RTL/CJK tests.
5. Implement archive preflight and isolated extraction only after the required security, legal/compliance, retention, tenant/session, and worker-isolation gates are approved and tested.
6. Wire durable job operations, queues, progress reads/cancellation, and derived-artifact storage only after their authorization, isolation, retention, and audit controls are approved.
7. Add lifecycle, cross-tenant, retention, deletion, and locale end-to-end integration tests before connecting public upload or claiming locale coverage.

## Acceptance boundary

This kickoff does **not** mark Phase 1 complete, accept uploads, store source, or run user-provided code. Any work that crosses those boundaries requires the open gates above to be resolved and recorded first.
