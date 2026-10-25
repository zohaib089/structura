# Decision 010: Source Retention and Global Residency Direction

**Date:** 2026-10-21  
**Status:** Product policy direction approved; legal/compliance mapping and enforcement remain open

## Decisions

1. Retain raw source snapshots for **90 days maximum**; users may delete them earlier.
2. Retain derived analysis artifacts (including inventories, graphs, and reports) for **90 days maximum**; users may delete them earlier.
3. Deleted source and derived artifacts may remain in backups for no longer than **90 days**; deletion from primary systems must not wait for backup expiry.
4. Structura's launch target is **all countries worldwide**, including EU member states, the United States, the United Kingdom, Australia, New Zealand, and all countries in Asia and Africa. No country may be represented as supported until its applicable requirements have been mapped and reviewed.
5. Keep repository data private by default and do not reuse customer source for model training.
6. Customer-facing content, including privacy notices, consent, retention/deletion information, and terms, must be localized where required and reviewed for the applicable jurisdiction and language.

## Scope and interpretation

- These are product requirements, not evidence that current infrastructure is compliant or that the service is ready for worldwide launch. All-country availability is a launch gate, not a claim of blanket compliance under one standard.
- “Worldwide” requires country-by-country legal and regulatory mapping, plus region-aware storage and processing decisions. Do not move source across borders unless applicable law, customer configuration, and approved data-flow policy permit it.
- Before offering service in any country, document applicable requirements, data location, subprocessors, transfer basis, backup behavior, breach/rights handling, localized disclosures, and deletion verification with qualified legal/compliance review. Include applicable subnational requirements, such as U.S. state laws and EU member-state variation.
- The retention durations are maximum periods, not minimums; product-wide retention and backup expiry must be enforced consistently across source, derived artifacts, logs, caches, replicas, and backups where applicable.
- The API currently has a source-independent helper for calculating the 90-day maximum deadline. It does not persist expiry metadata, delete data, run a cleanup schedule, or prove backup/replica expiry and is not evidence of enforcement.
- Asia and Africa are not single regulatory jurisdictions; maintain a country-level inventory for every country in the launch scope.

## Consequences

- Phase 2 architecture must support region-aware deployment/storage boundaries and automated deletion; a single-region design must not be represented as worldwide-compliant.
- Launch remains blocked until all countries in the declared scope have completed legal/compliance review and implemented controls have evidence.
- Threat modeling, data-flow review, legal review, operational controls, and tests remain blockers before source acceptance.
- Any future user-configurable retention or legal-hold feature requires a superseding decision.

## References

- [Product Vision and Implementation Roadmap](../strategy/product-vision-and-implementation-roadmap.md)
- [Phase 2 Analysis Platform Kickoff](../progress/phase-2-analysis-platform-kickoff.md)
- [Decision 009 — Phase 2 Safety Gates and Sequencing](./009-phase-2-safety-gates.md)
