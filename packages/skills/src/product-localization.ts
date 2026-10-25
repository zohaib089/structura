/**
 * Skill: Product Localization
 * Guidance for Structura's multilingual product and user-facing content.
 */

export type ProductLocalizationTask = 'design' | 'implementation' | 'review'

export interface ProductLocalizationInput {
  task: ProductLocalizationTask
  surface?: 'web-ui' | 'emails' | 'reports' | 'repository-text' | 'legal-content'
}

export interface ProductLocalizationOutput {
  success: boolean
  message: string
  guidance: string[]
}

export function productLocalization(
  input: ProductLocalizationInput
): ProductLocalizationOutput {
  const guidance = [
    'Use the approved locale catalog and BCP 47 tags; do not infer support from language detection alone.',
    'Keep user-facing UI, authentication and product emails, reports, recommendations, errors, and notifications localizable from structured message catalogs.',
    'Do not concatenate translated fragments; use parameterized messages with locale-aware plural, number, date, and time formatting.',
    'Preserve a stable English fallback, but make missing translation coverage visible to maintainers and never present an untranslated legal disclosure as reviewed.',
    'Treat translation completeness and human review as release criteria for every supported surface and locale.',
    'Use qualified human/legal review for privacy notices, terms, consent, retention, deletion, and other jurisdiction-specific disclosures; machine translation alone is not approval.',
    'Test long strings, CJK line wrapping, names and dates, keyboard/accessibility labels, and RTL layout including Urdu.',
    'Treat natural-language text in source comments and documentation separately from programming-language parser support; disclose language detection and analysis limitations.',
    'Do not claim a locale or jurisdiction is supported until catalog coverage, review status, formatting, and end-to-end behavior are verified.'
  ]

  if (input.surface === 'legal-content') {
    guidance.push('Map each customer-facing legal disclosure to applicable jurisdictions and obtain qualified legal review before release.')
  }

  if (input.surface === 'repository-text') {
    guidance.push('Do not translate source identifiers or code; preserve original text and attach language-detection confidence to prose analysis.')
  }

  if (input.task === 'review') {
    guidance.push('Report missing or stale translations, fallback behavior, untranslated error states, and unsupported locale claims.')
  }

  return {
    success: true,
    message: 'Product localization guidance prepared successfully',
    guidance
  }
}
