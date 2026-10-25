# Structura Product Vision and Implementation Roadmap

**Document type:** Product brief, requirements baseline, and implementation plan  
**Status:** Phase 1 workspace/project slice delivered; remaining foundation work and Phase 2 safe groundwork are active; source-ingestion gates remain open  
**Owner:** Product/Engineering  
**Last updated:** 2026-10-21

## 1. Executive direction

Structura will be a repository-understanding and software-quality platform delivered through:

1. A web application for onboarding repositories, exploring architecture, reading evidence-backed reports, tracking changes, and managing teams.
2. A secure analysis service that ingests source snapshots and CI artifacts, constructs a navigable code graph, and runs modular static/report analyzers.
3. Source-control integrations for importing repositories and refreshing analyses from GitHub and GitLab.
4. An IDE extension that helps developers explore the same graph and findings while they work.
5. A documented integration/plugin contract for adding source providers, language analyzers, report checks, and editor clients without coupling them to the web UI.

The product should answer: **“What is in this codebase, how are its parts connected, what evidence do we have about its quality and risks, and what should the team improve next?”**

This roadmap recommends a **web-first, read-only analysis MVP**. It establishes a shared analyzer and graph contract before adding provider integrations and the IDE client. **Multi-language analysis and both GitHub and GitLab are product requirements**, not optional future directions. Deliver them through independent adapters in validated increments; do not lock the product architecture or launch claim to one language or one provider. Runtime memory profiling, a universal “best architecture” score, and multiple IDEs remain out of the initial release.

## 2. Current baseline and gap

The repository currently contains a Vue 3/TypeScript frontend, a Fastify/TypeScript API, PostgreSQL/Compose development setup, auth flows, and a landing page. Vue Flow is already a frontend dependency. There are Knowledge Base standards and initial frontend tests.

The following foundations have partial implementation; repository analysis is not yet available:

- Repository/file upload and source-control repository ingestion.
- Durable analysis jobs, queue/workers, progress reporting, retry/cancellation integration, and artifact retention. A tested in-process lifecycle state contract exists, but is not wired to persistence or workers.
- A canonical repository snapshot, symbol index, dependency graph, or graph API.
- Language adapters, test/coverage ingestion, dependency health analysis, or engineering-quality findings.
- Evidence-backed report model, scoring policy, or report export.
- Repository-source ownership, complete production tenant controls, and source-bearing authorization.
- GitHub/GitLab OAuth/application installation and webhook refresh.
- IDE extension, extension API, or plugin interface.
- Analysis worker isolation, resource quotas, approved retention policy, and threat model.

Existing authentication is an initial application capability, **not production-ready tenancy or authorization for source-code access**. Resolve its session and security gaps before connecting private repositories or source uploads. The current architecture overview and this plan must not be interpreted as proof that analysis functionality already exists.

## 3. Vision, users, and outcomes

### Primary users

- **Engineering lead / CTO:** needs an evidence-based overview of architecture, maintainability, delivery practices, and highest-value risks.
- **Developer:** needs to trace a code element to its callers/dependencies and understand the impact of changing it.
- **Platform/security engineer:** needs visibility into dependency, secret-handling, CI/CD, container, and security hygiene without exposing source or credentials.
- **Repository owner:** needs to onboard repositories, select branches/commits, control access/retention, and share reports.

### User outcomes

- Connect a repository or safely upload a supported project snapshot.
- Tailor report presentation to the reader's role (engineering lead, developer, or platform/security) while keeping findings and evidence consistent and auditable.
- Identify the project’s languages, frameworks, entry points, modules, and important relationships.
- Navigate from a repository root / selected “nucleus” through packages, modules, symbols, and leaf nodes.
- Understand what the analyzer could and could not inspect.
- See prioritized findings with file/line evidence, rationale, confidence, and remediation guidance.
- Know whether test and coverage conclusions come from uploaded/imported reports or only static discovery.
- Compare reports for different commits and track whether findings were fixed or regressed.
- Open the relevant node or finding in the IDE when the client supports it.

### Product success measures

Instrument these measures before setting targets; do not fabricate quality improvements:

- Repository onboarding completion and analysis completion rates.
- Time from source ingestion to first useful graph/report.
- Percentage of findings with valid evidence and low false-positive rate from reviewed samples.
- Graph resolution quality measured against language-specific reference repositories.
- Report usefulness: viewed findings, dismissed findings with reason, and verified fixes.
- Repeat analyses per repository and report-to-action conversion.
- Worker failure, timeout, queue delay, and cost per analyzed repository.
- Security/privacy incidents, unauthorized cross-tenant reads, and data-retention compliance.

## 4. Product requirements

### 4.1 Project onboarding and source control

