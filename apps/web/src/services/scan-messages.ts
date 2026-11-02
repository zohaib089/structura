import type { WebLocale } from './locale'
import type { Scan, ScanStatus } from '../api/scans'

export interface ScanMessages {
  hubEyebrow: string
  hubTitle: string
  hubDescription: string
  openProjectTitle: string
  sourceLocal: string
  sourceGithub: string
  sourceGitlab: string
  localHint: string
  chooseFolder: string
  githubUrlLabel: string
  gitlabUrlLabel: string
  branchLabel: string
  branchOptional: string
  startScan: string
  scanning: string
  uploadProgress: string
  invalidGithubUrl: string
  invalidGitlabUrl: string
  scanListTitle: string
  scanListEmpty: string
  loadScansError: string
  refreshScans: string
  scanStatus: (status: ScanStatus) => string
  scanSourceLabel: (scan: Scan) => string
  scanFailed: string
  selectScan: string
  openInViewer: string
  recentScansTitle: string
  viewAllScans: string
  noScanSelected: string
  loadingScanGraph: string
  loadScanGraphError: string
}

const en: ScanMessages = {
  hubEyebrow: 'Source analysis',
  hubTitle: 'Open a project',
  hubDescription:
    'Scan a local folder, GitHub repository, or GitLab repository. Results stay in this workspace until the backend retention policy applies.',
  openProjectTitle: 'Start a new scan',
  sourceLocal: 'Local folder',
  sourceGithub: 'GitHub',
  sourceGitlab: 'GitLab',
  localHint: 'We zip selected files in your browser and skip node_modules, .git, dist, and similar build output.',
  chooseFolder: 'Choose folder',
  githubUrlLabel: 'GitHub repository URL',
  gitlabUrlLabel: 'GitLab repository URL',
  branchLabel: 'Branch',
  branchOptional: '(optional)',
  startScan: 'Start scan',
  scanning: 'Scan in progress…',
  uploadProgress: 'Preparing upload…',
  invalidGithubUrl: 'Enter a valid https://github.com/owner/repo URL.',
  invalidGitlabUrl: 'Enter a valid https://gitlab.com/owner/repo URL.',
  scanListTitle: 'Recent scans',
  scanListEmpty: 'No scans yet. Start one above.',
  loadScansError: 'Unable to load scans for this workspace.',
  refreshScans: 'Refresh',
  scanStatus(status) {
    return ({
      queued: 'Queued',
      running: 'Running',
      succeeded: 'Succeeded',
      failed: 'Failed'
    })[status]
  },
  scanSourceLabel(scan) {
    if (scan.source === 'upload') return 'Folder upload'
    const branch = scan.branch ? `@${scan.branch}` : ''
    return `${scan.url ?? 'Git remote'}${branch}`
  },
  scanFailed: 'Scan failed',
  selectScan: 'View insights',
  openInViewer: 'Open in viewer',
  recentScansTitle: 'Recent scans',
  viewAllScans: 'Open architecture',
  noScanSelected: 'Select a finished scan to review graph insights.',
  loadingScanGraph: 'Loading scan graph…',
  loadScanGraphError: 'Unable to load graph for this scan.'
}

export function scanMessages(locale: WebLocale): ScanMessages {
  void locale
  return en
}
