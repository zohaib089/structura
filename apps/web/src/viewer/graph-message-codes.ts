/**
 * Render graph.json 1.7.0 `code` + `params` into locale text.
 * Falls back to the engine's English string when the code is missing or unknown.
 */
import type { QualityBreakdownMessages } from './quality-breakdown-label'
import type { DuplicateDescriptionMessages } from './duplicates'
import type { DuplicateGroup, GraphHotspot, MessageParams, QualityBreakdownItem, QualityScore, QualityTip } from './graph-types'

export interface GraphMessageCodeMessages extends QualityBreakdownMessages, DuplicateDescriptionMessages {
  qualityTipForbiddenImport: (file: string) => string
  qualityTipUndeclaredImport: (file: string) => string
  qualityTipCycle: (label: string) => string
  qualityTipCycleTheseFiles: string
  qualityTipCycleBetween: (a: string, b: string) => string
  qualityTipCycleAmong: (list: string) => string
  qualityTipLargeFile: (path: string, lines: number) => string
  qualityTipLargeFunction: (name: string, path: string, lines: number) => string
  qualityTipUnresolvedImports: string
  qualityTipHotspotFile: (path: string, score: number) => string
  qualityTipArchitecture: string
  qualityTipCycles: string
  qualityTipHotspots: string
  qualityTipImports: string
  qualityTipSize: string
  qualityTipGainSuffix: (gain: number) => string
  hotspotWhyNone: string
  hotspotWhyFanIn: (count: number) => string
  hotspotWhyFanOut: (count: number) => string
  hotspotWhyImpact: (count: number) => string
  hotspotWhyFindings: (count: number) => string
  hotspotWhyFunctions: (count: number) => string
  hotspotWhyLines: (count: number) => string
  askSuggestionImpact: (file: string) => string
  askSuggestionExplain: (file: string) => string
  askSuggestionHotspots: string
  askSuggestionQuality: string
  askSuggestionWorstFolders: string
  askSuggestionDuplicates: string
  askSuggestionCycles: string
  askSuggestionArchitecture: string
  askSuggestionLanguages: string
  askSuggestionEntry: string
  qaQuote: (text: string) => string
  qaAndMore: (count: number) => string
  qaDepth: (path: string, depth: number) => string
  qaUnknownLanguage: string
  qaResolveMissing: (ref: string) => string
  qaResolveAmbiguous: (ref: string, listed: string, extra: string) => string
  qaImpactNeedTarget: string
  qaImpactNoFiles: (target: string) => string
  qaImpactNoneFile: (target: string) => string
  qaImpactNoneFolder: (path: string, fileCount: number) => string
  qaImpactDependentsFile: (target: string, dependentCount: number, listed: string, extra: string) => string
  qaImpactDependentsFolder: (path: string, fileCount: number, dependentCount: number, listed: string, extra: string) => string
  qaImpactDependentsExtra: (count: number) => string
  qaExplainNeedTarget: string
  qaExplainFileLead: (path: string, language: string, lineCount: number | null) => string
  qaExplainFileHotspot: (score: number) => string
  qaExplainFileDeclares: (listed: string, extra: string) => string
  qaExplainFileNoImports: string
  qaExplainFileImports: (listed: string, extra: string) => string
  qaExplainFileNoImporters: string
  qaExplainFileImporters: (listed: string, extra: string) => string
  qaExplainFileFindings: (listed: string) => string
  qaExplainFileEntry: (listed: string) => string
  qaExplainExportedKind: (kind: string, name: string) => string
  qaExplainKind: (kind: string, name: string) => string
  qaExplainFolderEmpty: (path: string) => string
  qaExplainFolderLead: (path: string, fileCount: number, languages: string | null) => string
  qaExplainFolderScore: (score: number, grade: string) => string
  qaExplainFolderTip: (tip: string, gain: number) => string
  qaExplainFolderFiles: (listed: string, extra: string) => string
  qaExplainSymbol: (name: string, kind: string, path: string, startLine: number, endLine: number) => string
  qaExplainSymbolExported: string
  qaHotspotsNone: string
  qaHotspotsIntro: string
  qaHotspotsItem: (index: number, path: string, score: number, why: string | null) => string
  qaHotspotsExtra: (count: number) => string
  qaQualityNone: string
  qaQualityProjectLead: string
  qaQualityFolderLead: (path: string) => string
  qaQualityScoreLine: (lead: string, score: number, grade: string) => string
  qaQualityNoPenalties: string
  qaQualityPenalties: (listed: string) => string
  qaQualityRaise: (listed: string) => string
  qaQualityWorstFolders: (listed: string) => string
  qaQualityFolderMissing: (path: string, projectScore: number, projectGrade: string) => string
  qaQualityTipItem: (text: string, gain: number) => string
  qaQualityPenaltyItem: (label: string, penalty: number) => string
  qaDuplicatesNone: string
  qaDuplicatesHead: (groups: number, duplicatedLines: number, percentage: number) => string
  qaDuplicatesItem: (index: number, description: string) => string
  qaDuplicatesExtra: (count: number) => string
  qaArchitectureNoCycles: string
  qaArchitectureCycles: (count: number) => string
  qaArchitectureNoConfig: string
  qaArchitectureNoFindings: string
  qaArchitectureFindings: (count: number) => string
  qaOverviewFiles: (count: number) => string
  qaOverviewLanguages: (listed: string) => string
  qaOverviewFolders: (listed: string, extra: string) => string
  qaOverviewEntries: (listed: string, extra: string) => string
  qaOverviewNoEntries: string
  qaFallbackEmpty: string
  qaFallbackUnknown: string
  qaFallbackExamples: (listed: string) => string
  qaEntryConventionalName: string
  qaEntryPackageBin: string
  qaEntryPackageMain: string
  qaEntryPackageExports: string
  qaEntryPackageScript: string
  qaEntryPythonMain: string
  qaEntryPythonScript: string
  qaEntryDocker: string
}

