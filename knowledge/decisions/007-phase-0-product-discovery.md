# Decision 007: Initial Product Discovery Direction

**Date:** 2026-10-20  
**Status:** Direction approved for planning; customer validation and detailed architecture decisions remain open

> **Scope update:** Decision 008 supersedes the single-initial-language and single-provider sequencing assumptions below. Multi-language support and both GitHub and GitLab are required product scope.
>
> **Data-policy update:** Decision 010 supersedes the open retention and hosting/residency questions below with a 90-day maximum retention policy and an all-country worldwide launch requirement; implementation and country-by-country compliance review remain open.

## Context

Structura's intended product spans a web app, source upload, Git repository connections, code graph/reporting, and an IDE extension. Shipping every source path and analysis domain at once would make quality and safety difficult to validate. The product owner asked to begin discovery and requested a product capable of adapting its guidance to different engineering roles.

## Decisions

1. Plan the initial buyer/discovery focus around **engineering leads and CTOs at software teams**, with developers as primary day-to-day users and platform/security engineers supported through role-aware report lenses. The product owner delegated selection; validate this hypothesis with customer interviews before locking positioning.
2. The long-term product direction includes **single-file upload, whole-project upload, and Git repository connection**. Stage delivery rather than treating all paths as one MVP release.
3. Prove the first vertical slice with a **bounded whole-project archive upload**.
4. Initial-language support was open at the time of this decision. Decision 008 establishes multi-language support as a product requirement and leaves the launch cohort to representative customer evidence.
5. Git provider integration is deferred from the first archive vertical slice; Decision 008 establishes both GitHub and GitLab as required product integrations.
6. Treat repository data as **private by default**, do not reuse source code for model training, and require explicit retention/deletion behavior. Decision 010 records the current retention and worldwide residency direction.
7. Report presentation should adapt to the reader's role without changing underlying evidence, finding severity, or confidence.

## Consequences

- Build source adapters against a shared analysis contract so file, archive, and Git ingestion eventually reuse a single engine.
- Design the archive-first flow with strict limits and safe extraction; never execute uploaded project code in the regular static-analysis workflow.
- Phase 0 remains open for target-user interviews, repository corpus selection, graph/report contract design, threat modeling, and retention/residency requirements.
- A single overall quality score, universal language claim, and provider integration are not MVP prerequisites.

## References

- Product requirements and phased delivery: [Product Vision and Implementation Roadmap](../strategy/product-vision-and-implementation-roadmap.md)
- Current discovery evidence and remaining work: [Phase 0 Discovery — Initial Findings](../progress/phase-0-discovery-started.md)