- Create an organization/workspace and project; control member roles and repository visibility.
- Support a small single-file upload path for quick exploration and a source archive/repository snapshot path for real analysis.
- Support both private GitHub and GitLab repository connections through least-privilege, revocable provider permissions. Both providers are required product scope.
- Let users explicitly choose repository, branch/ref, and commit; display the analyzed immutable commit SHA.
- Provide progress, queued/running/completed/failed/cancelled states, retry rules, and actionable non-sensitive error messages.
- Make upload size, file count, language count, analysis duration, and retention limits configurable server-side.
- Respect `.gitignore`/provider exclusions and allow an explicit project ignore file; show excluded paths and reasons.
- Never require or run project build scripts, package lifecycle scripts, Dockerfiles, tests, or other user repository code in the static-analysis path.
- Never put Git credentials, secrets, or source contents in application logs, URLs, telemetry, or error reports.

### 4.2 Architecture graph

- Render a useful overview first, and progressively load detail to avoid rendering every symbol in a large repository at once.
- Use a stable graph schema with typed nodes and typed directed edges; include canonical IDs, source locations, language, and provenance.
- Model a repository/workspace as a navigable root. Let users choose one or more detected entry points (“nuclei”), such as application entry files, executable commands, service startup, route roots, or test entry points.
- Do not falsely assert every repository has one true entry point. Show multiple entry points, disconnected components, unresolved imports, dynamic edges, and analysis limitations distinctly.
- Support drill-down from repository to package/module/file and, where the language adapter can prove it, symbol/component/call relationships.
- Support search, filters by language/path/node/edge type, focus-on-node, upstream/downstream traversal, path highlighting, and source-location navigation.
- Show edge semantics such as imports, calls, renders/uses, route registration, configuration references, tests, and deployment relationships. Do not conflate static imports with proven runtime execution.
- Communicate graph truncation, unresolved references, and approximate/dynamic relationships visually and in the report.

### 4.3 Quality and architecture report

Each analysis report must include:

- Repository identity, branch/ref, commit SHA, analysis time, analyzer version, enabled checks, and scan coverage/limitations.
- Executive summary plus findings grouped by category and priority.
- For each finding: stable rule ID, title, severity, confidence, category, concise impact, evidence path and line range where available, source/provenance, remediation, and suppression state.
- Category scores only when supported by defined denominators and evidence. Never turn missing data into “good,” “secure,” or 100% quality.
- A prioritized next-actions list that weighs impact, confidence, exploitability where applicable, and remediation effort; display the reasoning behind ordering.
- Baseline/commit-to-commit comparison with added, resolved, changed, and suppressed findings.
- Export/share controls that respect workspace authorization and do not disclose private source to public links by default.
- Role-aware report lenses for executive prioritization, developer code-path/testing detail, and platform/security controls. The selected lens must not alter evidence or finding severity.

### 4.4 Analysis domains and evidence rules

| Domain | MVP evidence | Later / optional evidence | Important limitation |
|---|---|---|---|
| Architecture and dependency graph | Parser-resolved file/module imports for supported languages; entry point heuristics | Symbol/call graph, framework-aware route/component graph | Static references do not prove runtime reachability |
| Coding principles / maintainability | Configurable static rules, complexity/duplication indicators, repository conventions | Organization-specific policy packs and reviewed AI explanations | “Best practice” depends on context; provide rule rationale |
| Tests | Test framework/config discovery and test-file inventory | Test results from CI/JUnit/etc. | Test files do not prove tests pass or provide behavior coverage |
| Coverage | Import LCOV/Cobertura/etc. reports from trusted CI artifacts | Per-commit coverage trend and changed-line coverage | If no coverage artifact exists, report “not provided,” not zero or adequate |
| Performance / efficiency | Static heuristics for high-cost patterns where analyzable | User-supplied profiles, benchmarks, traces | Do not claim actual latency/performance without runtime evidence |
| Memory | Static lifecycle/resource cleanup heuristics | Explicitly opted-in, isolated profiling data | A static scan cannot prove a memory leak |
| Dependencies | Manifest + lockfile inventory, version age, known lifecycle/EOL metadata, advisory feed | License policy, upgrade PR integration | Keep advisory data freshness and scan timestamp visible |
| Secrets | Secret pattern scanning on source snapshot with redacted match evidence | Provider-native secret scanning/imported results | Never retain or display matched secret values; define redaction and deletion behavior |
| Security | Rule-based static checks, dependency advisories, configuration review | Integrations with dedicated SAST/DAST/SCA tools | Never advertise a scan as a security certification or guarantee |
| Design system | Detect configured token sources, hard-coded style values, component conventions | Framework-specific accessibility/visual checks | Requires project-specific design-system configuration; do not assume one exists |
| CI/CD | Discover supported pipeline files and evaluate explicit rule packs | CI provider checks, trend and policy enforcement | State exactly which provider/file formats were inspected |
| Containers | Dockerfile/Compose static checks for common practices | Build/provenance metadata from CI | Never build or run uploaded images by default |
| Documentation and architecture | Discover ADRs, docs, ownership and architecture metadata | Drift analysis between declared and inferred architecture | Inference is suggestive; preserve authorship and source |

