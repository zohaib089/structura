/**
 * Deterministic synthetic-repo generator and scale benchmark for the scan engine.
 * Generate, scan, and Q&A run against a temp directory under os.tmpdir(), which is
 * removed afterwards. Import the exported functions from tests; run this file to
 * print a report:
 *
 *   node scripts/scale-benchmark.mjs --files 2000
 *   node scripts/scale-benchmark.mjs --files 2000 --files 5000
 */
import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { pathToFileURL } from 'node:url'
import os from 'node:os'

export const TS_FOLDER_NAMES = ['core', 'app', 'services', 'adapters', 'util', 'api', 'domain', 'infra']
export const PY_PACKAGE_NAMES = ['alpha', 'beta', 'gamma', 'delta']
export const DEFAULT_QA_QUESTIONS = [
  'What languages does this use?',
  'Where does the app start?',
  'What are the riskiest files?',
  'How healthy is the project?',
  'What are the worst folders?',
  'Where is code duplicated?',
  'Any circular imports?',
  'What breaks if I change src/core/shared.ts?',
  'What does src/index.ts do?'
]

const DUPLICATE_TS = [
  'export function copiedHelper(value: number): number {',
  '  const doubled = value * 2',
  '  const shifted = doubled + 17',
  '  const clamped = shifted < 0 ? 0 : shifted',
  '  const labelled = clamped + 1',
  '  return labelled',
  '}'
].join('\n')

const DUPLICATE_PY = [
  'def copied_helper(value: int) -> int:',
  '    doubled = value * 2',
  '    shifted = doubled + 17',
  '    clamped = 0 if shifted < 0 else shifted',
  '    labelled = clamped + 1',
  '    return labelled'
].join('\n')

/**
 * Plan a deterministic set of repo-relative source paths for `fileCount` files.
 * TypeScript is ~80%, Python ~20%, with reserved entry and shared files first.
 */
export function planSyntheticRepo(fileCount) {
  const count = Math.max(1, Math.floor(fileCount))
  const pythonCount = count < 5 ? (count >= 2 ? 1 : 0) : Math.max(2, Math.round(count * 0.2))
  const tsCount = count - pythonCount
  const tsFolders = TS_FOLDER_NAMES.slice(0, Math.min(TS_FOLDER_NAMES.length, Math.max(2, Math.ceil(tsCount / 10))))
  const pyPackages = PY_PACKAGE_NAMES.slice(0, Math.min(PY_PACKAGE_NAMES.length, Math.max(1, Math.ceil(pythonCount / 6))))

  const tsPaths = []
  const reservedTs = ['src/index.ts', 'src/app.ts', 'src/core/shared.ts']
  for (const path of reservedTs) {
    if (tsPaths.length < tsCount) tsPaths.push(path)
  }
  let tsIndex = 0
  while (tsPaths.length < tsCount) {
    const folder = tsFolders[tsIndex % tsFolders.length]
    const path = `src/${folder}/mod_${tsIndex}.ts`
    tsIndex += 1
    if (!tsPaths.includes(path)) tsPaths.push(path)
  }

  const pyPaths = []
  if (pythonCount > 0) pyPaths.push('main.py')
  for (const pkg of pyPackages) {
    if (pyPaths.length < pythonCount) pyPaths.push(`${pkg}/__init__.py`)
  }
  let pyIndex = 0
  while (pyPaths.length < pythonCount) {
    const pkg = pyPackages[pyIndex % pyPackages.length]
    const path = `${pkg}/mod_${pyIndex}.py`
    pyIndex += 1
    if (!pyPaths.includes(path)) pyPaths.push(path)
  }

  const largeEvery = Math.max(10, Math.round(count / 20))
  const duplicateEvery = Math.max(5, Math.round(count / 8))
  return {
    fileCount: count,
    tsCount,
    pythonCount,
    tsFolders,
    pyPackages,
    files: [
      ...tsPaths.map((path, index) => describeFile(path, 'typescript', index, tsPaths.length, largeEvery, duplicateEvery)),
      ...pyPaths.map((path, index) => describeFile(path, 'python', index, pyPaths.length, largeEvery, duplicateEvery))
    ]
  }
}

