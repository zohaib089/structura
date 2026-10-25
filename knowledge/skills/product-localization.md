# Skill: Product Localization

**Skill ID:** `product-localization`  
**Version:** 1.1

## Purpose

Guide localization of Structura's interface and all customer-facing content while preserving accuracy, accessibility, and jurisdiction-specific legal review.

## Initial locale target

- English (`en`)
- Portuguese (`pt`)
- Italian (`it`)
- French (`fr`)
- Dutch (`nl`)
- Spanish (`es`)
- Japanese (`ja`)
- Simplified Chinese (`zh-Hans`; Mandarin written in Simplified Chinese)
- Hindi (`hi`)
- Urdu (`ur`, right-to-left)

The catalog must be extensible. “All major languages” is not a bounded completion criterion; any future additions need a locale tag, translation ownership, review coverage, and release tests.

## Required content surfaces

Apply localization to:

- Web interface, navigation, controls, validation, errors, notifications, accessibility labels, and help copy.
- Authentication and product emails.
- Reports, findings, recommendations, and exports.
- Legal and privacy disclosures, with jurisdiction-specific qualified review.
- Natural-language prose analysis for source comments and documentation, with language-detection coverage and confidence disclosed.

Natural-language support is distinct from programming-language parser support. Do not translate identifiers or source code, and do not claim that adding a UI locale provides source-language analysis capability.

## Required implementation practices

1. Use BCP 47 locale tags and structured, parameterized message catalogs; do not concatenate translated fragments.
2. Centralize locale selection, formatting, and explicit fallback behavior.
3. Track catalog completeness and review status per locale and content surface.
4. Use locale-aware number, date, time, and plural formatting.
5. Test long text, CJK line wrapping, RTL direction/layout for Urdu, keyboard accessibility, and screen-reader labels.
6. Keep English fallback available, but surface missing translations to maintainers; legal copy is not approved by fallback or machine translation.
7. Obtain human/legal review for privacy notices, terms, consent, retention, deletion, and region-specific statements.
8. Keep all localized variants semantically equivalent; do not change report evidence, severity, or confidence across locales.
9. Report unsupported or partially reviewed locales explicitly.
10. Keep a clear coverage boundary: translated navigation, dashboard, or auth strings do not mean emails, API errors, reports, exports, legal content, or repository prose are localized.
11. Treat newly added translations as unreviewed until a qualified human reviewer records their locale and content-surface approval; parity tests prove completeness, not linguistic correctness.
12. Ensure every auth-flow state has localized headings, labels, helper text, validation copy, button states, and accessible password-control names; test reset, verification, OTP, and account-management routes.
13. Localize the whole shared auth shell, including its promotional copy, instead of translating only the form column.

## Review checklist

- Are all required content surfaces covered for the locale?
- Do login, signup, recovery, reset, email verification, OTP, and account-deletion screens avoid silently reverting to English UI copy?
- Are fallback behavior and translation coverage explicit?
- Are legal disclosures reviewed for the relevant jurisdiction and language?
- Are RTL, CJK, keyboard, assistive-technology, and date/number formats tested?
- Are language detection and source-prose analysis limitations disclosed separately from programming-language support?
- Is translated content semantically equivalent to the canonical source?

## Output expectations

Report implemented locale coverage separately from target scope. Do not claim a locale or legal jurisdiction is supported until translation, review, and end-to-end validation are complete.