For every check, make unsupported, skipped, incomplete, and not-applicable outcomes distinct. Keep analyzer rule sets versioned and reproducible.

### 4.5 Change-aware engineering guidance

Structura should help a programmer plan a new capability or safely change an existing one, not only score a repository:

- Given a feature request and repository snapshot, find existing routes, components, services, stores, types, data models, tests, and integrations that already provide related behavior.
- Explain whether to reuse, extend, replace, or deliberately keep the new capability separate. Cite graph nodes and source evidence; do not recommend duplication without explaining why.
- Identify the likely implementation surfaces and a minimal, ordered implementation plan that follows existing repository patterns and standards.
- For edits to existing functionality, show impacted callers/dependents, persisted data, API/UI contracts, permissions, workflows, and tests where the graph or repository evidence can establish them.
- Produce a change-risk assessment covering compatibility/breakage, security/privacy, data migration/backfill, performance/resource use, reliability/operability, accessibility/UX, test gaps, and rollback or feature-flag options as relevant.
- Distinguish confirmed impact from inferred/unknown impact. State uncertainty where dynamic behavior or unsupported languages prevent a complete call graph.
- Recommend relevant regression, contract, security, migration, and E2E tests. Do not claim a proposed test passed unless it was actually run.
- Keep the final decision with the developer/team; guidance is advisory and must not apply code changes or alter project files without explicit user approval.

This capability depends on reliable repository inventory, code graph, dependency/call evidence, and test/config discovery. Deliver progressively: first source-backed symbol/file overlap and impact paths in the initial supported language; later add framework-aware flow and historical change evidence.

## 5. Recommended technical architecture

Keep the current monorepo approach, but add boundaries around the product’s new core:

```text
apps/
  web/                 Vue web experience
  api/                 Fastify auth, workspace, project, provider, and report APIs
  worker/              Queue consumer for ingestion and analysis
  ide-vscode/          VS Code extension (later phase)
packages/
  contracts/           Versioned API, graph, analysis, and finding schemas
  analyzer-core/       Orchestration, rule execution, graph normalization
  analyzers/           Language/framework/check-domain adapters
  source-adapters/     Upload, GitHub, GitLab, CI-artifact import adapters
  test-fixtures/       Small licensed/owned repositories and golden outputs
```

The names are provisional; confirm workspace/package tooling before creating packages. Avoid turning the existing `packages/skills` folder into the analysis plugin system: agent skills and executable analysis plugins are different concerns.

### Analysis lifecycle

1. API authorizes an upload/provider operation and creates an analysis record.
2. Ingestion creates an immutable, content-addressed snapshot pinned to a commit/ref.
3. A queue schedules a worker using a constrained analysis profile.
4. Worker inventories files, applies exclusions, detects languages, and runs enabled parser/rule adapters.
5. Adapters emit normalized graph fragments and findings against versioned contracts.
6. Aggregation stores report metadata, graph indexes/edges, findings, coverage, and provenance.
7. Web/IDE clients request paginated graph slices, finding details, and source locations only after authorization.
8. Retention cleanup deletes source snapshots and derived artifacts according to workspace policy.

### Suggested technology direction

- Preserve Vue 3, TypeScript, Fastify, and PostgreSQL as the initial product stack.
- Keep Vue Flow for initial graph interaction; benchmark alternatives only when real graph sizes expose limits.
- Use PostgreSQL for users/workspaces/projects/analysis metadata/findings and suitable graph-edge indexing initially. Make graph storage replaceable behind repository interfaces; do not prematurely adopt a graph database.
- Add object storage for encrypted source snapshots and large artifacts before accepting meaningful uploads. A local S3-compatible service may be used for development; production storage must enforce private buckets, encryption, scoped access, and lifecycle deletion.
- Add a durable queue and separately deployed workers before allowing long-running scans in API processes. Choose queue/storage technology after defining retry, idempotency, visibility timeout, and cancellation needs.
- Use a language-neutral graph and versioned analyzer-adapter contracts. Support multiple languages through independently testable parser/analyzer adapters; do not make the core schema, API, project model, or product language claim single-language-specific.
- Select the initial multi-language cohort and depth per language from customer evidence and evaluation-corpus quality. File/module dependency support and symbol/call support may differ by adapter; show that per-language coverage explicitly rather than implying parity.
- Define and validate JSON Schema/TypeScript contracts at module and API boundaries. Keep analyzer versions and rule packs explicit.
- Use provider APIs and narrowly scoped OAuth/app installation for Git providers; never ask users to paste personal access tokens into ordinary project fields.

