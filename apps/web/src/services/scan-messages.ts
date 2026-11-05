import type { WebLocale } from './locale'
import type { Scan, ScanStatus } from '../api/scans'
import type { ScanStepperPhase } from './scan-step-display'
import { formatArchiveLimitLabel } from './scan-step-display'
import { DEFAULT_UPLOAD_ARCHIVE_MAX_BYTES } from './upload-archive'

export interface ScanMessages {
  hubEyebrow: string
  hubTitle: string
  hubDescription: string
  openProjectTitle: string
  openProjectHint: string
  sourceFolder: string
  sourceZip: string
  sourceGit: string
  folderDropTitle: string
  zipDropTitle: string
  browseLabel: string
  folderHint: string
  zipHint: (maxLabel: string) => string
  gitUrlLabel: string
  gitUrlHint: string
  invalidGitUrl: string
  branchLabel: string
  branchOptional: string
  startScan: string
  scanning: string
  uploadProgress: string
  zipUploadTooLarge: (actualLabel: string, maxLabel: string) => string
  invalidZipUpload: string
  scanListTitle: string
  scanListEmpty: string
  loadScansError: string
  refreshScans: string
  scanStatus: (status: ScanStatus) => string
  scanSourceLabel: (scan: Scan) => string
  scanFailed: string
  scanStepPrepare: string
  scanStepUpload: string
  scanStepQueued: string
  scanStepQueuedTitle: string
  scanStepAnalysing: string
  scanStepBuilding: string
  scanStepStatusLines: () => Record<ScanStepperPhase, string>
  scanStepSucceeded: string
  scanStepFailed: string
  scanStepCancelled: string
  scanCancel: string
  scanCancelling: string
  scanStepLabels: () => Record<ScanStepperPhase, string>
  scanStepTerminalLabels: () => Record<'succeeded' | 'failed' | 'cancelled', string>
  scanCompleteToast: string
  viewReportAction: string
  progressHeading: string
  selectScan: string
  recentScansTitle: string
  viewAllScans: string
  noScanSelected: string
  loadingScanGraph: string
  loadScanGraphError: string
  archiveLimitLabel: string
}

const en: ScanMessages = {
  hubEyebrow: 'Source analysis',
  hubTitle: 'Open a project',
  hubDescription:
    'Scan a local folder, a .zip archive, or a GitHub or GitLab repository. Results stay in this workspace until the backend retention policy applies.',
  openProjectTitle: 'Open project',
  openProjectHint:
    'Choose a folder, upload a .zip, or paste a Git link. Atlasmith scans it locally first, then builds a report.',
  sourceFolder: 'Folder',
  sourceZip: 'Zip',
  sourceGit: 'Git URL',
  folderDropTitle: 'Drop a folder',
  zipDropTitle: 'Drop a .zip',
  browseLabel: 'Browse',
  folderHint: 'Local-first scan · build folders like node_modules and .git are skipped',
  zipHint(maxLabel) {
    return `Max archive size ${maxLabel} · local-first scan`
  },
  gitUrlLabel: 'Repository URL',
  gitUrlHint: 'GitHub or GitLab HTTPS link',
  invalidGitUrl:
    'Enter a GitHub or GitLab repository URL, for example https://github.com/org/repo',
  branchLabel: 'Branch',
  branchOptional: '(optional)',
  startScan: 'Start scan',
  scanning: 'Scan in progress…',
  uploadProgress: 'Preparing upload…',
  zipUploadTooLarge(actualLabel, maxLabel) {
    return `This .zip is ${actualLabel}, which is over the ${maxLabel} limit.`
  },
  invalidZipUpload: 'Choose a single .zip archive.',
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
  scanStepPrepare: 'Prepare',
  scanStepUpload: 'Upload',
  scanStepQueued: 'Your scan is in line — usually under a minute.',
  scanStepQueuedTitle: 'Queued',
  scanStepAnalysing: 'Analysing',
  scanStepBuilding: 'Building report',
  scanStepSucceeded: 'Scan complete',
  scanStepFailed: 'Scan failed',
  scanStepCancelled: 'Scan cancelled',
  scanCancel: 'Cancel',
  scanCancelling: 'Cancelling…',
  scanCompleteToast: 'Scan complete',
  viewReportAction: 'View report',
  progressHeading: 'Scan progress',
  archiveLimitLabel: formatArchiveLimitLabel(DEFAULT_UPLOAD_ARCHIVE_MAX_BYTES),
  scanStepLabels() {
    return {
      prepare: this.scanStepPrepare,
      upload: this.scanStepUpload,
      queued: this.scanStepQueuedTitle,
      analysing: this.scanStepAnalysing,
      building: this.scanStepBuilding
    }
  },
  scanStepStatusLines() {
    return {
      prepare: 'Checking your files…',
      upload: 'Sending the archive…',
      queued: this.scanStepQueued,
      analysing: 'Running the analysers…',
      building: 'Putting findings together…'
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