export type GraphMessageCodeAdditions = Omit<
  GraphMessageCodeMessages,
  keyof QualityBreakdownMessages | keyof DuplicateDescriptionMessages
>

export const englishGraphMessageCodes: GraphMessageCodeAdditions = {
  qualityTipForbiddenImport: (file) => `Fix the forbidden import in ${file}`,
  qualityTipUndeclaredImport: (file) => `Fix the undeclared import in ${file}`,
  qualityTipCycle: (label) => `Break the cycle ${label}`,
  qualityTipCycleTheseFiles: 'these files',
  qualityTipCycleBetween: (a, b) => `between ${a} and ${b}`,
  qualityTipCycleAmong: (list) => `among ${list}`,
  qualityTipLargeFile: (path, lines) => `Split ${path} (${lines} lines) into smaller files`,
  qualityTipLargeFunction: (name, path, lines) => `Shorten the ${name} function in ${path} (${lines} lines)`,
  qualityTipUnresolvedImports: 'Resolve the missing imports',
  qualityTipHotspotFile: (path, score) => `Spread work out of ${path} (hotspot score ${score})`,
  qualityTipArchitecture: 'Fix the architecture rule breaks',
  qualityTipCycles: 'Break the remaining import cycles',
  qualityTipHotspots: 'Spread work out of the heaviest hotspot files',
  qualityTipImports: 'Clean up unresolved and heavy third-party imports',
  qualityTipSize: 'Split the unusually large files and functions',
  qualityTipGainSuffix: (gain) => `to gain about ${gain} ${gain === 1 ? 'point' : 'points'}`,
  hotspotWhyNone: 'No hotspot signals',
  hotspotWhyFanIn: (count) => (count === 1 ? 'Used by 1 file' : `Used by ${count} files`),
  hotspotWhyFanOut: (count) => (count === 1 ? 'imports 1 file' : `imports ${count} files`),
  hotspotWhyImpact: (count) => (count === 1 ? 'impacts 1 file' : `impacts ${count} files`),
  hotspotWhyFindings: (count) => (count === 1 ? 'has 1 finding' : `has ${count} findings`),
  hotspotWhyFunctions: (count) => (count === 1 ? 'has 1 function' : `has ${count} functions`),
  hotspotWhyLines: (count) => `has ${count} lines`,
  askSuggestionImpact: (file) => `What breaks if I change ${file}?`,
  askSuggestionExplain: (file) => `What does ${file} do?`,
  askSuggestionHotspots: 'What are the riskiest files?',
  askSuggestionQuality: 'How healthy is the project?',
  askSuggestionWorstFolders: 'What are the worst folders?',
  askSuggestionDuplicates: 'Where is code duplicated?',
  askSuggestionCycles: 'Any circular imports?',
  askSuggestionArchitecture: 'Any architecture rule breaks?',
  askSuggestionLanguages: 'What languages does this use?',
  askSuggestionEntry: 'Where does the app start?',
  qaQuote: (text) => `“${text}”`,
  qaAndMore: (count) => `and ${count} more`,
  qaDepth: (path, depth) => `${path} (depth ${depth})`,
  qaUnknownLanguage: 'unknown language',
  qaResolveMissing: (ref) =>
    `I could not find ${ref} in this scan. Try a full repo-relative path, a file name, or a symbol name, or ask for an overview of the project.`,
  qaResolveAmbiguous: (ref, listed, extra) =>
    `${ref} matches more than one place: ${listed}${extra}. Please use a full path or a more specific name.`,
  qaImpactNeedTarget:
    'Tell me which file, folder, or symbol you want to change and I can list what depends on it. For example: “What breaks if I change src/app.ts?”',
  qaImpactNoFiles: (target) => `I could not find any files to walk from ${target}.`,
  qaImpactNoneFile: (target) =>
    `Nothing in this scan imports ${target}, so a change is unlikely to break other files here.`,
  qaImpactNoneFolder: (path, fileCount) =>
    `${path} contains ${fileCount === 1 ? '1 file' : `${fileCount} files`} and nothing outside it imports those files, so a change is unlikely to break other files here.`,
  qaImpactDependentsFile: (target, dependentCount, listed, extra) =>
    `If you change ${target}, ${dependentCount === 1 ? '1 file depends' : `${dependentCount} files depend`} on it: ${listed}.${extra}`,
  qaImpactDependentsFolder: (path, fileCount, dependentCount, listed, extra) =>
    `If you change ${path} (${fileCount === 1 ? '1 file' : `${fileCount} files`}), ${dependentCount === 1 ? '1 file' : `${dependentCount} files`} outside or downstream would be affected: ${listed}.${extra}`,
  qaImpactDependentsExtra: (count) => ` ${count === 1 ? '1 more file also depends on it.' : `${count} more files also depend on it.`}`,
  qaExplainNeedTarget:
    'Ask about a specific file, folder, or symbol — for example, “What does src/app.ts do?” — and I can summarise what it is, what it imports, and what imports it.',
  qaExplainFileLead: (path, language, lineCount) =>
    lineCount === null ? `${path} is a ${language} file.` : `${path} is a ${language} file (${lineCount} lines).`,
  qaExplainFileHotspot: (score) => `Its hotspot score is ${score}.`,
  qaExplainFileDeclares: (listed, extra) => `It declares ${listed}${extra}.`,
  qaExplainFileNoImports: 'It does not import other files in this scan.',
  qaExplainFileImports: (listed, extra) => `It imports ${listed}${extra}.`,
  qaExplainFileNoImporters: 'No other file in this scan imports it.',
  qaExplainFileImporters: (listed, extra) => `It is imported by ${listed}${extra}.`,
  qaExplainFileFindings: (listed) => `Architecture findings: ${listed}.`,
  qaExplainFileEntry: (listed) => `It looks like an entry point (${listed}).`,
  qaExplainExportedKind: (kind, name) => `exported ${kind} ${name}`,
  qaExplainKind: (kind, name) => `${kind} ${name}`,
  qaExplainFolderEmpty: (path) => `The folder ${path} has no scanned files.`,
  qaExplainFolderLead: (path, fileCount, languages) =>
    languages
      ? `${path} contains ${fileCount === 1 ? '1 file' : `${fileCount} files`}: ${languages}.`
      : `${path} contains ${fileCount === 1 ? '1 file' : `${fileCount} files`}.`,
  qaExplainFolderScore: (score, grade) => `Its quality score is ${score} (grade ${grade}).`,
  qaExplainFolderTip: (tip, gain) => `To raise it: ${tip} (about ${gain} points).`,
  qaExplainFolderFiles: (listed, extra) => `Files include ${listed}${extra}.`,
  qaExplainSymbol: (name, kind, path, startLine, endLine) =>
    `${name} is ${/^[aeiou]/i.test(kind) ? 'an' : 'a'} ${kind} in ${path} (lines ${startLine}–${endLine}).`,
  qaExplainSymbolExported: 'It is exported.',
  qaHotspotsNone:
    'This scan does not include hotspot scores. They appear in graph.json 1.2.0 and later when at least one file scores above 0. I can still explain a file or walk its impact if you name it.',
  qaHotspotsIntro: 'The riskiest files are:',
  qaHotspotsItem: (index, path, score, why) =>
    why ? `${index}. ${path} (score ${score}) — ${why}` : `${index}. ${path} (score ${score})`,
  qaHotspotsExtra: (count) =>
    ` ${count === 1 ? '1 more file is also listed on the graph.' : `${count} more files are also listed on the graph.`}`,
  qaQualityNone:
    'This scan does not include quality scores. They appear in graph.json 1.3.0 and later. I can still look for circular imports or architecture rule breaks, or talk through a specific file.',
  qaQualityProjectLead: 'The project scores',
  qaQualityFolderLead: (path) => `${path} scores`,
  qaQualityScoreLine: (lead, score, grade) => `${lead} ${score} out of 100 (grade ${grade}).`,
  qaQualityNoPenalties: 'No category currently takes points off.',
  qaQualityPenalties: (listed) => `What pulled it down: ${listed}.`,
  qaQualityRaise: (listed) => `To raise the score: ${listed}.`,
  qaQualityWorstFolders: (listed) => `Worst folders: ${listed}.`,
  qaQualityFolderMissing: (path, projectScore, projectGrade) =>
    `There is no separate quality score for ${path}. The project scores ${projectScore} (grade ${projectGrade}).`,
  qaQualityTipItem: (text, gain) => `${text} (about ${gain} points)`,
  qaQualityPenaltyItem: (label, penalty) => `${label} (−${penalty})`,
  qaDuplicatesNone:
    'This scan does not list any duplicated code. Duplicate groups appear in graph.json 1.4.0 and later when a repeated block meets the size threshold.',
  qaDuplicatesHead: (groups, duplicatedLines, percentage) =>
    `There ${groups === 1 ? 'is' : 'are'} ${groups === 1 ? '1 duplicate group' : `${groups} duplicate groups`} covering ${duplicatedLines} lines (${percentage}% of the scanned files).`,
  qaDuplicatesItem: (index, description) => `${index}. ${description}`,
  qaDuplicatesExtra: (count) =>
    ` ${count === 1 ? '1 more group is on the graph.' : `${count} more groups are on the graph.`}`,
  qaArchitectureNoCycles: 'No file-level import cycles showed up in this scan.',
  qaArchitectureCycles: (count) =>
    count === 1 ? '1 import cycle was found.' : `${count} import cycles were found.`,
  qaArchitectureNoConfig: 'This scan has no architecture rules section, so I cannot report configured rule breaks.',
  qaArchitectureNoFindings: 'No architecture rule breaks were recorded.',
  qaArchitectureFindings: (count) =>
    count === 1 ? '1 architecture finding was recorded.' : `${count} architecture findings were recorded.`,
  qaOverviewFiles: (count) => (count === 1 ? 'This scan covers 1 file.' : `This scan covers ${count} files.`),
  qaOverviewLanguages: (listed) => `Languages: ${listed}.`,
  qaOverviewFolders: (listed, extra) => `Top-level folders: ${listed}${extra}.`,
  qaOverviewEntries: (listed, extra) => `Likely entry points: ${listed}${extra}.`,
  qaOverviewNoEntries: 'No conventional entry points were marked.',
  qaFallbackEmpty: 'Ask a question about this scan and I will answer from the graph only, with no AI.',
  qaFallbackUnknown: 'I am not sure how to read that question. I can answer from this scan without AI.',
  qaFallbackExamples: (listed) => ` For example: ${listed}.`,
  qaEntryConventionalName: 'conventional name',
  qaEntryPackageBin: 'package bin',
  qaEntryPackageMain: 'package main',
  qaEntryPackageExports: 'package exports',
  qaEntryPackageScript: 'package script',
  qaEntryPythonMain: 'Python __main__',
  qaEntryPythonScript: 'Python script entry',
  qaEntryDocker: 'Docker entrypoint'
}