## 6. Security, privacy, and trust requirements

Source code and CI artifacts are sensitive customer data. Security/privacy are release gates, not later enhancements.

- Complete an application threat model for tenant isolation, account takeover, malicious archives, provider tokens, worker compromise, report sharing, and artifact deletion.
- Implement organization/project roles and enforce authorization on every read, write, export, graph query, and provider callback.
- Do not trust upload paths, archive metadata, repository filenames, symlinks, MIME types, declared file size, or client-provided commit values.
- Defend archive extraction against path traversal, zip bombs, symlink escapes, excessive file counts, and parser resource exhaustion.
- Store Git/provider tokens in a secrets manager or encrypted credential store; use least privilege, rotation, revocation, and audited access.
- Run analyzers in a separate, unprivileged, network-restricted worker/container with read-only source, no production credentials, CPU/memory/time/file-count ceilings, and no shell/build execution.
- Apply request and worker quotas, cancellation, queue backpressure, idempotency, rate limits, and denial-of-service monitoring.
- Encrypt source/artifacts at rest and in transit; make retention and deletion scope explicit; ensure derived graphs/reports are deleted when policy requires.
- Redact secret findings at source; test that raw matched values never appear in API responses, report exports, logs, test snapshots, or telemetry.
- Audit security-sensitive actions and protect logs from source/secret inclusion.
- Establish vulnerability handling, dependency update cadence, backup/restore, incident response, and security review before private-repository beta.
- Never label a repository “secure” because a finite ruleset found no issue. State the tools, versions, exclusions, coverage, date, and limitations.

## 7. Phased implementation plan

Phases are ordered by dependency, not calendar. Estimate only after the discovery outputs and team capacity are known. Each phase should be independently demonstrable.

### Phase 0 — Product and technical discovery

**Goal:** Remove decisions that would cause rework before implementation.

**Work**

- Validate the selected engineering-lead/CTO buyer and role-aware workflows with target users; whole-project archive is the first vertical slice, with single-file and Git ingestion staged later.
- Validate parser and entry-point support for the initial JavaScript/TypeScript, Python, Java, C#/.NET, Go, Rust, PHP, Ruby, and C/C++ cohort against representative, permission-cleared repositories; clarify additional "other" languages before estimating full coverage.
- Apply the approved 90-day maximum retention periods for source and derived artifacts, 90-day backup expiry, and all-country worldwide compliance launch requirement; complete country-by-country legal/data-flow review and decide report-sharing policy.
- Define localization coverage and reviewer ownership for the initial English, Portuguese, Italian, French, Dutch, Spanish, Japanese, Simplified Chinese/Mandarin, Hindi, and Urdu locales across all user-facing surfaces.
- Define a shared source-provider adapter contract and parallel feasibility prototypes for GitHub and GitLab; decide what “plugin” means for launch (first-party adapters vs third-party extensibility).
- Define graph scale benchmarks, multi-language corpus and support depth, supported artifact formats, rule governance, severity/confidence vocabulary, and “not assessed” semantics.
- Define a change-guidance workflow: how a request is decomposed, how existing functionality and reusable patterns are found, which risk categories are reported, and how evidence/uncertainty is shown.
- Map current auth/session gaps and define the minimum production authorization and tenancy model.

**Exit criteria**

- Approved MVP scope and explicit exclusions.
- Threat model, data-flow diagram, source-retention policy, and initial multi-language cohort/support-depth decision.
- Approved compliance inventory and launch gate for every target country, including applicable localized disclosures.
- Versioned locale/content-surface contract and a translation review plan; no locale may be claimed supported before complete reviewed catalogs and validation.
- Graph/finding/report contract draft and a small evaluation corpus with expected graph edges/findings.
- Change-impact/guidance contract draft covering overlap evidence, implementation alternatives, risk categories, and confidence.
- Recorded architecture decisions for storage, queue, worker isolation, language/provider adapter contracts, and plugin boundary.
- Recorded the all-country launch requirement and initial product-locale/content-surface scope; country-level compliance and actual translations remain open.
- Added locale-prefixed web routes and locale negotiation for the initial locale set; translated UI and other content surfaces remain future work.

### Phase 1 — Product foundation and secure tenancy

**Goal:** Make the existing application a safe multi-project product shell.

**Work**

- Workspace, membership/role, and project models/migrations are in place; add repository-source, analysis, artifact, finding, and audit-event models/migrations.
- Add strict authorization tests for cross-workspace access and ownership boundaries.
- Move authentication to production-appropriate session handling; product routes currently validate bearer sessions, but the browser still stores the token in localStorage.
- Define API contracts, error model, pagination, request IDs, observability, configuration and secrets management.
- Build project list/detail, create-project, settings, empty, loading, failure, and permissions UI states.
- Establish CI gates for web/API/contract tests, dependency audit, code scanning, migrations, and container build checks.