function describeFile(path, language, index, total, largeEvery, duplicateEvery) {
  const isEntry = path === 'src/index.ts' || path === 'src/app.ts' || path === 'main.py'
  const isShared = path === 'src/core/shared.ts'
  const isLarge = !isEntry && !isShared && index > 0 && index % largeEvery === 0
  const hasDuplicate = !isShared && (index % duplicateEvery === 0)
  return { path, language, index, total, isEntry, isShared, isLarge, hasDuplicate }
}

function tsImportSpec(fromPath, toPath) {
  const fromDir = dirname(fromPath).split('/')
  const toParts = toPath.replace(/\.tsx?$/, '').split('/')
  let i = 0
  while (i < fromDir.length && i < toParts.length - 1 && fromDir[i] === toParts[i]) i += 1
  const up = fromDir.length - i
  const rel = [...(up === 0 ? ['.'] : Array(up).fill('..')), ...toParts.slice(i)].join('/')
  return rel.startsWith('.') ? rel : `./${rel}`
}

function pyImport(fromPath, toPath) {
  const moduleParts = toPath.replace(/\.py$/, '').split('/')
  if (moduleParts[moduleParts.length - 1] === '__init__') moduleParts.pop()
  const fn = pyFnName(toPath)
  const mod = moduleParts.join('.')
  if (!mod) return null
  return `from ${mod} import ${fn}`
}

function tsNeighbors(plan, file) {
  const tsFiles = plan.files.filter(item => item.language === 'typescript')
  const shared = tsFiles.find(item => item.isShared)
  const imports = []
  if (shared && file.path !== shared.path) imports.push(shared.path)
  if (!file.isShared) {
    const next = tsFiles[(file.index + 1) % tsFiles.length]
    if (next && next.path !== file.path && next.path !== shared?.path) imports.push(next.path)
  }
  // Deliberate 2-cycle between the first two non-reserved modules.
  const cycle = tsFiles.filter(item => !item.isEntry && !item.isShared)
  if (cycle.length >= 2 && (file.path === cycle[0].path || file.path === cycle[1].path)) {
    const other = file.path === cycle[0].path ? cycle[1].path : cycle[0].path
    if (!imports.includes(other)) imports.push(other)
  }
  // 3-cycle across the next three modules, when present.
  if (cycle.length >= 5) {
    const triangle = [cycle[2], cycle[3], cycle[4]]
    const pos = triangle.findIndex(item => item.path === file.path)
    if (pos >= 0) {
      const other = triangle[(pos + 1) % 3].path
      if (!imports.includes(other)) imports.push(other)
    }
  }
  return [...new Set(imports)]
}

function pyNeighbors(plan, file) {
  const pyFiles = plan.files.filter(item => item.language === 'python' && !item.path.endsWith('/__init__.py') && item.path !== '__init__.py')
  const imports = []
  if (file.path.endsWith('__init__.py')) return imports
  const next = pyFiles[(file.index + 1) % pyFiles.length]
  if (next && next.path !== file.path) imports.push(next.path)
  const cycle = pyFiles.filter(item => !item.isEntry)
  if (cycle.length >= 2 && (file.path === cycle[0].path || file.path === cycle[1].path)) {
    const other = file.path === cycle[0].path ? cycle[1].path : cycle[0].path
    if (!imports.includes(other)) imports.push(other)
  }
  return [...new Set(imports)]
}