export interface MessageCodeContext {
  hotspots?: readonly GraphHotspot[] | null
  quality?: { project: QualityScore; folders?: Array<QualityScore & { path: string }> } | null
  duplicates?: { groups: readonly DuplicateGroup[] } | null
}

function asInt(params: MessageParams | undefined, key: string): number | undefined {
  const value = params?.[key]
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined
}

function asStr(params: MessageParams | undefined, key: string): string | undefined {
  const value = params?.[key]
  return typeof value === 'string' ? value : undefined
}

function asBool(params: MessageParams | undefined, key: string): boolean | undefined {
  const value = params?.[key]
  return typeof value === 'boolean' ? value : undefined
}

function asStrs(params: MessageParams | undefined, key: string): string[] | undefined {
  const value = params?.[key]
  return Array.isArray(value) ? [...value] : undefined
}

function extraAnd(count: number | undefined, messages: GraphMessageCodeMessages): string {
  return count && count > 0 ? ` ${messages.qaAndMore(count)}` : ''
}

function listed(items: string[] | undefined, messages: GraphMessageCodeMessages): string {
  return messages.qualityListAnd(items ?? [])
}

function displayName(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1)
  return base.replace(/\.(tsx?|jsx?|mjs|cjs|py|vue)$/i, '') || path
}

