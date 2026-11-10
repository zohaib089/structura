/**
 * Translatable text for the advanced landing page. Every locale must provide every key (enforced by the type).
 * `{name}` is filled with BRAND.name; `{n}`, `{label}`, `{steps}`, `{link}`, `{issue}`, `{severity}` are filled at runtime.
 * Code, file names, commands and the EXTRACTED / INFERRED / UNRESOLVED tags are not translated.
 */
export type Pair = readonly [title: string, body: string]

export interface LandingStrings {
  documentTitle: string
  metaDescription: string
  skipLink: string
  homeLabel: string
  nav: { label: string; product: string; how: string; docs: string; githubLabel: string }
  cta: { viewer: string; selfHost: string; scan: string; projects: string; selfHostGuide: string }
  hero: {
    eyebrow: string
    titleLead: string
    titleEmphasis: string
    leadBefore: string
    leadMap: string
    leadMiddle: string
    leadNoAccount: string
    leadAfter: string
    scanPrompt: string
    graphTitle: string
    legendLabel: string
    sampleTag: string
    inspectDefaultTitle: string
    inspectDefaultBody: string
    inspectEntryBody: string
    inspectEntryLabel: string
    entryTag: string
    graphListLabel: string
    graphTextIntro: string
  }
  steps: { one: string; other: string }
  a11y: { node: string; noIssues: string; issue: string; issueSentence: string; inspectSteps: string; inspectLink: string }
  proof: { label: string; items: readonly [Pair, Pair, Pair, Pair] }
  how: {
    kicker: string
    title: string
    lead: string
    step: string
    steps: readonly [Pair, Pair, Pair]
    sources: readonly [string, string, string]
    checking: { before: string; files: string; middle: string }
    loaderLabel: string
    initialStatus: string
    runScan: string
    previewToasts: string
    phases: readonly [Pair, Pair, Pair, Pair]
    finished: Pair
    findingsLabel: string
    findings: readonly [string, string, string]
  }
  toasts: {
    sampleLoaded: string
    scanStarted: string
    scanFinished: string
    scanFinishedBody: string
    viewMap: string
    previewInfo: string
    previewInfoBody: string
    previewWarning: string
    previewWarningBody: string
    previewError: string
    previewErrorBody: string
    retry: string
  }
  connections: {
    kicker: string
    title: string
    lead: string
    lines: readonly [string, string, string]
    rows: readonly [Pair, Pair, Pair]
  }
  coverage: {
    kicker: string
    title: string
    lead: string
    note: string
    statValue: string
    statLabel: string
    barLabel: string
    rows: readonly [readonly [string, string, string], readonly [string, string, string], readonly [string, string, string]]
  }
  selfHost: {
    kicker: string
    title: string
    lead: string
    bullets: readonly [string, string, string]
    terminalLabel: string
    terminalBadge: string
    comments: readonly [string, string, string]
  }
  closing: { title: string; lead: string }
  footer: { label: string; docs: string; selfHost: string }
  severity: { critical: string; high: string; medium: string; low: string; info: string }
  linkKind: { extracted: string; inferred: string; unresolved: string; start: string }
}
