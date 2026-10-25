import {
  ANALYSIS_CONTRACT_VERSION,
  parseAnalysisInventoryResult,
  type AnalysisInventoryResult,
  type InventoryFileKind
} from './analysis-contracts.js'

export interface InventoryFileMetadata {
  path: string
  sizeBytes: number
}

export interface InventoryBuildInput {
  analysisId: string
  snapshotId: string
  files: readonly InventoryFileMetadata[]
  completedAt: string
}

const languageByExtension: Readonly<Record<string, string>> = {
  '.c': 'c',
  '.cc': 'cpp',
  '.cpp': 'cpp',
  '.cs': 'csharp',
  '.cxx': 'cpp',
  '.cts': 'typescript',
  '.go': 'go',
  '.h': 'c',
  '.hpp': 'cpp',
  '.java': 'java',
  '.cjs': 'javascript',
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.mts': 'typescript',
  '.jsx': 'javascript',
  '.php': 'php',
  '.py': 'python',
  '.rb': 'ruby',
  '.rs': 'rust',
  '.ts': 'typescript',
  '.tsx': 'typescript'
}

const manifestNames = new Set([
  'cargo.lock',
  'cargo.toml',
  'composer.json',
  'composer.lock',
  'go.mod',
  'go.sum',
  'package-lock.json',
  'package.json',
  'pnpm-lock.yaml',
  'pom.xml',
  'requirements.txt',
  'gemfile',
  'Gemfile.lock',
  'yarn.lock'
])

const configurationExtensions = new Set([
  '.conf',
  '.ini',
  '.json',
  '.properties',
  '.toml',
  '.xml',
  '.yaml',
  '.yml'
])

const documentationExtensions = new Set(['.md', '.mdx', '.rst', '.txt'])

function extensionOf(fileName: string): string {
  const index = fileName.lastIndexOf('.')
  return index > 0 ? fileName.slice(index).toLowerCase() : ''
}

function fileKind(path: string, fileName: string, extension: string): InventoryFileKind {
  const segments = path.toLowerCase().split('/')
  const lowerName = fileName.toLowerCase()

  if (segments.some(segment => ['test', 'tests', '__tests__', 'spec', 'specs'].includes(segment)) ||
      /\.(test|spec)\.[^.]+$/i.test(fileName)) return 'test'
  if (segments.includes('.github') || segments.includes('.gitlab') ||
      lowerName === '.gitlab-ci.yml' || lowerName === 'jenkinsfile' ||
      lowerName === 'azure-pipelines.yml' || lowerName === 'bitbucket-pipelines.yml') return 'ci'
  if (lowerName === 'dockerfile' || lowerName.startsWith('dockerfile.') ||
      lowerName === 'docker-compose.yml' || lowerName === 'compose.yaml' ||
      lowerName === 'compose.yml') return 'container'
  if (manifestNames.has(lowerName)) return 'manifest'
  if (documentationExtensions.has(extension) || segments.includes('docs') || segments.includes('documentation')) {
    return 'documentation'
  }
  if (configurationExtensions.has(extension) || lowerName.startsWith('.env.example')) return 'configuration'
  return languageByExtension[extension] ? 'source' : 'other'
}

function languageId(path: string, extension: string): string | null {
  const lowerPath = path.toLowerCase()
  if (lowerPath.endsWith('.d.ts')) return 'typescript'
  return languageByExtension[extension] ?? null
}

export function buildAnalysisInventory(input: InventoryBuildInput): AnalysisInventoryResult {
  const files = [...input.files]
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0)
    .map(file => {
      const fileName = file.path.slice(file.path.lastIndexOf('/') + 1)
      const extension = extensionOf(fileName)
      return {
        path: file.path,
        sizeBytes: file.sizeBytes,
        kind: fileKind(file.path, fileName, extension),
        languageId: languageId(file.path, extension)
      }
    })

  return parseAnalysisInventoryResult({
    contractVersion: ANALYSIS_CONTRACT_VERSION,
    analysisId: input.analysisId,
    snapshotId: input.snapshotId,
    fileCount: files.length,
    totalBytes: files.reduce((total, file) => total + file.sizeBytes, 0),
    unsupportedFileCount: files.filter(file => file.languageId === null).length,
    files,
    completedAt: input.completedAt
  })
}