function displayNames(paths: readonly string[]): string[] {
  const bases = paths.map(displayName)
  return new Set(bases).size === bases.length ? bases : [...paths]
}

function cycleLabel(paths: readonly string[], messages: GraphMessageCodeMessages): string {
  const names = displayNames(paths).slice(0, 3)
  if (names.length <= 1) return names[0] ?? messages.qualityTipCycleTheseFiles
  if (names.length === 2) return messages.qualityTipCycleBetween(names[0]!, names[1]!)
  return messages.qualityTipCycleAmong(messages.qualityListAnd(names))
}

function languageLabel(value: string | undefined, messages: GraphMessageCodeMessages): string {
  if (!value || value === 'unknown language') return messages.qaUnknownLanguage
  return value
}

const ENTRY_LABELS: Record<string, keyof GraphMessageCodeMessages> = {
  'conventional name': 'qaEntryConventionalName',
  'package bin': 'qaEntryPackageBin',
  'package main': 'qaEntryPackageMain',
  'package exports': 'qaEntryPackageExports',
  'package script': 'qaEntryPackageScript',
  'Python __main__': 'qaEntryPythonMain',
  'Python script entry': 'qaEntryPythonScript',
  'Docker entrypoint': 'qaEntryDocker'
}

function localizeEntryReason(value: string, messages: GraphMessageCodeMessages): string {
  const key = ENTRY_LABELS[value]
  return key ? (messages[key] as string) : value
}

const EXPORTED_SYMBOL = /^(exported )?(\S+)\s+(.+)$/

function localizeSymbolDecl(value: string, messages: GraphMessageCodeMessages): string {
  const match = EXPORTED_SYMBOL.exec(value)
  if (!match) return value
  const [, exported, kind, name] = match
  if (!kind || !name) return value
  return exported ? messages.qaExplainExportedKind(kind, name) : messages.qaExplainKind(kind, name)
}

function localizeDepthItem(value: string, messages: GraphMessageCodeMessages): string {
  const match = /^(.+) \(depth (\d+)\)$/.exec(value)
  if (!match || !match[1] || match[2] === undefined) return value
  return messages.qaDepth(match[1], Number(match[2]))
}

function relist(items: string[] | undefined, messages: GraphMessageCodeMessages, each: (item: string) => string): string {
  return listed((items ?? []).map(each), messages)
}

function localizeLanguagesBlob(value: string, messages: GraphMessageCodeMessages): string {
  const parts = splitAndList(value)
  if (!parts) return value
  return messages.qualityListAnd(parts.map((part) => part.replace(/unknown language/g, messages.qaUnknownLanguage)))
}

function splitAndList(text: string): string[] | null {
  if (text.includes(', and ')) {
    const [head, last] = text.split(', and ')
    if (!last || head === undefined) return null
    return [...head.split(', ').filter(Boolean), last]
  }
  if (text.includes(' and ')) {
    const parts = text.split(' and ')
    return parts.length === 2 ? parts : null
  }
  return [text]
}

function formatQualityCode(code: string, params: MessageParams | undefined, messages: QualityBreakdownMessages): string | null {
  if (code === 'quality.architecture') {
    const high = asInt(params, 'high')
    const medium = asInt(params, 'medium')
    if (high === undefined || medium === undefined) return null
    if (high === 0 && medium === 0) return messages.qualityLabelArchitectureNone
    const parts: string[] = []
    if (high > 0) parts.push(messages.qualityLabelForbiddenDeps(high))
    if (medium > 0) parts.push(messages.qualityLabelUndeclaredImports(medium))
    return parts.length ? messages.qualityListAnd(parts) : null
  }
  if (code === 'quality.cycles') {
    const count = asInt(params, 'count')
    if (count === undefined) return null
    return count === 0 ? messages.qualityLabelCyclesNone : messages.qualityLabelCycles(count)
  }
  if (code === 'quality.hotspots') {
    const count = asInt(params, 'count')
    const maxCount = asInt(params, 'maxCount') ?? 0
    if (count === undefined) return null
    if (count === 0) return messages.qualityLabelHotspotsNone
    return maxCount > 0 ? messages.qualityLabelHotspotsWithMax(count, maxCount) : messages.qualityLabelHotspots(count)
  }
  if (code === 'quality.imports') {
    const unresolved = asInt(params, 'unresolvedPercent')
    const external = asInt(params, 'externalPercent')
    if (unresolved === undefined || external === undefined) return null
    const parts: string[] = []
    if (unresolved > 0) parts.push(messages.qualityLabelImportsUnresolved(unresolved))
    if (external >= 50) parts.push(messages.qualityLabelImportsExternal(external))
    return parts.length ? messages.qualityListAnd(parts) : messages.qualityLabelImportsNone
  }
  if (code === 'quality.size') {
    const files = asInt(params, 'largeFiles')
    const functions = asInt(params, 'largeFunctions')
    if (files === undefined || functions === undefined) return null
    if (files === 0 && functions === 0) return messages.qualityLabelSizeNone
    const parts: string[] = []
    if (files > 0) parts.push(messages.qualityLabelSizeFiles(files))
    if (functions > 0) parts.push(messages.qualityLabelSizeFunctions(functions))
    return parts.length ? messages.qualityListAnd(parts) : null
  }
  return null
}

