# Decision 008: Multi-Language and Git Provider Product Scope

**Date:** 2026-10-20  
**Status:** Product direction approved; per-language depth and capacity estimates remain to be validated

## Context

The initial discovery recommendation described one first language and one first Git provider. The product owner clarified that Structura must not be bounded to one programming language and must support GitHub and GitLab.

## Decisions

1. **Multi-language is a product requirement.** The analyzer core, graph model, report API, and project model must be language-neutral. Language support is delivered through independent, testable adapters.
2. **Do not claim all languages have equal analysis depth.** Each adapter publishes its supported file types, graph edge types, checks, version, coverage, and limitations. A repository may contain multiple languages; one adapter's unsupported files must not prevent other available adapters from contributing.
3. **Initial language cohort:** JavaScript/TypeScript, Python, Java, C#/.NET, Go, Rust, PHP, Ruby, and C/C++. This is an initial priority set, not an exhaustive definition of every language Structura will support. Validate demand and adapter feasibility against customer repositories and a permission-cleared evaluation corpus. Additional requested languages remain to be named.
4. **Both GitHub and GitLab are required product integrations.** Begin their adapter prototypes in parallel against a shared source-provider contract. Phase completion/product coverage requires both.
5. **Archive-first sequencing remains approved.** The first source-ingestion vertical slice is a bounded project archive. Single-file and Git provider flows follow without duplicating the analysis engine.

## Consequences

- Phase 0 must define language-adapter and source-provider contracts and assemble representative fixtures for the nine initial language families.
- Phase 3 is a multi-language graph/report phase; Phase 4 includes both GitHub and GitLab.
- Product UI and reports must disclose per-language and per-provider support/coverage rather than imply universal parity.
- Phase 1 may begin with safe tenancy/product foundations, but source ingestion must not proceed until the source threat model, authorization, and retention policy are ready.

## References

- [Product Vision and Implementation Roadmap](../strategy/product-vision-and-implementation-roadmap.md)
- [Phase 0 Discovery — Initial Findings](../progress/phase-0-discovery-started.md)
- [Phase 1 Foundation Kickoff](../progress/phase-1-foundation-kickoff.md)
