# Decision 009: Phase 2 Safety Gates and Sequencing

**Date:** 2026-10-21  
**Status:** Phase 2 groundwork approved; threat-model draft exists; source acceptance remains blocked

## Context

The roadmap's next phase is source ingestion and asynchronous analysis. Product direction calls for bounded archive upload. Retention and worldwide service direction have since been set in [Decision 010](./010-source-retention-and-global-residency.md); source threat modeling, compliance mapping, implementation of retention/deletion, and production-grade tenancy/session controls remain incomplete.

## Decisions

1. Begin Phase 2 with source-independent groundwork: a typed analysis-job lifecycle, synthetic-fixture tests, and safe-ingestion implementation guidance.
2. Do not implement or enable endpoints that accept uploads, fetch repositories, persist source snapshots, or expose source content until the mandatory gates below are approved and implemented. A draft threat model and source-independent retention helper do not satisfy those gates.
3. Never execute repository scripts, builds, tests, binaries, or Dockerfiles in the static-analysis workflow.
4. Keep the Phase 1 foundation status active until its outstanding authorization/session, team access, and operational acceptance criteria are met. Phase 2 preparation does not imply Phase 1 completion.
5. Keep all source handling private-by-default, no-training, resource-bounded, tenant-scoped, and covered by explicit retention and verifiable deletion.
6. Source-independent analysis-job/progress metadata schema and deterministic inventory utilities may be implemented with synthetic metadata only. Their presence does not enable job submission, source handling, artifact persistence, or worker execution.
7. A test-only synthetic pipeline may exercise contracts, deterministic metadata inventory, lifecycle transitions, and progress-event validation with hard-coded fixtures. It must not accept file bytes, access customer projects, persist jobs/artifacts, call external providers, or execute repository content; it is not a staging source-ingestion path.

## Required release gates for source acceptance

- Approved threat model and source data-flow map.
- Recorded retention/residency policy direction and implemented retention/deletion controls, backup expiry, and region-aware data-flow safeguards.
- Production-appropriate session handling and tenant/project authorization.
- Isolated, least-privileged worker boundary with network and resource controls.
- Archive safety, secret redaction, auditability, and deletion tests.

## Consequences

- Phase 2 can define shared contracts and job state behavior without touching customer source.
- Synthetic pipeline tests may compose those pure components in memory as an integration check; this does not create a runtime API or worker.
- Archive upload, repository-provider fetch, object storage, and worker execution remain out of scope until the gates are addressed.
- Any follow-on implementation must update the Phase 2 progress note and evidence each gate rather than assuming approval.

## References

- [Product Vision and Implementation Roadmap](../strategy/product-vision-and-implementation-roadmap.md)
- [Phase 2 Analysis Platform Kickoff](../progress/phase-2-analysis-platform-kickoff.md)
- [Phase 2 Threat Model and Data Flow — Review Draft](../architecture/phase-2-threat-model-and-data-flow.md)
- [Safe Source Ingestion skill](../skills/source-ingestion.md)
- [Decision 010 — Source Retention and Global Residency Direction](./010-source-retention-and-global-residency.md)
- [Phase 2 Threat Model and Data Flow — Review Draft](../architecture/phase-2-threat-model-and-data-flow.md)
