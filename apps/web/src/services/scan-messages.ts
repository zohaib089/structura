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
  chooseZip: string
  invalidZipUpload: string
  zipUploadTooLarge: string
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
  scanStepFetching: string
  scanStepScanning: string
  scanStepAnalysing: string
  scanStepSaving: string
  scanStepQueued: string
  scanStepQueuedTitle: string
  scanStepStatusLines: () => Record<'queued' | 'fetching' | 'scanning' | 'analysing' | 'saving', string>
  scanStepSucceeded: string
  scanStepFailed: string
  scanStepCancelled: string
  scanCancel: string
  scanCancelling: string
  scanStepLabels: () => Record<'queued' | 'fetching' | 'scanning' | 'analysing' | 'saving', string>
  scanStepTerminalLabels: () => Record<'succeeded' | 'failed' | 'cancelled', string>
  selectScan: string
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
  chooseZip: 'Upload .zip',
  invalidZipUpload: 'Choose a single .zip archive.',
  zipUploadTooLarge: 'This .zip exceeds the 200 MB upload limit.',
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
      failed: 'Failed',
      cancelled: 'Cancelled'
    })[status]
  },
  scanSourceLabel(scan) {
    if (scan.source === 'upload') return 'Folder upload'
    const branch = scan.branch ? `@${scan.branch}` : ''
    return `${scan.url ?? 'Git remote'}${branch}`
  },
  scanFailed: 'Scan failed',
  scanStepFetching: 'Preparing files',
  scanStepScanning: 'Reading files',
  scanStepAnalysing: 'Analysing code',
  scanStepSaving: 'Building report',
  scanStepQueued: 'Your scan is in line — usually under a minute.',
  scanStepQueuedTitle: 'Waiting to start',
  scanStepSucceeded: 'Scan complete',
  scanStepFailed: 'Scan failed',
  scanStepCancelled: 'Scan cancelled',
  scanCancel: 'Cancel scan',
  scanCancelling: 'Cancelling…',
  scanStepLabels() {
    return {
      queued: this.scanStepQueuedTitle,
      fetching: this.scanStepFetching,
      scanning: this.scanStepScanning,
      analysing: this.scanStepAnalysing,
      saving: this.scanStepSaving
    }
  },
  scanStepStatusLines() {
    return {
      queued: this.scanStepQueued,
      fetching: 'Getting your project ready…',
      scanning: 'Checking your files…',
      analysing: 'Running the analysers…',
      saving: 'Putting findings together…'
    }
  },
  scanStepTerminalLabels() {
    return {
      succeeded: this.scanStepSucceeded,
      failed: this.scanStepFailed,
      cancelled: this.scanStepCancelled
    }
  },
  selectScan: 'View insights',
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