**Exit criteria**

- Organization/project isolation proven by negative tests.
- No private code upload/provider token path exists without an approved access policy.
- API and web have documented/versioned contracts and CI quality gates.
- Migration, backup, and local development workflows are repeatable.

### Phase 2 — Source ingestion and asynchronous analysis platform

**Goal:** Accept a constrained source snapshot and run analysis safely off the API thread.

**Current status:** Safe groundwork includes the tested analysis-job lifecycle, versioned runtime-validated analysis/localization contracts, source-independent 90-day retention-deadline helpers, a threat-model/data-flow review draft, analysis-job/progress metadata migration, and a deterministic metadata-only inventory utility. The draft is not approved; deadline helpers do not delete data; and inventory estimates do not parse source. Phase 1 remains active. Source acceptance is blocked until the threat model, implementation of the approved retention/deletion policy, all-country legal/compliance mapping, production session/tenant controls, and worker isolation are evidenced. See [Decision 009](../decisions/009-phase-2-safety-gates.md), [Decision 010](../decisions/010-source-retention-and-global-residency.md), [Decision 011](../decisions/011-localization-and-language-support.md), and the [Phase 2 kickoff](../progress/phase-2-analysis-platform-kickoff.md).

**Work**

- Implement bounded file/archive upload with validation, quarantine, safe extraction, ignore handling, idempotency, and user-visible status.
- Add encrypted object storage abstraction and retention/deletion lifecycle.
- Add durable job queue, worker service, retry/cancel semantics, resource profiles, dead-letter handling, and metrics.
- Add analysis state machine and visible progress events.
- Create a deterministic inventory: paths, file sizes, language estimates, manifests, configs, test files, CI files, Dockerfiles, design-token candidates, documentation, and likely entry points.
- Store immutable snapshot identity and analysis version. Never execute uploaded project scripts.

**Exit criteria**

- A malicious/boundary archive fixture cannot escape extraction or exhaust configured resource limits.
- Reprocessing the same immutable snapshot is idempotent and versioned.
- A failed or cancelled job does not leave an analysis falsely marked complete.
- Source deletion removes the snapshot and defined derived artifacts.

### Phase 3 — Multi-language graph and trustworthy baseline report

**Goal:** Deliver useful graphs and transparent reports across the approved initial multi-language cohort: JavaScript/TypeScript, Python, Java, C#/.NET, Go, Rust, PHP, Ruby, and C/C++.

**Work**

- Define and implement independent parser-backed file/module graph adapters for each initial language family and common import forms, using shared normalized contracts and language-specific capability declarations.
- Detect multiple possible entry points per language with evidence and explain heuristic confidence.
- Normalize graph nodes/edges into the shared versioned schema; include file/line spans and unresolved edges.
- Add initial rule packs: repository structure, maintainability signals, tests and coverage artifact discovery, stale dependencies, common secret patterns (redacted), config hygiene, Docker/CI file discovery, and design-token adherence where configured.
- Ingest supported coverage/test artifacts only when users provide them; present static test discovery separately from actual outcomes.
- Build report API and UI: overview, category status, finding evidence, filters, confidence, limitations, and prioritized actions.
- Build graph explorer: repository overview, entry-point selection, search, filters, neighborhood expansion, source locations, and unresolved/dynamic-edge display.
- Create golden tests from the multi-language evaluation corpus; measure graph and finding precision/recall per language and across mixed-language repositories.
- Add change-guidance views that find related existing functionality and show implementation options, impacted nodes, risk categories, evidence, and unknowns.

**Exit criteria**

- A user can trace from the repository root/entry point through supported nodes in each launch language, and open evidence from a finding.
- Language-specific support depth, unresolved edges, unsupported files, and coverage are visible; one adapter's limitations do not suppress analysis from another.
- Every finding points to a versioned rule, source evidence, confidence, and remediation; unsupported checks are explicitly unassessed.
- The report makes no claim about actual speed, runtime memory leaks, passing tests, or security certification without runtime/CI evidence.
- Graph responsiveness and worker resource use meet Phase 0 agreed benchmarks.

### Phase 4 — GitHub and GitLab connections and continuous refresh

**Goal:** Analyze private GitHub and GitLab repositories without manual source archives. Prototype both provider adapters in parallel against the shared contract.

**Work**

- Implement GitHub and GitLab installations/OAuth with least privilege, encrypted credentials, revoke/disconnect, and audit events behind a shared source-provider contract. Develop provider prototypes in parallel; integrate/roll out in safe increments, with both required for phase completion.
- Import a selected repository/ref using immutable commit SHAs; support branch refresh and pull/merge request contexts as appropriate.
- Add webhook signature validation, deduplication, rate handling, and stale-event protection.
- Show repository permission state, last analyzed commit, analysis status, refresh control, and provider failure recovery.
- Add branch/commit comparison and actionable change/regression summaries.