function formatTipAction(code: string, params: MessageParams | undefined, messages: GraphMessageCodeMessages): string | null {
  switch (code) {
    case 'quality.tip.forbidden-import': {
      const file = asStr(params, 'file')
      return file !== undefined ? messages.qualityTipForbiddenImport(file) : null
    }
    case 'quality.tip.undeclared-import': {
      const file = asStr(params, 'file')
      return file !== undefined ? messages.qualityTipUndeclaredImport(file) : null
    }
    case 'quality.tip.cycle': {
      const files = asStrs(params, 'files')
      return files ? messages.qualityTipCycle(cycleLabel(files, messages)) : null
    }
    case 'quality.tip.large-file': {
      const path = asStr(params, 'path')
      const lines = asInt(params, 'lines')
      return path !== undefined && lines !== undefined ? messages.qualityTipLargeFile(path, lines) : null
    }
    case 'quality.tip.large-function': {
      const name = asStr(params, 'name')
      const path = asStr(params, 'path')
      const lines = asInt(params, 'lines')
      return name !== undefined && path !== undefined && lines !== undefined
        ? messages.qualityTipLargeFunction(name, path, lines)
        : null
    }
    case 'quality.tip.unresolved-imports':
      return messages.qualityTipUnresolvedImports
    case 'quality.tip.hotspot': {
      const path = asStr(params, 'path')
      const score = asInt(params, 'score')
      return path !== undefined && score !== undefined ? messages.qualityTipHotspotFile(path, score) : null
    }
    case 'quality.tip.architecture':
      return messages.qualityTipArchitecture
    case 'quality.tip.cycles':
      return messages.qualityTipCycles
    case 'quality.tip.hotspots':
      return messages.qualityTipHotspots
    case 'quality.tip.imports':
      return messages.qualityTipImports
    case 'quality.tip.size':
      return messages.qualityTipSize
    default:
      return null
  }
}

function formatHotspotWhy(params: MessageParams | undefined, messages: GraphMessageCodeMessages): string | null {
  const parts: string[] = []
  const fanIn = asInt(params, 'fanIn')
  const fanOut = asInt(params, 'fanOut')
  const impact = asInt(params, 'impact')
  const findings = asInt(params, 'findings')
  const size = asInt(params, 'size')
  const sizeKind = asStr(params, 'sizeKind')
  if (fanIn && fanIn > 0) parts.push(messages.hotspotWhyFanIn(fanIn))
  if (fanOut && fanOut > 0) parts.push(messages.hotspotWhyFanOut(fanOut))
  if (impact && impact > 0) parts.push(messages.hotspotWhyImpact(impact))
  if (findings && findings > 0) parts.push(messages.hotspotWhyFindings(findings))
  if (size && size > 0 && sizeKind === 'functions') parts.push(messages.hotspotWhyFunctions(size))
  else if (size && size > 0 && sizeKind === 'lines') parts.push(messages.hotspotWhyLines(size))
  if (parts.length === 0) return messages.hotspotWhyNone
  return messages.qualityListAnd(parts)
}

function formatDuplicateCode(code: string, params: MessageParams | undefined, messages: DuplicateDescriptionMessages): string | null {
  if (code === 'duplicate.same-file') {
    const lineCount = asInt(params, 'lineCount')
    const path = asStr(params, 'path')
    const times = asInt(params, 'times')
    if (lineCount === undefined || path === undefined || times === undefined) return null
    return messages.duplicatesDescriptionOnePath(lineCount, times, path)
  }
  if (code === 'duplicate.pair') {
    const lineCount = asInt(params, 'lineCount')
    const path = asStr(params, 'path')
    const otherPath = asStr(params, 'otherPath')
    if (lineCount === undefined || path === undefined || otherPath === undefined) return null
    return messages.duplicatesDescriptionTwoPaths(lineCount, path, otherPath)
  }
  if (code === 'duplicate.many-files') {
    const lineCount = asInt(params, 'lineCount')
    const fileCount = asInt(params, 'fileCount')
    if (lineCount === undefined || fileCount === undefined) return null
    return messages.duplicatesDescriptionManyPaths(lineCount, fileCount)
  }
  return null
}

const SUGGESTION_IMPACT = /^What breaks if I change (.+)\?$/
const SUGGESTION_EXPLAIN = /^What does (.+) do\?$/

const SUGGESTION_EXACT: Array<[string, keyof GraphMessageCodeMessages]> = [
  ['What are the riskiest files?', 'askSuggestionHotspots'],
  ['How healthy is the project?', 'askSuggestionQuality'],
  ['What are the worst folders?', 'askSuggestionWorstFolders'],
  ['Where is code duplicated?', 'askSuggestionDuplicates'],
  ['Any circular imports?', 'askSuggestionCycles'],
  ['Any architecture rule breaks?', 'askSuggestionArchitecture'],
  ['What languages does this use?', 'askSuggestionLanguages'],
  ['Where does the app start?', 'askSuggestionEntry']
]

/** Translate a closed-set English suggestion. Unknown strings stay in English. */
export function localizeAskSuggestion(text: string, messages: GraphMessageCodeMessages): string {
  const impact = SUGGESTION_IMPACT.exec(text)
  if (impact?.[1]) return messages.askSuggestionImpact(impact[1])
  const explain = SUGGESTION_EXPLAIN.exec(text)
  if (explain?.[1]) return messages.askSuggestionExplain(explain[1])
  for (const [english, key] of SUGGESTION_EXACT) {
    if (text === english) return messages[key] as string
  }
  return text
}

