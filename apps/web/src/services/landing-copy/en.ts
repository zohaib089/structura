import type { LandingStrings } from './types'

export const en: LandingStrings = {
  documentTitle: '{name} \u2014 See how your code fits together, and what\u2019s risky',
  metaDescription: '{name} maps a project on your machine into a ring-shaped map around its real entry points. No account. Nothing uploaded to view a graph.',
  skipLink: 'Skip to content',
  homeLabel: '{name} home',
  nav: { label: 'Primary', product: 'Product', how: 'How it works', docs: 'Docs', githubLabel: '{name} on GitHub' },
  cta: { viewer: 'Try the viewer', selfHost: 'Self-host', scan: 'Scan a project', projects: 'Go to your projects', selfHostGuide: 'Self-host guide' },
  hero: {
    eyebrow: '{name} \u00b7 local-first',
    titleLead: 'See how your code fits together \u2014 ',
    titleEmphasis: "and what's risky.",
    leadBefore: '{name} turns a project on your machine into a ',
    leadMap: 'ring-shaped map',
    leadMiddle: ' around its real starting points. ',
    leadNoAccount: 'No account. Nothing uploaded',
    leadAfter: ' to view a graph.',
    scanPrompt: 'Have a project ready? ',
    graphTitle: 'Sample map of a project, drawn as rings around its entry file',
    legendLabel: 'How to read the lines',
    sampleTag: 'Sample data \u2014 a made-up project',
    inspectDefaultTitle: 'main.ts \u2014 where the project starts',
    inspectDefaultBody: 'Hover or tab to a file to see what it connects to. Rings show steps away from the start.',
    inspectEntryBody: 'Everything else is measured in steps from here.',
    inspectEntryLabel: 'Entry point',
    entryTag: 'ENTRY POINT',
    graphListLabel: 'Files in the sample map',
    graphTextIntro:
      'Text version of the sample map. The start file main.ts sits in the centre. Ring 1 has 8 files that main.ts uses directly. Ring 2 has 12 files reached through those. Ring 3 has 10 more. Each file shows its most serious finding as an icon and a word. Lines are solid when found in the code, dashed when likely, and dotted when the link could not be confirmed.'
  },
  steps: { one: '{n} step', other: '{n} steps' },
  a11y: { node: '{label}, {steps} from the start. {link}. {issue}', noIssues: 'No issues found.', issue: '{severity} issue', issueSentence: '{severity} issue.', inspectSteps: '{steps} from {start}', inspectLink: 'link:' },
  proof: {
    label: 'At a glance',
    items: [
      ['Runs on your machine', 'Your code stays where it is.'],
      ['No account to view', 'Open a graph file and look around.'],
      ['TypeScript & JavaScript today', 'Other languages are listed as skipped, not hidden.'],
      ['Every link says how it was found', "Found in code, likely, or couldn't confirm."]
    ]
  },
  how: {
    kicker: 'How it works',
    title: 'Three steps from folder to map.',
    lead: 'Point {name} at a project, let it read the files, then explore the result. You can follow progress as it goes.',
    step: 'STEP',
    steps: [
      ['Pick a project', 'A folder, a zip file, or a Git link. {name} checks it first and tells you if anything is too big.'],
      ['{name} reads it', 'It follows every import, notes how sure it is about each link, and looks for risky spots along the way.'],
      ['Read the map and the report', 'Start at the entry file and walk outward. The report lists what to look at first, in plain words.']
    ],
    sources: ['Folder', 'Zip', 'Git link'],
    checking: { before: 'Checking ', files: '1,240 files', middle: '\u2026 skipping ' },
    loaderLabel: 'Analysing code',
    initialStatus: 'Running analyser (3 of 7)',
    runScan: 'Run a sample scan',
    previewToasts: 'Preview notifications',
    phases: [
      ['Preparing files', 'Checking 1,240 files\u2026'],
      ['Analysing code', 'Running analyser (3 of 7)'],
      ['Analysing code', 'Running analyser (7 of 7)'],
      ['Building report', 'Putting findings together\u2026']
    ],
    finished: ['Scan finished', '142 of 150 files checked'],
    findingsLabel: 'Example findings',
    findings: ['Circular link between two core files', 'Page reaches straight into the database layer', 'File with many incoming links']
  },
  toasts: {
    sampleLoaded: 'Sample project loaded',
    scanStarted: 'Scan started',
    scanFinished: 'Scan finished',
    scanFinishedBody: '142 files mapped \u00b7 2 links to check',
    viewMap: 'View map',
    previewInfo: 'Sample loaded',
    previewInfoBody: 'main.ts is the starting point.',
    previewWarning: '2 links we couldn\u2019t follow',
    previewWarningBody: 'They\u2019re listed in coverage.',
    previewError: 'Couldn\u2019t read one folder',
    previewErrorBody: 'Check permissions, then retry.',
    retry: 'Retry'
  },
  connections: {
    kicker: 'How we found each link',
    title: 'Every connection is labelled.',
    lead: "Some links are certain. Some are good guesses. Some we couldn't follow. {name} tells you which is which, in the line itself and in the words beside it.",
    lines: ['solid line', 'dashed line', 'dotted line'],
    rows: [
      ['Found in the code', "It's written right there, like a direct import. This is as sure as it gets."],
      ['Likely', 'Not written directly, but the pattern points to it \u2014 for example a file picked by a naming rule.'],
      ["Couldn't confirm", "We saw a link but couldn't tell where it goes. It's listed so you can check it yourself \u2014 never dropped."]
    ]
  },
  coverage: {
    kicker: 'Coverage',
    title: 'Nothing is skipped silently.',
    lead: "Every scan reports what it checked and what it didn't, so a clean result never hides a blind spot.",
    note: 'Illustrative numbers from the sample project.',
    statValue: '142 of 150',
    statLabel: 'files checked \u00b7 95%',
    barLabel: '142 of 150 files checked; 8 skipped',
    rows: [
      ["Files in a language we don't read yet ", '(Python, Go)', '6 files'],
      ["Links we couldn't follow ", '(computed at run time)', '2 links'],
      ['Files you asked us to ignore ', '(e.g. node_modules)', 'listed']
    ]
  },
  selfHost: {
    kicker: 'Self-host',
    title: 'Run it on your own computer or server.',
    lead: '{name} is local-first. Host it yourself and your code never leaves your network.',
    bullets: ['Runs with Docker Compose', 'You keep your data and your access rules', 'Source is on GitHub'],
    terminalLabel: 'Example start-up commands',
    terminalBadge: 'Illustrative',
    comments: ['# 1. get {name}', '# 2. start it', '# 3. open it']
  },
  closing: { title: 'Ready to see your project as a map?', lead: 'Try a sample in your browser first, or host it yourself.' },
  footer: { label: 'Footer', docs: 'Docs', selfHost: 'Self-host' },
  severity: { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'No issues' },
  linkKind: { extracted: 'Found in the code', inferred: 'Likely', unresolved: "Couldn't confirm", start: 'Entry point' }
}
