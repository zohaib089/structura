import type { WebLocale } from './locale'

export interface LandingCard {
  title: string
  body: string
}

export interface LandingMessages {
  badge: string
  headlineLead: string
  headlineProve: string
  headlineTail: string
  subtitle: string
  openViewer: string
  github: string
  starGithub: string
  commandSample: string
  imageAlt: string
  samplePill: string
  facts: {
    provenance: LandingCard
    coverage: LandingCard
    local: LandingCard
  }
  quickstart: {
    label: string
    copy: string
    copied: string
    copyFailed: string
    title: string
    intro: string
    openStep: string
  }
  honest: {
    title: string
    extracted: LandingCard
    inferred: LandingCard
    unresolved: LandingCard
    telemetry: LandingCard
    compareTitle: string
    compareClaim: string
    compareAnswer: string
    compareCaption: string
    compareRows: LandingCard[]
  }
  coverage: {
    title: string
    body: string
    sampleCaption: string
  }
  drift: {
    title: string
    body: string
    yamlCaption: string
    illustrative: string
  }
  how: {
    title: string
    steps: LandingCard[]
  }
  limits: {
    title: string
    items: string[]
  }
  footer: {
    product: string
    github: string
  }
}

const en: LandingMessages = {
  badge: 'Local-first · Open source',
  headlineLead: 'See your architecture.',
  headlineProve: 'Prove it',
  headlineTail: ' stays that way.',
  subtitle:
    '{name} scans your repository into a map you can explore. It runs on your machine. No account, no upload. TypeScript and JavaScript are read today. Python is coming soon.',
  openViewer: 'Open the sample map',
  github: 'View on GitHub',
  starGithub: 'Star on GitHub',
  commandSample: 'Sample',
  imageAlt: 'Aggregated architecture graph with extracted, inferred and unresolved edges',
  samplePill: 'Sample data',
  facts: {
    provenance: {
      title: 'EXTRACTED vs INFERRED',
      body: 'every edge says how it was found'
    },
    coverage: {
      title: 'Coverage report',
      body: 'skipped files are listed, never hidden'
    },
    local: {
      title: 'Local-first',
      body: 'runs on your machine, no upload'
    }
  },
  quickstart: {
    label: 'Run in your repository',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Press Ctrl/⌘ C',
    title: 'Quickstart',
    intro: 'Two steps. The only command today is scan.',
    openStep: 'Open {graphFile} in the viewer'
  },
  honest: {
    title: 'Every edge says how it was found',
    extracted: {
      title: 'EXTRACTED',
      body: 'Solid line. The relationship was read from the source.'
    },
    inferred: {
      title: 'INFERRED',
      body: 'Dashed line and a tilde. A heuristic, not a certainty.'
    },
    unresolved: {
      title: 'UNRESOLVED',
      body: 'Dotted line and a hollow end. The target was not found.'
    },
    telemetry: {
      title: 'No telemetry',
      body: 'The static viewer does not send the graph anywhere. Nothing is uploaded.'
    },
    compareTitle: 'What you can verify',
    compareClaim: 'Claim',
    compareAnswer: 'Answer',
    compareCaption: 'Sources reviewed on 2026-10-26.',
    compareRows: [
      { title: 'Where it runs', body: 'On your machine. Opening a graph does not upload it.' },
      { title: 'Account', body: 'Not required to read a graph. A hosted account is optional.' },
      { title: 'Languages', body: 'TypeScript and JavaScript today. Python is coming soon.' },
      { title: 'Edges', body: 'Each edge is marked EXTRACTED or INFERRED. Unresolved targets stay visible.' },
      { title: 'Coverage', body: 'Skipped files are listed, never hidden.' }
    ]
  },
  coverage: {
    title: 'Nothing is skipped silently',
    body: 'Unparsed files are listed with a reason. The counts below are the bundled sample, not a product statistic.',
    sampleCaption: '{parsed} parsed of {discovered} discovered in the sample'
  },
  drift: {
    title: 'Declare the architecture',
    body: 'A declared architecture file is illustrated below. Comparing it with the graph is not a command yet. This excerpt is illustrative.',
    yamlCaption: 'Illustrative {config}',
    illustrative: '# illustrative\nlayers: []\n'
  },
  how: {
    title: 'How it works',
    steps: [
      { title: 'Scan', body: 'Run the scan command in the repository you already have. The page does not upload it.' },
      { title: 'Read coverage', body: 'Parsed, partial, failed, and skipped files are listed. Skipped files stay in the report.' },
      { title: 'Open', body: 'Open the graph file in the static viewer and read each edge’s provenance.' }
    ]
  },
  limits: {
    title: 'Known limits',
    items: [
      'A scan reads TypeScript and JavaScript today. Python is coming soon.',
      'INFERRED edges are heuristics. An aggregate is never more certain than its weakest edge.',
      'The viewer starts with at most 300 nodes and will not draw more than 1000 at once. 150 nodes and 300 edges is a comfort budget, not the limit.',
      'A hosted account is optional. Reading a graph does not require one.'
    ]
  },
  footer: {
    product: 'Product',
    github: 'GitHub'
  }
}

/** English until the new landing copy is translated. Other locales are not claimed. */
export function landingMessages(_locale: WebLocale): LandingMessages {
  return en
}

export function fillLanding(template: string, values: Record<string, string>): string {
  return template.replace(/\{([A-Za-z0-9]+)\}/g, (match, key: string) => values[key] ?? match)
}