function formatQa(
  code: string,
  params: MessageParams | undefined,
  messages: GraphMessageCodeMessages,
  context?: MessageCodeContext
): string | null {
  switch (code) {
    case 'qa.resolve.missing': {
      const ref = asStr(params, 'ref')
      return ref !== undefined ? messages.qaResolveMissing(messages.qaQuote(ref)) : null
    }
    case 'qa.resolve.ambiguous': {
      const ref = asStr(params, 'ref')
      const listedItems = asStrs(params, 'listed')
      const extraCount = asInt(params, 'extraCount') ?? 0
      if (ref === undefined || !listedItems) return null
      const extra = extraCount > 0 ? ` ${messages.qaAndMore(extraCount)}` : ''
      return messages.qaResolveAmbiguous(messages.qaQuote(ref), listed(listedItems, messages), extra)
    }
    case 'qa.impact.need-target':
      return messages.qaImpactNeedTarget
    case 'qa.impact.no-files': {
      const target = asStr(params, 'target')
      return target !== undefined ? messages.qaImpactNoFiles(target) : null
    }
    case 'qa.impact.none': {
      const target = asStr(params, 'target')
      const kind = asStr(params, 'kind')
      if (target === undefined || kind === undefined) return null
      if (kind === 'folder') {
        const fileCount = asInt(params, 'fileCount')
        if (fileCount === undefined) return null
        return messages.qaImpactNoneFolder(target, fileCount)
      }
      return messages.qaImpactNoneFile(target)
    }
    case 'qa.impact.dependents': {
      const target = asStr(params, 'target')
      const kind = asStr(params, 'kind')
      const dependentCount = asInt(params, 'dependentCount')
      const listedItems = asStrs(params, 'listed')
      const extraCount = asInt(params, 'extraCount') ?? 0
      if (target === undefined || kind === undefined || dependentCount === undefined || !listedItems) return null
      const listedText = relist(listedItems, messages, (item) => localizeDepthItem(item, messages))
      const extra = extraCount > 0 ? messages.qaImpactDependentsExtra(extraCount) : ''
      if (kind === 'folder') {
        const fileCount = asInt(params, 'fileCount')
        if (fileCount === undefined) return null
        return messages.qaImpactDependentsFolder(target, fileCount, dependentCount, listedText, extra)
      }
      return messages.qaImpactDependentsFile(target, dependentCount, listedText, extra)
    }
    case 'qa.explain.need-target':
      return messages.qaExplainNeedTarget
    case 'qa.explain.file': {
      const path = asStr(params, 'path')
      const language = asStr(params, 'language')
      if (path === undefined || language === undefined) return null
      const parts = [messages.qaExplainFileLead(path, languageLabel(language, messages), asInt(params, 'lineCount') ?? null)]
      const hotspotScore = asInt(params, 'hotspotScore')
      if (hotspotScore !== undefined) parts.push(messages.qaExplainFileHotspot(hotspotScore))
      const symbols = asStrs(params, 'symbols')
      if (symbols && symbols.length > 0) {
        parts.push(
          messages.qaExplainFileDeclares(
            relist(symbols, messages, (item) => localizeSymbolDecl(item, messages)),
            extraAnd(asInt(params, 'extraSymbols'), messages)
          )
        )
      }
      const imports = asStrs(params, 'imports')
      parts.push(
        imports && imports.length > 0
          ? messages.qaExplainFileImports(listed(imports, messages), extraAnd(asInt(params, 'extraImports'), messages))
          : messages.qaExplainFileNoImports
      )
      const importers = asStrs(params, 'importers')
      parts.push(
        importers && importers.length > 0
          ? messages.qaExplainFileImporters(listed(importers, messages), extraAnd(asInt(params, 'extraImporters'), messages))
          : messages.qaExplainFileNoImporters
      )
      const findings = asStrs(params, 'findings')
      if (findings && findings.length > 0) parts.push(messages.qaExplainFileFindings(listed(findings, messages)))
      const entry = asStrs(params, 'entry')
      if (entry && entry.length > 0) {
        parts.push(messages.qaExplainFileEntry(relist(entry, messages, (item) => localizeEntryReason(item, messages))))
      }
      return parts.join(' ')
    }
    case 'qa.explain.folder-empty': {
      const path = asStr(params, 'path')
      return path !== undefined ? messages.qaExplainFolderEmpty(path) : null
    }
    case 'qa.explain.folder': {
      const path = asStr(params, 'path')
      const fileCount = asInt(params, 'fileCount')
      if (path === undefined || fileCount === undefined) return null
      const languages = asStr(params, 'languages')
      const parts = [
        messages.qaExplainFolderLead(path, fileCount, languages ? localizeLanguagesBlob(languages, messages) : null)
      ]
      const score = asInt(params, 'score')
      const grade = asStr(params, 'grade')
      if (score !== undefined && grade !== undefined) {
        parts.push(messages.qaExplainFolderScore(score, grade))
        const tipText = localizeContextTip(path, asStr(params, 'tip'), asInt(params, 'tipGain'), messages, context)
        const tipGain = asInt(params, 'tipGain')
        if (tipText && tipGain !== undefined) parts.push(messages.qaExplainFolderTip(tipText, tipGain))
      }
      const files = asStrs(params, 'files')
      if (files && files.length > 0) {
        parts.push(messages.qaExplainFolderFiles(listed(files, messages), extraAnd(asInt(params, 'extraFiles'), messages)))
      }
      return parts.join(' ')
    }
    case 'qa.explain.symbol': {
      const name = asStr(params, 'name')
      const kind = asStr(params, 'kind')
      const path = asStr(params, 'path')
      const startLine = asInt(params, 'startLine')
      const endLine = asInt(params, 'endLine')
      if (name === undefined || kind === undefined || path === undefined || startLine === undefined || endLine === undefined) {
        return null
      }
      const parts = [messages.qaExplainSymbol(name, kind, path, startLine, endLine)]
      if (asBool(params, 'exported')) parts.push(messages.qaExplainSymbolExported)
      return parts.join(' ')
    }
    case 'qa.hotspots.none':
      return messages.qaHotspotsNone
    case 'qa.hotspots.list': {
      const paths = asStrs(params, 'paths')
      const scores = asStrs(params, 'scores')
      if (!paths || !scores || paths.length !== scores.length) return null
      const lines = paths.map((path, index) => {
        const score = Number(scores[index])
        const why = localizeHotspotWhy(path, context, messages)
        return messages.qaHotspotsItem(index + 1, path, Number.isFinite(score) ? score : 0, why)
      })
      const extraCount = asInt(params, 'extraCount') ?? 0
      return `${messages.qaHotspotsIntro}\n${lines.join('\n')}${extraCount > 0 ? messages.qaHotspotsExtra(extraCount) : ''}`
    }
    case 'qa.quality.none':
      return messages.qaQualityNone
    case 'qa.quality.folder-missing': {
      const path = asStr(params, 'path')
      const projectScore = asInt(params, 'projectScore')
      const projectGrade = asStr(params, 'projectGrade')
      if (path === undefined || projectScore === undefined || projectGrade === undefined) return null
      return messages.qaQualityFolderMissing(path, projectScore, projectGrade)
    }
    case 'qa.quality.score': {
      const score = asInt(params, 'score')
      const grade = asStr(params, 'grade')
      const leadRaw = asStr(params, 'lead')
      if (score === undefined || grade === undefined || leadRaw === undefined) return null
      const lead = leadRaw === 'The project scores' ? messages.qaQualityProjectLead : folderLead(leadRaw, messages)
      const parts = [messages.qaQualityScoreLine(lead, score, grade)]
      const scoreSource = qualityFromLead(leadRaw, context)
      const penalties = asStrs(params, 'penalties')
      if (penalties && penalties.length > 0) {
        const localized = penalties.map((item) => localizePenaltyItem(item, messages, scoreSource))
        parts.push(messages.qaQualityPenalties(listed(localized, messages)))
      } else {
        parts.push(messages.qaQualityNoPenalties)
      }
      const tips = asStrs(params, 'tips')
      if (tips && tips.length > 0) {
        const localized = localizeQualityTipItems(tips, messages, scoreSource)
        parts.push(messages.qaQualityRaise(listed(localized, messages)))
      }
      const worst = asStrs(params, 'worstFolders')
      if (worst && worst.length > 0) parts.push(messages.qaQualityWorstFolders(listed(worst, messages)))
      return parts.join(' ')
    }
    case 'qa.duplicates.none':
      return messages.qaDuplicatesNone
    case 'qa.duplicates.list': {
      const groups = asInt(params, 'groups')
      const duplicatedLines = asInt(params, 'duplicatedLines')
      const percentage = asInt(params, 'percentage')
      const descriptions = asStrs(params, 'descriptions')
      if (groups === undefined || duplicatedLines === undefined || percentage === undefined || !descriptions) return null
      const lines = descriptions.map((description, index) =>
        messages.qaDuplicatesItem(index + 1, localizeDuplicateDescription(description, messages, context))
      )
      const extraCount = asInt(params, 'extraCount') ?? 0
      return `${messages.qaDuplicatesHead(groups, duplicatedLines, percentage)}\n${lines.join('\n')}${
        extraCount > 0 ? messages.qaDuplicatesExtra(extraCount) : ''
      }`
    }
    case 'qa.architecture': {
      const cycleCount = asInt(params, 'cycleCount')
      const hasConfig = asBool(params, 'hasConfig')
      const findingCount = asInt(params, 'findingCount')
      if (cycleCount === undefined || hasConfig === undefined || findingCount === undefined) return null
      const parts: string[] = []
      parts.push(cycleCount === 0 ? messages.qaArchitectureNoCycles : messages.qaArchitectureCycles(cycleCount))
      if (!hasConfig) parts.push(messages.qaArchitectureNoConfig)
      else if (findingCount === 0) parts.push(messages.qaArchitectureNoFindings)
      else parts.push(messages.qaArchitectureFindings(findingCount))
      return parts.join(' ')
    }
    case 'qa.overview': {
      const fileCount = asInt(params, 'fileCount')
      if (fileCount === undefined) return null
      const parts = [messages.qaOverviewFiles(fileCount)]
      const languages = asStr(params, 'languages')
      if (languages) parts.push(messages.qaOverviewLanguages(localizeLanguagesBlob(languages, messages)))
      const folders = asStrs(params, 'folders')
      if (folders && folders.length > 0) {
        parts.push(messages.qaOverviewFolders(listed(folders, messages), extraAnd(asInt(params, 'extraFolders'), messages)))
      }
      const entries = asStrs(params, 'entries')
      if (entries && entries.length > 0) {
        parts.push(messages.qaOverviewEntries(listed(entries, messages), extraAnd(asInt(params, 'extraEntries'), messages)))
      } else {
        parts.push(messages.qaOverviewNoEntries)
      }
      return parts.join(' ')
    }
    case 'qa.fallback.empty':
    case 'qa.fallback.unknown': {
      const lead = code === 'qa.fallback.empty' ? messages.qaFallbackEmpty : messages.qaFallbackUnknown
      const examples = asStrs(params, 'examples')
      if (!examples || examples.length === 0) return lead
      const quoted = examples.map((item) => messages.qaQuote(localizeAskSuggestion(item, messages)))
      return `${lead}${messages.qaFallbackExamples(listed(quoted, messages))}`
    }
    default:
      return null
  }
}

