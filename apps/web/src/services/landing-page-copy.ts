import { BRAND } from '../../../../packages/brand/src/brand'
import type { SampleLinkKind, SampleSeverity } from './landing-sample-graph'

/**
 * Copy for the advanced landing page (design: landing-advanced.md §3-4).
 * English only for now, like the other new landing labels; the product name always comes from BRAND.
 * Plain words: "ring-shaped map", "files", "links". EXTRACTED / INFERRED / UNRESOLVED stay as small tags only.
 */
const name = BRAND.name

export const landingPageCopy = {
  documentTitle: `${name} \u2014 See how your code fits together, and what's risky`,
  metaDescription: `${name} maps a project on your machine into a ring-shaped map around its real entry points. No account. Nothing uploaded to view a graph.`,
  skipLink: 'Skip to content',
  homeLabel: `${name} home`,
  nav: {
    label: 'Primary',
    product: 'Product',
    how: 'How it works',
    docs: 'Docs',
    github: 'GitHub',
    githubLabel: `${name} on GitHub`
  },
  cta: {
    viewer: 'Try the viewer',
    selfHost: 'Self-host',
    github: 'GitHub',
    scan: 'Scan a project',
    projects: 'Go to your projects',
    selfHostGuide: 'Self-host guide'
  },
  hero: {
    eyebrow: `${name} \u00b7 local-first`,
    titleLead: 'See how your code fits together \u2014 ',
    titleEmphasis: "and what's risky.",
    leadBefore: `${name} turns a project on your machine into a `,
    leadMap: 'ring-shaped map',
    leadMiddle: ' around its real starting points. ',
    leadNoAccount: 'No account. Nothing uploaded',
    leadAfter: ' to view a graph.',
    scanPrompt: 'Have a project ready? ',
    graphTitle: 'Sample map of a project, drawn as rings around its entry file',
    legendLabel: 'How to read the lines',
    legend: { extracted: 'Found in the code', inferred: 'Likely', unresolved: "Couldn't confirm" },
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
  ringLabels: { 1: '1 step', 2: '2 steps', 3: '3 steps' } as Record<1 | 2 | 3, string>,
  proof: {
    label: 'At a glance',
    items: [
      { icon: 'monitor', title: 'Runs on your machine', body: 'Your code stays where it is.' },
      { icon: 'user', title: 'No account to view', body: 'Open a graph file and look around.' },
      { icon: 'code', title: 'TypeScript & JavaScript today', body: 'Other languages are listed as skipped, not hidden.' },
      { icon: 'tag', title: 'Every link says how it was found', body: "Found in code, likely, or couldn't confirm." }
    ]
  },
  how: {
    kicker: 'How it works',
    title: 'Three steps from folder to map.',
    lead: `Point ${name} at a project, let it read the files, then explore the result. You can follow progress as it goes.`,
    step: 'STEP',
    steps: [
      {
        title: 'Pick a project',
        body: `A folder, a zip file, or a Git link. ${name} checks it first and tells you if anything is too big.`
      },
      {
        title: `${name} reads it`,
        body: 'It follows every import, notes how sure it is about each link, and looks for risky spots along the way.'
      },
      {
        title: 'Read the map and the report',
        body: 'Start at the entry file and walk outward. The report lists what to look at first, in plain words.'
      }
    ],
    sources: ['Folder', 'Zip', 'Git link'],
    checking: { before: 'Checking ', files: '1,240 files', middle: '\u2026 skipping ', skipped: 'node_modules' },
    loaderLabel: 'Analysing code',
    initialStatus: 'Running analyser (3 of 7)',
    initialProgress: 43,
    runScan: 'Run a sample scan',
    previewToasts: 'Preview notifications',
    phases: [
      { title: 'Preparing files', status: 'Checking 1,240 files\u2026', progress: 12 },
      { title: 'Analysing code', status: 'Running analyser (3 of 7)', progress: 48 },
      { title: 'Analysing code', status: 'Running analyser (7 of 7)', progress: 80 },
      { title: 'Building report', status: 'Putting findings together\u2026', progress: 94 }
    ],
    finished: { title: 'Scan finished', status: '142 of 150 files checked', progress: 100 },
    findingsLabel: 'Example findings',
    findings: [
      { severity: 'critical' as SampleSeverity, text: 'Circular link between two core files' },
      { severity: 'high' as SampleSeverity, text: 'Page reaches straight into the database layer' },
      { severity: 'medium' as SampleSeverity, text: 'File with many incoming links' }
    ]
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
    lead: `Some links are certain. Some are good guesses. Some we couldn't follow. ${name} tells you which is which, in the line itself and in the words beside it.`,
    rows: [
      {
        kind: 'extracted' as SampleLinkKind,
        title: 'Found in the code',
        tag: 'EXTRACTED \u00b7 solid line',
        body: "It's written right there, like a direct import. This is as sure as it gets.",
        commentLine: '// router.ts',
        codeLine: "import { auth } from './auth'"
      },
      {
        kind: 'inferred' as SampleLinkKind,
        title: 'Likely',
        tag: 'INFERRED \u00b7 dashed line',
        body: 'Not written directly, but the pattern points to it \u2014 for example a file picked by a naming rule.',
        commentLine: '// api.ts',
        codeLine: 'const page = await import(`./pages/${name}`)'
      },
      {
        kind: 'unresolved' as SampleLinkKind,
        title: "Couldn't confirm",
        tag: 'UNRESOLVED \u00b7 dotted line',
        body: "We saw a link but couldn't tell where it goes. It's listed so you can check it yourself \u2014 never dropped.",
        commentLine: '// plugins.ts',
        codeLine: 'require(process.env.PLUGIN_PATH)'
      }
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
    checkedPercent: 94.7,
    rows: [
      { icon: 'alert', text: "Files in a language we don't read yet ", why: '(Python, Go)', count: '6 files' },
      { icon: 'alert', text: "Links we couldn't follow ", why: '(computed at run time)', count: '2 links' },
      { icon: 'check', text: 'Files you asked us to ignore ', why: '(e.g. node_modules)', count: 'listed' }
    ]
  },
  selfHost: {
    kicker: 'Self-host',
    title: 'Run it on your own computer or server.',
    lead: `${name} is local-first. Host it yourself and your code never leaves your network.`,
    bullets: [
      'Runs with Docker Compose',
      'You keep your data and your access rules',
      'Source is on GitHub'
    ],
    terminalLabel: 'Example start-up commands',
    terminalBadge: 'Illustrative',
    terminalTitle: 'terminal',
    /** Commands follow the repository README (Docker Compose). Shown as Illustrative until the self-host guide is published. */
    terminalLines: [
      { comment: `# 1. get ${name}`, command: 'git clone <atlasmith-repo-url>' },
      { comment: '# 2. start it', command: 'docker compose up --build' },
      { comment: '# 3. open it', command: 'http://localhost:5173' }
    ]
  },
  closing: {
    title: 'Ready to see your project as a map?',
    lead: 'Try a sample in your browser first, or host it yourself.'
  },
  footer: {
    label: 'Footer',
    github: 'GitHub',
    docs: 'Docs',
    selfHost: 'Self-host'
  },
  severity: {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    info: 'No issues'
  } as Record<SampleSeverity, string>,
  linkKind: {
    extracted: 'Found in the code',
    inferred: 'Likely',
    unresolved: "Couldn't confirm",
    start: 'Entry point'
  } as Record<SampleLinkKind, string>
}

export function stepsAway(ring: number): string {
  return `${ring} step${ring > 1 ? 's' : ''}`
}