**Exit criteria**

- GitHub and GitLab install/revoke flows are each tested with local/test fixtures against the shared provider contract.
- Webhook replay/forgery cannot trigger unauthorized access or duplicate uncontrolled work.
- A commit-specific report can be reproduced and compared without mixing snapshot data.
- Provider tokens never appear in logs, client-visible data, or report artifacts.

### Phase 5 — VS Code extension and integration API

**Goal:** Bring graph/report insight into the developer workflow without duplicating analysis logic.

**Work**

- Define IDE auth and API contract using scoped, revocable credentials or a secure browser-based authorization flow.
- Create an extension that can associate an opened workspace with an existing Structura project or run a supported local-safe scan.
- Provide commands for open report, graph around current file/symbol, search findings, and open evidence location.
- Add status/progress, offline behavior, permission errors, and explicit privacy/consent UX.
- Keep the extension a thin client of shared contracts; do not reimplement graph or quality rules in the IDE.
- Define extension/plugin API and compatibility/versioning only after first-party adapters demonstrate a stable boundary.

**Exit criteria**

- Extension never uploads source or telemetry without user consent and clear configuration.
- Finding links resolve to the correct repository/commit/path and line.
- Token revocation, sign-out, offline API errors, and supported editor versions are tested.
- Plugin API has versioned contracts, capability permissions, resource limits, and compatibility policy before third-party execution is enabled.

### Phase 6 — Expansion, reliability, and paid-team readiness

**Goal:** Expand languages/checks based on validated demand while improving reliability and team workflows.

**Work**

- Add language/framework adapters in priority order using the evaluation corpus.
- Add configurable policy packs, finding suppressions/ownership, review workflow, and trend analytics.
- Add richer CI, test-result, coverage, dependency-advisory, container, and accessibility integrations with source provenance.
- Add optional runtime/profiling artifact ingestion only with explicit opt-in and format-specific safeguards.
- Add report sharing/export, audit views, SSO, billing/quotas as product requirements justify.
- Run performance, load, worker isolation, backup/restore, deletion, incident response, accessibility, and security verification.

**Exit criteria**

- New analyzers meet agreed false-positive and runtime budgets before default enablement.
- Operational SLOs, on-call alerts, recovery steps, and customer data deletion are verified.
- Pricing/quotas align with measured compute/storage cost and transparent user-facing limits.

## 8. Test and release strategy

- **Unit:** archive-path validation, file exclusion, secret redaction, parser adapters, graph normalization, entry-point ranking, rule evaluation, score denominators, retention and authorization predicates.
- **Contract:** schema compatibility, API errors, pagination, analyzer plugin inputs/outputs, report/graph response versioning.
- **Golden corpus:** small owned or permissively licensed projects for each supported language with expected nodes/edges, unresolved references, and findings.
- **Integration:** PostgreSQL migrations, object storage, queue retries, worker cancellation, provider token vault, webhook validation, report persistence, deletion cascade.
- **Security:** cross-tenant IDOR tests; malformed archive/zip-bomb/path traversal; malicious repository content; secret redaction; SSRF/provider URL handling; worker no-network/no-execution; dependency and container checks.
- **E2E:** create workspace/project, upload a fixture, watch progress, inspect graph/report, open evidence, compare a later commit, disconnect provider, and verify deletion.
- **IDE:** extension auth, workspace association, current-file graph/finding commands, offline/expired token, source upload consent, supported-version matrix.
- **Performance:** repository size tiers, graph query latency, rendering/pagination, queue time, worker CPU/memory and timeout behavior.
- Require type-check, lint, unit, contract, integration, security, and targeted E2E gates per changed component. Establish flaky-test ownership and avoid silently skipping security/performance checks.

## 9. Initial release boundary

### Include in first usable MVP

- Authenticated workspace/project and access boundaries.
- Manual safe upload of a bounded project snapshot (not arbitrary code execution).
- One parser-backed language graph with repository root, multiple candidate entry points, file/module edges, and source navigation.
- An asynchronous analysis job and reproducible report tied to an immutable snapshot.
- Evidence-based baseline findings for supported checks across the approved initial multi-language cohort.
- Explicit handling for unknown, unscanned, missing evidence, and low-confidence results.
- Tests and operator-visible job failures/metrics.

### Defer until evidence or user demand supports it

- Full multi-language symbol/call graphs and claims of discovering the “last child component” for every stack.
- Git-provider integrations are staged, but both GitHub and GitLab are required product scope.
- IDEs other than VS Code.
- Runtime code execution, arbitrary CI, Docker builds, package install scripts, or automatic profiling of uploaded code.
- Universal quality score, “AI decides if it is well architected,” automatic code changes, and security certification claims.
- Third-party executable plugins before sandboxing, permissions, trust model, and version compatibility exist.
- Automatic fixes/PR creation and policy enforcement that blocks deployment.