function tsBody(file, imports) {
  const lines = []
  lines.push(`/** ${file.isEntry ? 'Application entry module' : file.isShared ? 'Shared helpers imported across the project' : `Generated TypeScript module ${file.path}`}. */`)
  for (const spec of imports) {
    const name = importName(spec)
    lines.push(`import { ${name} } from '${tsImportSpec(file.path, spec)}'`)
  }
  lines.push('')
  if (file.isShared) {
    lines.push('/** Shared increment used by many modules. */')
    lines.push('export function shared(value: number): number {')
    lines.push('  return value + 1')
    lines.push('}')
    lines.push('')
  }
  const fn = importName(file.path)
  lines.push(`/** Public function for ${file.path}. */`)
  lines.push(`export function ${fn}(value: number): number {`)
  if (imports.length > 0) {
    lines.push(`  const next = ${importName(imports[0])}(value)`)
    lines.push('  return next + 1')
  } else {
    lines.push('  return value + 1')
  }
  lines.push('}')
  if (file.hasDuplicate) {
    lines.push('')
    lines.push(DUPLICATE_TS)
  }
  if (file.isLarge) {
    const fnCount = 180
    for (let i = 0; i < fnCount; i += 1) {
      lines.push('')
      lines.push(`/** Unique large-file helper ${i} in ${file.path}. */`)
      lines.push(`export function large_${file.index}_${i}(value: number): number {`)
      lines.push(`  const step = value + ${i}`)
      lines.push(`  return step * 2 + ${file.index}`)
      lines.push('}')
    }
  }
  return `${lines.join('\n')}\n`
}

function pyBody(file, imports) {
  const lines = []
  lines.push(`"""${file.isEntry ? 'Application entry module' : `Generated Python module ${file.path}`}."""`)
  for (const spec of imports) {
    const stmt = pyImport(file.path, spec)
    if (stmt) lines.push(stmt)
  }
  lines.push('')
  const fn = pyFnName(file.path)
  lines.push(`def ${fn}(value: int) -> int:`)
  lines.push(`    """Return a deterministic transform for ${file.path}."""`)
  lines.push('    return value + 1')
  if (file.hasDuplicate) {
    lines.push('')
    lines.push(DUPLICATE_PY)
  }
  if (file.isLarge) {
    for (let i = 0; i < 180; i += 1) {
      lines.push('')
      lines.push(`def large_${file.index}_${i}(value: int) -> int:`)
      lines.push(`    """Unique large-file helper ${i}."""`)
      lines.push(`    return value * 2 + ${i} + ${file.index}`)
    }
  }
  return `${lines.join('\n')}\n`
}

function importName(path) {
  const base = path.split('/').pop().replace(/\.(ts|js|py)$/, '').replace(/[^\w]/g, '_')
  const token = base === '__init__' ? path.split('/').at(-2) ?? 'init' : base
  const name = token.replace(/[^\w]/g, '_')
  return /^[A-Za-z_]/.test(name) ? name : `mod_${name}`
}

function pyFnName(path) {
  return importName(path)
}

function renderFile(plan, file) {
  if (file.language === 'typescript') return tsBody(file, tsNeighbors(plan, file))
  return pyBody(file, pyNeighbors(plan, file))
}

/** Write a deterministic TypeScript + Python repo into `root`. */
export async function generateSyntheticRepo(root, fileCount) {
  const plan = planSyntheticRepo(fileCount)
  const absRoot = resolve(root)
  await mkdir(absRoot, { recursive: true })
  for (const file of plan.files) {
    const abs = join(absRoot, file.path)
    await mkdir(dirname(abs), { recursive: true })
    await writeFile(abs, renderFile(plan, file), 'utf8')
  }
  return { root: absRoot, ...plan }
}

export function hostInfo() {
  const cpu = os.cpus()[0]
  return {
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpu: cpu?.model?.replace(/\s+/g, ' ').trim() ?? 'unknown',
    cpuCount: os.cpus().length,
    totalMemBytes: os.totalmem(),
    node: process.version
  }
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`
}

export function formatMs(ms) {
  if (ms < 1000) return `${ms.toFixed(1)} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)} s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = (ms - minutes * 60_000) / 1000
  return `${minutes}m ${seconds.toFixed(1)}s`
}

function startRssSampler(intervalMs = 50) {
  let peak = process.memoryUsage().rss
  const timer = setInterval(() => {
    const rss = process.memoryUsage().rss
    if (rss > peak) peak = rss
  }, intervalMs)
  timer.unref()
  return {
    peek() {
      const rss = process.memoryUsage().rss
      if (rss > peak) peak = rss
      return peak
    },
    stop() {
      clearInterval(timer)
      return this.peek()
    }
  }
}

