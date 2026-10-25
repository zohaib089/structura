/**
 * Skill: Coding Principles
 * Shared implementation and review guidance for the Structura repository.
 */

export interface CodingPrinciplesInput {
  task: 'implementation' | 'bug-fix' | 'refactoring' | 'review'
  area?: 'general' | 'typescript' | 'vue' | 'api'
}

export interface CodingPrinciplesOutput {
  success: boolean
  message: string
  guidance: string[]
}

export function codingPrinciples(input: CodingPrinciplesInput): CodingPrinciplesOutput {
  const guidance = [
    'Confirm expected behavior, users, acceptance criteria, constraints, and non-goals before editing.',
    'Search related functionality, consumers, contracts, data, configuration, standards, and tests before adding a new implementation.',
    'Decide whether to reuse, extend, replace, or separate existing behavior; explain why existing functionality is insufficient before creating a duplicate path.',
    'Map affected modules, downstream dependents, public contracts, persisted data, permissions, integrations, and user-visible workflows.',
    'Assess relevant compatibility, security/privacy, data migration/rollback, performance, reliability, accessibility/UX, and test risks; distinguish evidence from possibility and unknowns.',
    'Plan focused validation and any needed migration, feature flag, staged rollout, backup, or rollback.',
    'Satisfy the stated requirement with a focused, complete change; avoid unrelated refactors.',
    'Preserve existing behavior unless a change is intentional and its impact is understood.',
    'Prefer clear, maintainable code and reuse existing components and helpers.',
    'Use precise types, validate inputs, and avoid unsafe casts or success-shaped fallbacks.',
    'Handle errors explicitly and consistently; do not silently swallow failures.',
    'Protect secrets, treat external input as untrusted, and apply least privilege.',
    'For user-facing content, follow the product-localization skill: keep translations complete across UI, emails, reports, recommendations, and errors, and treat translated legal disclosures as review-required content.',
    'For repository ingestion or analysis-worker work, check the approved threat model, tenancy controls, retention/deletion policy, and resource limits before accepting source data.',
    'Never execute uploaded repository scripts, builds, tests, or Dockerfiles in the static-analysis path; keep ingestion and worker changes behind explicit safety gates.',
    'Add or update focused tests for changed behavior and important failure cases.',
    'Update directly related documentation and run relevant project checks.'
  ]

  if (input.area === 'typescript') {
    guidance.push('Preserve strict type safety and use existing domain types instead of weakening types.')
  }

  if (input.area === 'vue') {
    guidance.push('Follow neighboring Vue component patterns and consider keyboard access, focus, contrast, and responsive layouts.')
  }

  if (input.area === 'api') {
    guidance.push('Validate request data at system boundaries and return errors using established API conventions.')
  }

  if (input.task === 'review') {
    guidance.push('Prioritize actionable correctness, regression, security, and maintainability issues over stylistic preferences.')
    guidance.push('Report affected consumers, evidence, risk likelihood/impact, and test gaps; distinguish confirmed impact from inference.')
  }

  return {
    success: true,
    message: 'Coding principles guidance prepared successfully',
    guidance
  }
}