function folderLead(lead: string, messages: GraphMessageCodeMessages): string {
  return lead.endsWith(' scores') ? messages.qaQualityFolderLead(lead.slice(0, -' scores'.length)) : lead
}

function qualityFromLead(lead: string, context?: MessageCodeContext): QualityScore | undefined {
  if (!context?.quality) return undefined
  if (lead === 'The project scores') return context.quality.project
  if (lead.endsWith(' scores')) {
    const path = lead.slice(0, -' scores'.length)
    return context.quality.folders?.find((folder) => folder.path === path)
  }
  return undefined
}

function localizeContextTip(
  folderPath: string,
  tipText: string | undefined,
  _tipGain: number | undefined,
  messages: GraphMessageCodeMessages,
  context?: MessageCodeContext
): string | undefined {
  const folder = context?.quality?.folders?.find((item) => item.path === folderPath)
  const tip = folder?.tips[0]
  if (tip) {
    const action = formatQualityTipAction(tip, messages)
    if (action) return action
  }
  return tipText
}

function localizeHotspotWhy(path: string, context: MessageCodeContext | undefined, messages: GraphMessageCodeMessages): string | null {
  const item = context?.hotspots?.find((hotspot) => hotspot.path === path)
  if (!item) return null
  return formatHotspotWhyText(item, messages)
}