async function importEngine() {
  const engineRoot = resolve(import.meta.dirname, '..')
  const dist = join(engineRoot, 'dist/index.js')
  const src = join(engineRoot, 'src/index.ts')
  const target = existsSync(dist) ? dist : src
  return import(pathToFileURL(target).href)
}

function summariseGraph(graph) {
  const files = graph.nodes?.filter(node => node.kind === 'file') ?? []
  const hotspots = graph.hotspots ?? []
  const quality = graph.quality
  const duplicates = graph.duplicates
  return {
    schemaVersion: graph.schemaVersion,
    files: graph.summary?.files ?? files.length,
    nodes: graph.summary?.nodes ?? graph.nodes?.length ?? 0,
    edges: graph.summary?.edges ?? graph.edges?.length ?? 0,
    languages: (graph.coverage?.byLanguage ?? [])
      .filter(row => row.language && (row.parsed + row.partial) > 0)
      .map(row => ({ language: row.language, parsed: row.parsed, partial: row.partial })),
    hotspots: {
      count: hotspots.length,
      top: hotspots.slice(0, 5).map(item => ({ path: item.path, score: item.score }))
    },
    quality: quality
      ? {
          score: quality.project.score,
          grade: quality.project.grade,
          folders: quality.folders?.length ?? 0,
          worstFolder: quality.folders?.[0] ? { path: quality.folders[0].path, score: quality.folders[0].score, grade: quality.folders[0].grade } : null
        }
      : null,
    duplicates: duplicates
      ? {
          groups: duplicates.summary.groups,
          listed: duplicates.groups.length,
          duplicatedLines: duplicates.summary.duplicatedLines,
          percentage: duplicates.summary.percentage
        }
      : null
  }
}

/**
 * Generate a synthetic repo, run a full engine scan, answer a fixed question set,
 * then delete the temp directory (unless `keepTemp` is set).
 */
export async function runScaleBenchmark(options) {
  const fileCount = options.fileCount
  const questions = options.questions ?? DEFAULT_QA_QUESTIONS
  const keepTemp = Boolean(options.keepTemp)
  const prefix = options.tempPrefix ?? 'scale-bench-'
  const baseTmp = options.tempDir ?? tmpdir()
  const tempDir = await mkdtemp(join(baseTmp, prefix))
  const repoRoot = join(tempDir, 'repo')
  const outDir = join(tempDir, 'out')
  const sampler = startRssSampler(options.rssIntervalMs ?? 50)
  let cleaned = false
  try {
    const engine = await importEngine()
    const generateStarted = performance.now()
    const generated = await generateSyntheticRepo(repoRoot, fileCount)
    const generateMs = performance.now() - generateStarted

    const scanStarted = performance.now()
    const scan = await engine.scanRepository(repoRoot, {
      outDir,
      noCache: true,
      metaPath: null,
      docSummaries: true
    })
    const scanMs = performance.now() - scanStarted

    const qa = []
    const qaStarted = performance.now()
    for (const question of questions) {
      const started = performance.now()
      const result = engine.answerGraphQuestion(scan.graph, question)
      qa.push({
        question,
        intent: result.intent,
        ms: performance.now() - started,
        citations: result.citations.length,
        suggestions: result.suggestions.length
      })
    }
    const qaMs = performance.now() - qaStarted
    const peakRssBytes = sampler.stop()
    const graphJsonBytes = Buffer.byteLength(scan.graphJson, 'utf8')

    const report = {
      fileCount,
      generatedFiles: generated.files.length,
      tsCount: generated.tsCount,
      pythonCount: generated.pythonCount,
      generateMs,
      scanMs,
      scanElapsedMs: scan.elapsedMs,
      qaMs,
      qaCount: qa.length,
      qa,
      peakRssBytes,
      graphJsonBytes,
      graphPath: scan.graphPath,
      tempDir,
      cleaned: false,
      host: hostInfo(),
      graph: summariseGraph(scan.graph),
      coverage: scan.graph.coverage?.files ?? null
    }

    if (!keepTemp) {
      await rm(tempDir, { recursive: true, force: true })
      cleaned = true
      report.cleaned = true
    }
    return report
  } catch (error) {
    sampler.stop()
    if (!keepTemp && !cleaned) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
    throw error
  }
}

