# Phase 2 Threat Model and Data Flow — Review Draft

**Status:** Draft; not approved for source acceptance  
**Scope:** Proposed archive-analysis path only. No source upload, repository fetch, source storage, or worker execution is currently enabled.

## Proposed data flow

```text
Browser
  -> authenticated API (tenant/project authorization, upload limits)
  -> quarantine/object storage (private, encrypted, region-pinned, expiry metadata)
  -> durable queue (opaque job/snapshot IDs only; no source bytes)
  -> isolated static-analysis worker (read-only snapshot; no repository code execution)
  -> tenant-scoped derived artifacts (inventory/report metadata; source-free logs)
  -> authorized API/UI

Deletion request
  -> revoke access and delete primary source/artifacts immediately
  -> cancel queued/running work and remove temporary worker data
  -> propagate deletion to replicas/caches
  -> record backup purge deadline (maximum 90 days after primary deletion)
  -> verify completion without retaining source content
```

This diagram is a proposed boundary map, not evidence that the components or controls exist.

## Assets and trust boundaries

| Asset | Proposed protection | Evidence still required |
|---|---|---|
| Source archive and extracted files | Private, encrypted, tenant-scoped, short-lived quarantine; never executed | Storage implementation, encryption/key controls, archive tests, isolation tests |
| Provider credentials | Least privilege, encrypted at rest, revocable, excluded from logs | Provider design, secret-management evidence, revocation tests |
| Job metadata and queue messages | Opaque IDs, tenant binding, idempotency, bounded retries | Queue implementation, authorization and replay tests |
| Derived inventory/reports | Same tenant and retention controls as source | Storage schema, API authorization, deletion verification |
| Logs and telemetry | No source text, raw secrets, or provider tokens | Redaction tests, log review, operational configuration |
| Backups and replicas | Region-aware, documented expiry, deletion propagation | Infrastructure configuration and restore/deletion exercises |

## Threats to validate

1. Cross-tenant reads or writes through guessed IDs, queue messages, storage keys, or report links.
2. Archive traversal, links/special files, decompression bombs, excessive file counts, deep paths, or parser resource exhaustion.
3. Indirect execution of repository code through package managers, build tools, test runners, or Dockerfiles.
4. Source, secrets, or credentials leaking through logs, exceptions, progress events, metrics, traces, or support tooling.
5. Duplicate/replayed jobs, confused-deputy behavior, unauthorized retries/cancellation, or inaccurate terminal status.
6. Stale source/artifacts remaining in workers, caches, replicas, or backups after deletion.
7. Cross-border processing or backup placement contrary to a reviewed country-specific policy.
8. Worker compromise leading to access to host mounts, other jobs, cloud credentials, or unrestricted network destinations.

## Required technical controls

- Authenticate every source-bearing request and authorize workspace/project membership at each object boundary.
- Validate API and queue response envelopes/records before application use; reject duplicate identifiers and malformed serialization rather than treating them as empty results.
- Enforce compressed/expanded byte, file-count, path-depth, CPU, memory, wall-clock, and concurrency limits.
- Validate archive structure before extraction; reject traversal and unsafe link/special-file behavior.
- Run static analysis in a least-privileged, disposable worker with no unnecessary network, credentials, host mounts, or code execution.
- Use immutable snapshot identity and idempotent job creation; constrain progress events to declared codes and fields.
- Redact secrets and source content before any operational output; test response and logging paths.
- Make deletion immediate for primary storage and derived artifacts, cancel work, clean temporary storage, and verify replica/cache/backup behavior.
- Pin storage and processing to a reviewed region and prevent unapproved cross-border data flow.

## Approval and evidence checklist

This draft must be reviewed and signed by security, privacy/legal, infrastructure, and product owners before it can be treated as an approved threat model.

- [ ] Threat actors, assets, trust boundaries, abuse cases, and residual risks reviewed.
- [ ] End-to-end data-flow map includes API, storage, queue, workers, artifacts, logs, telemetry, replicas, backups, and deletion.
- [ ] Country-by-country and applicable subnational legal/data-residency review completed by qualified reviewers.
- [ ] Production session and tenant-authorization model approved and negatively tested.
- [ ] Retention/deletion behavior implemented and verified across primary and backup systems.
- [ ] Worker isolation and resource/network policy measured and tested.
- [ ] Archive safety, secret-redaction, audit, deletion, cancellation, and cross-tenant tests pass.
- [ ] Release owner records approval and links evidence for each control.

Until every applicable item is complete, keep source acceptance, provider fetch, source persistence, and worker execution disabled.
