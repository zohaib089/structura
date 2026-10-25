# Skill: Coding Principles

**Skill ID:** `coding-principles`  
**Version:** 1.1

## Purpose

Help agents implement and review code consistently with Structura's shared engineering standards.

## When to use

Use for implementation, bug fixes, refactoring, and code review across the repository. Apply focused domain standards as well, such as the Auth UI skill for authentication screens.

## Required workflow

1. Confirm expected behavior, user, acceptance criteria, constraints, and non-goals.
2. Read the current phase plan, exit criteria, related decisions, and open security/product gates. Do not silently mark an incomplete phase done.
3. Search related functionality, call sites/consumers, APIs, components, services, stores, schemas, persistence, configuration, standards, and tests before adding a new path.
4. Decide whether to reuse, extend, replace, or keep behavior separate. Explain why existing functionality is insufficient before creating a duplicate implementation or abstraction.
5. Map affected modules, downstream dependents, external contracts, persisted data, configuration, integrations, permissions, and user-visible workflows.
6. Assess relevant compatibility/regression, security/privacy, data migration/rollback, performance/resources, reliability/operations, accessibility/UX, and test risks. Mark impacts as evidenced, possible, or unknown and prioritize them.
7. Define focused validation and any needed migration, feature flag, staged rollout, backup, or rollback.
8. Implement a focused, complete change while preserving behavior outside the intended scope.
9. Use explicit types, validate inputs, and handle errors visibly and consistently.
10. Treat network/API/queue JSON as `unknown`; validate the response envelope and each record before use, and project only declared fields into application state.
11. Add or update focused tests for behavior and important failure cases.
12. Update directly related documentation, the applicable phase plan, and a Knowledge Base Markdown progress or decision note.
13. Run relevant tests, type checks, builds, or linters and report passed, failed, and unrun checks.

## Untrusted source and analysis work

- Use the [Safe Source Ingestion skill](./source-ingestion.md) for archive, file, provider, storage, queue, or worker changes.
- Do not enable acceptance of repository source until the source threat model, tenant isolation, retention/deletion policy, and hosting/residency requirements are approved.
- Static analysis must never execute uploaded repository scripts, builds, tests, binaries, or Dockerfiles.
- Keep source handling private-by-default, bounded by explicit resource limits, and free of source/secret content in logs and telemetry.
- If a phase gate remains unresolved, implement only groundwork that does not accept or expose customer source; document the gate and stop before crossing it.

Keep the process proportionate for small, isolated changes. For cross-cutting, externally visible, auth/security-sensitive, data-destructive, or hard-to-reverse work, document the impact and risk assessment before implementation and ask the product owner when scope or risk tolerance is ambiguous.

## Quality checklist

- Is the change correct, maintainable, and limited to the requested scope?
- Are types and invalid-input paths explicit, without unsafe casts or silent fallbacks?
- Are errors surfaced rather than hidden?
- Are security, accessibility, and responsive behavior considered where relevant?
- Are changed behaviors covered by tests?
- Is related documentation current, and has validation been performed?

## Project-specific guidance

- Follow the repository's existing TypeScript strictness and Vue component patterns.
- Keep UI presentation, state, and I/O responsibilities consistent with neighboring code.
- Follow the [General Coding Principles](../coding-standards/general-principles.md) and any applicable focused standard.