export function formatBenchmarkReport(report) {
  const lines = []
  lines.push(`Scale benchmark — ${report.fileCount} source files`)
  lines.push(`Host: ${report.host.cpu} (${report.host.cpuCount} CPUs), ${formatBytes(report.host.totalMemBytes)} RAM, ${report.host.platform} ${report.host.release} ${report.host.arch}, Node ${report.host.node}`)
  lines.push(`Generated ${report.generatedFiles} files (${report.tsCount} TypeScript, ${report.pythonCount} Python) in ${formatMs(report.generateMs)}`)
  lines.push(`Scan wall time: ${formatMs(report.scanMs)} (engine elapsedMs ${formatMs(report.scanElapsedMs)})`)
  lines.push(`Peak RSS: ${formatBytes(report.peakRssBytes)}`)
  lines.push(`graph.json: ${formatBytes(report.graphJsonBytes)} (${report.graphJsonBytes} bytes)`)
  lines.push(`Graph: schema ${report.graph.schemaVersion}, ${report.graph.files} files, ${report.graph.nodes} nodes, ${report.graph.edges} edges`)
  if (report.coverage) {
    const c = report.coverage
    lines.push(`Coverage: discovered ${c.discovered}, parsed ${c.parsed}, partial ${c.partial}, failed ${c.failed}, skipped ${c.skipped}`)
  }
  if (report.graph.languages.length > 0) {
    lines.push(`Languages: ${report.graph.languages.map(row => `${row.language} ${row.parsed} parsed`).join(', ')}`)
  }
  const hs = report.graph.hotspots
  lines.push(`Hotspots: ${hs.count} listed${hs.top[0] ? `; top ${hs.top.map(item => `${item.path} (${item.score})`).join(', ')}` : ''}`)
  if (report.graph.quality) {
    const q = report.graph.quality
    lines.push(`Quality: project ${q.score} (grade ${q.grade}), ${q.folders} folder scores${q.worstFolder ? `; worst ${q.worstFolder.path} ${q.worstFolder.score} (${q.worstFolder.grade})` : ''}`)
  } else {
    lines.push('Quality: (omitted)')
  }
  if (report.graph.duplicates) {
    const d = report.graph.duplicates
    lines.push(`Duplicates: ${d.groups} groups, ${d.duplicatedLines} duplicated lines (${d.percentage}%), ${d.listed} listed`)
  } else {
    lines.push('Duplicates: (omitted)')
  }
  lines.push(`Q&A: ${report.qaCount} questions in ${formatMs(report.qaMs)} (avg ${formatMs(report.qaMs / Math.max(1, report.qaCount))})`)
  for (const item of report.qa) {
    lines.push(`  - ${item.intent.padEnd(12)} ${formatMs(item.ms).padStart(8)}  ${item.question}`)
  }
  return lines.join('\n')
}

function parseFileCounts(argv) {
  const counts = []
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--files' || arg === '-n') {
      const raw = argv[i + 1]
      i += 1
      if (raw) for (const part of raw.split(',')) counts.push(Number(part))
      continue
    }
    if (arg.startsWith('--files=')) {
      for (const part of arg.slice('--files='.length).split(',')) counts.push(Number(part))
    }
  }
  return counts.filter(n => Number.isFinite(n) && n > 0)
}

export async function runScaleBenchmarkCli(argv = process.argv.slice(2)) {
  const counts = parseFileCounts(argv)
  if (counts.length === 0) {
    console.error('Usage: node scripts/scale-benchmark.mjs --files 2000 [--files 5000]')
    process.exitCode = 2
    return
  }
  for (const fileCount of counts) {
    const report = await runScaleBenchmark({ fileCount })
    console.log(formatBenchmarkReport(report))
    console.log('')
  }
}

const invoked = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url
if (invoked) {
  runScaleBenchmarkCli().catch(error => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error))
    process.exitCode = 1
  })
}
