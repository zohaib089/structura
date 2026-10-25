# Skill: Safe Source Ingestion

**Skill ID:** `source-ingestion`  
**Version:** 1.2

## Purpose

Guide design, implementation, and review of source uploads, repository connections, analysis queues, and workers while protecting customer code and secrets.

## When to use

Use for archive or single-file ingestion, GitHub/GitLab connections, source storage, job queues, analysis workers, cleanup/deletion, or incidents involving repository content.

## Mandatory gates

Before accepting or connecting real customer source, confirm all of the following are approved and implemented:

- Threat model and data-flow map across API, storage, queue, workers, artifacts, logs, backups, and deletion.
- Tenant authorization and negative cross-tenant tests for every source-bearing object.
- Source-data purpose and no-training policy, retention duration, hosting/residency, deletion, and backup-expiry behavior.
- Country-by-country legal/compliance mapping and region-aware data-flow controls for every launch jurisdiction.
- Isolation boundary, least privilege, network policy, and per-job resource limits.
- Secret redaction and verification that source or secret values do not reach logs, telemetry, error responses, or test snapshots.
- Evidence-backed threat-model sign-off by security, privacy/legal, infrastructure, and product owners; a draft diagram or checklist is not approval.
- Tested immediate primary deletion, worker-temp cleanup, replica/cache propagation, and a backup purge deadline no later than 90 days after primary deletion.

If a gate is open, work may proceed on contracts, synthetic fixtures, state-machine foundations, and source-independent policy helpers only. Do not add an endpoint or integration that accepts, fetches, persists, or exposes customer source.

## Required controls

1. Treat archive entries, paths, manifests, repository metadata, and derived artifacts as untrusted input.
2. Enforce explicit compressed and expanded byte limits, file-count and path-depth limits, timeouts, and memory ceilings.
3. Reject traversal and absolute paths. Handle links and special files so they cannot write outside an isolated per-job workspace.
4. Validate archive structure before extraction and extract only into a newly created, isolated job directory.
5. Never execute repository scripts, package lifecycle hooks, builds, tests, binaries, or Dockerfiles in the static-analysis workflow.
6. Use immutable snapshot identity, idempotent job semantics, versioned analyzers, and traceable evidence.
7. Restrict access to source and artifacts by tenant at every storage and API boundary. Encrypt provider credentials and support least-privilege access and revocation.
8. Redact secret findings; never log source text, credentials, or raw matched secret values.
9. Make retries, cancellation, partial failure, cleanup, and deletion explicit. A failed cleanup must not be reported as successful.
10. Validate with malformed and boundary fixtures, isolation tests, resource-limit tests, retry/cancel tests, and retention/deletion tests.
11. Treat retention calculations as policy primitives, not enforcement; production readiness requires wired storage/backup deletion, a scheduled worker, monitoring, and deletion-verification tests.
12. Keep legal/compliance status jurisdiction-specific. A global target, product policy, or draft country inventory is not legal approval or proof of data residency.
13. Decode API and queue payloads from `unknown`; validate every record field, enum, identifier, timestamp, and aggregate before using it. Return only declared fields rather than forwarding arbitrary properties.
14. Reject duplicate IDs in collection responses and report malformed JSON or response envelopes explicitly; never convert malformed, duplicate, or unauthorized data into an empty success state.
15. Metadata-only inventories may classify paths, sizes, and likely language from names/extensions, but must state that these are estimates and must not imply source parsing or semantic analysis.
16. Keep job/progress metadata disconnected from customer-source operations until the gates are approved; schema presence alone does not justify submission, retrieval, cancellation, queueing, or worker endpoints.

## Review checklist

- Are all mandatory gates approved, or is the implementation explicitly limited to non-source groundwork?
- Is the threat model formally approved, with named reviewers and evidence, rather than merely documented?
- Can hostile input exceed resource limits, escape the job boundary, or affect another tenant?
- Can any repository-provided content execute directly or indirectly?
- Are source, derived artifacts, credentials, and logs governed by the stated retention and deletion policy?
- Are retention deadline helpers connected to primary, replica, cache, and backup deletion with operational evidence?
- Are progress, retries, cancellations, failures, and cleanup states honest and observable without revealing source?
- Are limitations and unassessed checks disclosed rather than presented as successful analysis?

## Output expectations

Report which gates were checked, which controls are evidenced by code/tests, which remain unknown, and whether the implementation accepts real source. Explicitly distinguish a draft threat model, a policy helper, and a tested enforcement control. Do not describe source ingestion as production-ready while any required gate is open.