## 10. Principal risks and mitigations

| Risk | Mitigation / decision gate |
|---|---|
| Scope balloons across all languages and domains | One ecosystem and bounded rules in MVP; prioritize by user research and corpus |
| Graph implies certainty or one nucleus where none exists | Multiple candidate roots; label heuristic/proven edges and disconnected/unresolved parts |
| False positives damage credibility | Evidence, confidence, suppressions, golden corpora, reviewed precision samples |
| “Quality score” oversimplifies context | Start with category coverage and transparent denominators; introduce scores only after validation |
| Source upload compromises Structura | Isolated no-execution worker, encrypted storage, quotas, retention, deletion, threat modeling |
| Analyzer exhaustion or malicious archives | Pre-extraction validation, worker sandbox, resource quotas, fuzz/property tests |
| Private code or secrets leak through reports/logs | Redacted findings, no source in logs, authorization, data-flow tests, restricted exports |
| Provider permissions and token compromise | Least privilege, encrypted storage, rotation/revocation, signed webhook validation |
| Large graph is slow or unusable | Progressive expansion, query pagination, tested graph-size tiers, selective rendering |
| Inferred design system or security status is wrong | Require config/evidence, show unassessed states, explain limitations |
| Existing auth is mistaken for production-ready SaaS authorization | Harden auth and implement tenant RBAC before source ingestion |

## 11. Near-term execution backlog

The next engineering work should be:

1. Complete Phase 1 security/tenancy acceptance: production-appropriate session handling, team access/ownership workflows, operational API contracts, and CI gates.
2. Complete source-data controls: threat model/data-flow, technical enforcement of the approved retention and backup-expiry policy, all-country legal/compliance mapping, and representative permission-cleared corpora.
3. Draft and review versioned snapshot, analysis-request, progress-event, inventory, and localization coverage contracts using synthetic fixtures.
4. Design storage and queue boundaries, region placement, isolation, quotas, retry/cancellation, and deletion propagation without accepting real source.
5. Establish translation catalogs and review workflow for all initial locales and content surfaces; validate RTL, CJK, emails, reports, and disclosures before any locale launch claim.
6. Implement bounded archive validation/extraction and isolated workers only after the source-acceptance gates have approval and code-level evidence.
7. Prototype parser adapters and a bounded repository graph against permission-cleared fixtures; measure correctness and scale.
8. Revisit architecture and roadmap at the end of each phase; update this Knowledge Base document with measured evidence and decisions.

## 12. Ready-to-use implementation prompt

Use this prompt to start implementation work after Phase 0 decisions are approved. It is intentionally staged; do not ask an agent to implement the entire roadmap in one pass.

> You are implementing Structura, a web-based repository architecture and engineering-quality analysis platform. Follow the approved product vision and phase gates in `knowledge/strategy/product-vision-and-implementation-roadmap.md`, the repository's general coding principles, and the design system.
>
> **Current project context:** the monorepo has a Vue 3/TypeScript web app, a Fastify/TypeScript API, PostgreSQL, Compose, initial auth, and a first workspace/project API with membership checks. A pure analysis-job state contract is tested but is not persisted or connected to a queue. Repository ingestion, analysis workers, graph/report schemas, language analyzers, source-control integrations, and IDE extension are not implemented. Do not claim they exist or accept source while the recorded safety gates are open.
>
> **For this task, implement only the explicitly named phase/story:** `[INSERT ONE APPROVED PHASE STORY AND ACCEPTANCE CRITERIA]`. Before editing, inspect relevant code, current worktree changes, contracts, and Knowledge Base. Keep the change bounded and compatible with existing conventions. Update directly related tests and add a concise Knowledge Base progress/decision Markdown note.
>
> **Product behavior:** source snapshots are immutable and commit-specific; graph nodes/edges and findings are typed, versioned, traceable to source locations and analyzer provenance. Represent multiple candidate entry points, unresolved/dynamic edges, unsupported analyzers, missing evidence, and confidence honestly. Never imply static analysis proves runtime behavior.
>
> **Feature/change guidance:** before recommending a new implementation, search the repository graph and source evidence for existing functionality and reusable patterns. Explain whether to reuse, extend, replace, or separate behavior. For changes to existing code, list impacted dependents/contracts and assess relevant compatibility, security, data, performance, reliability, UX/accessibility, and test risks. Separate confirmed evidence from inference and unknowns, suggest targeted regression tests, and keep recommendations advisory unless implementation was explicitly requested.
>
> **Security constraints:** treat every repository, archive, filename, manifest, CI artifact, provider response, and analyzer output as untrusted. Never execute user repository code, build scripts, package lifecycle scripts, tests, Dockerfiles, or uploaded binaries in the normal analysis flow. Do not expose secrets: redact matched values before persistence/output and test logs/exports. Enforce tenant authorization on every object. Bound file count, size, decompression, CPU, memory, time, network, and queue work. Do not log source code, credentials, tokens, or secret matches. Do not silently mark skipped/unsupported scans successful or secure.
>
> **Quality constraints:** preserve type safety; use explicit error states; follow the Structura design tokens; add focused unit/contract/integration/E2E tests for this story; update API schemas and migration paths as applicable. Run relevant tests, type checks, build, security checks, and report exact results and limitations. Do not broaden scope, introduce speculative abstractions, or implement unapproved providers/languages/automation.
>
> **Before considering done:** verify every acceptance criterion directly; inspect the final diff for accidental changes; document configuration, data handling, and operational needs; identify deferred risks or product decisions. If a phase gate is missing, stop before unsafe source ingestion and state the concrete blocker.

