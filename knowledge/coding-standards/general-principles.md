# General Coding Principles

These principles apply to code changes across the Structura repository. Use them alongside focused standards such as [Auth UI Coding Standards](./auth-ui-principles.md).

## Principles

- Understand the relevant code and existing patterns before making a change.
- Before implementing a new capability or changing existing behavior, search for related functionality, its consumers, contracts, data, configuration, and tests; prefer reuse or extension when it fits, and explain why a separate path is needed.
- Map likely impact and assess relevant compatibility, security/privacy, data migration/rollback, performance, reliability, accessibility/UX, and test risks. Distinguish confirmed impacts from possible or unknown ones.
- Implement the actual requirement with the smallest complete, focused change; avoid unrelated refactors.
- Prefer clear, maintainable code and reuse existing helpers and components over duplicating behavior.
- Preserve existing behavior unless a change is intentional and its impact is understood.
- Use precise types and input validation. Avoid unsafe casts and success-shaped fallbacks for invalid data.
- Handle errors explicitly and consistently with the surrounding application; do not silently swallow failures.
- Treat external input as untrusted, protect secrets, and apply least privilege.
- Treat API and queue JSON as `unknown`; validate envelopes, identifiers, enums, timestamps, and record fields before use, and discard undeclared properties instead of copying them into application state.
- For repository ingestion or analysis-worker work, verify the approved threat model, tenant isolation, retention/deletion policy, and resource limits before accepting source data. Never execute uploaded repository scripts, builds, tests, binaries, or Dockerfiles in the static-analysis path.
- For user-facing content, use the approved localization catalogs across UI, emails, reports, recommendations, and errors. Do not claim a locale is supported until its content is reviewed and tested; legal disclosures require qualified jurisdiction-specific review.
- Keep responsibilities cohesive and separate presentation, state, and I/O where the existing architecture does so.
- Make interfaces accessible and responsive, including keyboard use, focus visibility, and readable contrast.
- For web UI, follow the [Structura Design System](./design-system.md) and use shared tokens rather than introducing local visual values.
- Add or update focused tests for changed behavior, including relevant failure cases.
- Update directly related documentation when behavior, setup, or public interfaces change.
- Record each project change in the Knowledge Base using a concise Markdown progress or decision note, and keep that note aligned with the implementation.
- Run the narrowest relevant tests, type checks, builds, and linters; report any validation that could not be run.
- Avoid adding dependencies or abstractions unless the requirement justifies them.

## Change checklist

Before considering a change complete, verify:

- The implementation satisfies the stated requirement and preserves unrelated behavior.
- Types, validation, and error paths are handled explicitly.
- Tests cover the changed behavior and important edge cases.
- Relevant documentation is current.
- Appropriate project checks pass, or any blocker is clearly reported.

For cross-cutting, externally visible, auth/security-sensitive, data-destructive, or hard-to-reverse work, document the impact and risk assessment before implementation and seek a product-owner decision when requirements or risk tolerance are ambiguous. For small changes, keep the same review proportionate and concise.

If a phase gate is unresolved, limit implementation to groundwork that does not accept or expose customer source, record the blocker in the Knowledge Base, and do not imply the gate is satisfied.