function localizeDuplicateDescription(
  description: string,
  messages: GraphMessageCodeMessages,
  context?: MessageCodeContext
): string {
  const group = context?.duplicates?.groups.find((item) => item.description === description)
  if (group) {
    const fromCode = group.code ? formatDuplicateCode(group.code, group.params, messages) : null
    if (fromCode) return fromCode
  }
  return description
}

const PENALTY_ITEM = /^(.*) \(−(\d+)\)$/
const TIP_ABOUT = /^(.*) \(about (\d+) points\)$/

function localizePenaltyItem(item: string, messages: GraphMessageCodeMessages, score?: QualityScore): string {
  const match = PENALTY_ITEM.exec(item)
  if (!match || !match[1] || match[2] === undefined) return item
  const label = match[1]
  const penalty = Number(match[2])
  const fromScore = score?.breakdown.find((row) => row.label === label && row.penalty === penalty)
  const localized = fromScore ? formatQualityBreakdownItem(fromScore, messages) : label
  return messages.qaQualityPenaltyItem(localized ?? label, penalty)
}

function localizeQualityTipItems(
  items: string[],
  messages: GraphMessageCodeMessages,
  score?: QualityScore
): string[] {
  return items.map((item, index) => {
    const match = TIP_ABOUT.exec(item)
    const text = match?.[1] ?? item
    const gain = match?.[2] !== undefined ? Number(match[2]) : undefined
    const tip = score?.tips[index] ?? score?.tips.find((row) => row.text === text && (gain === undefined || row.gain === gain))
    const action = tip ? formatQualityTipAction(tip, messages) : null
    const body = action ?? text
    return gain !== undefined ? messages.qaQualityTipItem(body, gain) : body
  })
}

/** Format a quality tip action without the “to gain about N points” suffix. */
export function formatQualityTipAction(tip: QualityTip, messages: GraphMessageCodeMessages): string | null {
  if (!tip.code) return null
  return formatTipAction(tip.code, tip.params, messages)
}

export function formatQualityTipText(tip: QualityTip, messages: GraphMessageCodeMessages): string | null {
  const action = formatQualityTipAction(tip, messages)
  if (!action) return null
  const gain = asInt(tip.params, 'gain') ?? tip.gain
  return `${action} ${messages.qualityTipGainSuffix(gain)}`
}

export function formatQualityBreakdownItem(item: QualityBreakdownItem, messages: QualityBreakdownMessages): string | null {
  if (!item.code) return null
  return formatQualityCode(item.code, item.params, messages)
}

export function formatHotspotWhyText(item: GraphHotspot, messages: GraphMessageCodeMessages): string {
  if (item.code === 'hotspot.why') {
    const text = formatHotspotWhy(item.params, messages)
    if (text) return text
  }
  return item.why
}

export function formatDuplicateGroupText(
  group: Pick<DuplicateGroup, 'code' | 'params' | 'description'>,
  messages: DuplicateDescriptionMessages
): string | null {
  if (!group.code) return null
  return formatDuplicateCode(group.code, group.params, messages)
}

/**
 * Render a message from its `code` and `params`. Returns null when the code is
 * missing or unknown, or required params are absent, so callers can fall back
 * to the engine's English string.
 */
export function formatMessageCode(
  code: string | undefined,
  params: MessageParams | undefined,
  messages: GraphMessageCodeMessages,
  context?: MessageCodeContext
): string | null {
  if (!code) return null
  if (code.startsWith('quality.tip.')) return formatTipAction(code, params, messages)
  if (code.startsWith('quality.')) return formatQualityCode(code, params, messages)
  if (code === 'hotspot.why') return formatHotspotWhy(params, messages)
  if (code.startsWith('duplicate.')) return formatDuplicateCode(code, params, messages)
  if (code.startsWith('qa.')) return formatQa(code, params, messages, context)
  return null
}

export const MESSAGE_CODE_IDS = [
  'quality.architecture',
  'quality.cycles',
  'quality.hotspots',
  'quality.imports',
  'quality.size',
  'quality.tip.forbidden-import',
  'quality.tip.undeclared-import',
  'quality.tip.cycle',
  'quality.tip.large-file',
  'quality.tip.large-function',
  'quality.tip.unresolved-imports',
  'quality.tip.hotspot',
  'quality.tip.architecture',
  'quality.tip.cycles',
  'quality.tip.hotspots',
  'quality.tip.imports',
  'quality.tip.size',
  'hotspot.why',
  'duplicate.same-file',
  'duplicate.pair',
  'duplicate.many-files',
  'qa.resolve.missing',
  'qa.resolve.ambiguous',
  'qa.impact.need-target',
  'qa.impact.no-files',
  'qa.impact.none',
  'qa.impact.dependents',
  'qa.explain.need-target',
  'qa.explain.file',
  'qa.explain.folder',
  'qa.explain.folder-empty',
  'qa.explain.symbol',
  'qa.hotspots.none',
  'qa.hotspots.list',
  'qa.quality.none',
  'qa.quality.score',
  'qa.quality.folder-missing',
  'qa.duplicates.none',
  'qa.duplicates.list',
  'qa.architecture',
  'qa.overview',
  'qa.fallback.empty',
  'qa.fallback.unknown'
] as const