## 13. Discovery decisions and remaining questions

Product-owner direction collected on 2026-10-20 is tracked in `knowledge/progress/phase-0-discovery-started.md` and Decision 008. Approved direction to date:

1. **First customer segment:** select engineering leads/CTOs at software teams as the initial buyer and discovery interview focus; build for developers as daily users and keep platform/security as a supported report lens. Validate this assumption with interviews. The product should adapt report presentation by role rather than serve only one persona.
2. **Source paths:** support individual code-file upload, whole-project upload, and Git repository connection. Prove whole-project archive upload first; stage single-file convenience and Git ingestion.
3. **Languages:** product owner requires multi-language support and selected JavaScript/TypeScript, Python, Java, C#/.NET, Go, Rust, PHP, Ruby, and C/C++ as initial priorities. Keep the core contracts language-neutral; validate the adapter depth for each against representative repositories. More languages can be added through the same adapter contract.
4. **Git providers:** product owner requires both GitHub and GitLab, with parallel adapter prototypes. Defer provider integration from the first archive slice; both remain required before provider coverage is complete.
5. **IDE:** VS Code remains the first editor direction, based on the requested extension.
6. **Data policy:** private by default; no source-code reuse for model training; 90-day maximum retention for source and derived artifacts, with 90-day backup expiry after deletion. Launch in all countries worldwide is a product requirement, not a current compliance claim; country-by-country legal review and technical residency controls remain release gates.
7. **Product languages:** the initial locale target is English, Portuguese, Italian, French, Dutch, Spanish, Japanese, Simplified Chinese/Mandarin, Hindi, and Urdu across UI, emails, reports/recommendations, errors, and supported repository prose. Locale-prefixed routing and language negotiation are in place; translated content and source-prose capabilities are not. “All major languages” remains extensible product scope.
8. **AI use:** do not make an LLM the source of truth for graph edges, secret detection, coverage, or vulnerability status. Any explanation layer must cite deterministic evidence and be clearly labeled.
9. **Plugin scope:** begin with first-party language and source-provider adapters behind stable internal interfaces; defer third-party executable plugins until a sandbox and trust model are designed.
10. **Scoring:** no single overall project grade in MVP; use explainable category findings and evidence coverage.

## 14. Engineering change-impact protocol

This workflow applies to Structura contributors as well as product guidance. Before implementing a new capability or changing existing behavior:

1. **Understand the request:** write down expected behavior, users, constraints, acceptance criteria, and non-goals.
2. **Search before adding:** inspect the repository graph/source for existing routes, UI/components, APIs, services, stores, schemas, utilities, standards, and tests that may already satisfy or partially satisfy the need. Search call sites and consumers, not only the first matching file.
3. **Choose intentionally:** recommend reuse/extension or a new abstraction. If a new parallel path is justified, explain the concrete requirement existing functionality cannot meet.
4. **Map change surface:** list files/modules, downstream dependents, public contracts, persistent data, configuration, integrations, permissions, and user-visible flows likely to change.
5. **Assess risks:** consider compatibility/regressions, security/privacy, data migration and rollback, performance/resource use, reliability/operations, accessibility/UX, test gaps, and deployment compatibility. Mark each as confirmed, possible, or unknown and prioritize by impact/likelihood.
6. **Plan validation and recovery:** define focused unit/contract/integration/E2E tests and any migration, feature flag, staged rollout, backup, or rollback needed.
7. **Implement surgically:** preserve unrelated behavior, follow repository patterns, update docs/Knowledge Base, and do not silently expand scope.
8. **Verify exact outcomes:** run relevant checks; report passed/failed/not-run checks and residual risks without claiming unverified success.

For a small isolated change, these steps can be a concise checklist rather than a lengthy design document. For cross-cutting, data-destructive, externally visible, auth/security, or hard-to-reverse changes, document the impact/risk review before implementation and request owner approval when the product behavior or risk tolerance is ambiguous.
