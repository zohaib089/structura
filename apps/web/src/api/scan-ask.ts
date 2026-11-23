import { getCurrentSession } from '../services/auth'

/** Matches the hosted ask route and `GRAPH_QA_MAX_QUESTION_LENGTH` in the engine. */
export const GRAPH_QA_MAX_QUESTION_LENGTH = 500

export type GraphQaIntent =
  | 'impact'
  | 'explain'
  | 'hotspots'
  | 'quality'
  | 'duplicates'
  | 'architecture'
  | 'overview'
  | 'fallback'

export type GraphQaCitationKind = 'file' | 'folder' | 'symbol'

export interface GraphQaCitation {
  kind: GraphQaCitationKind
  path: string
  name?: string
  startLine?: number
  endLine?: number
}

export interface GraphQaAnswer {
  intent: GraphQaIntent
  answer: string
  citations: GraphQaCitation[]
  suggestions: string[]
}

const INTENTS = new Set<GraphQaIntent>([
  'impact',
  'explain',
  'hotspots',
  'quality',
  'duplicates',
  'architecture',
  'overview',
  'fallback'
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCitationKind(value: unknown): value is GraphQaCitationKind {
  return value === 'file' || value === 'folder' || value === 'symbol'
}

function optionalName(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function optionalLine(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined
}

export function parseGraphQaCitation(value: unknown): GraphQaCitation | null {
  if (!isRecord(value) || !isCitationKind(value.kind)) return null
  if (typeof value.path !== 'string' || value.path.trim().length === 0) return null
  const citation: GraphQaCitation = { kind: value.kind, path: value.path }
  const name = optionalName(value.name)
  const startLine = optionalLine(value.startLine)
  const endLine = optionalLine(value.endLine)
  if (name) citation.name = name
  if (startLine) citation.startLine = startLine
  if (endLine) citation.endLine = endLine
  return citation
}

function citationFileName(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? path
}

function citationShortPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  if (parts.length <= 1) return ''
  return parts.slice(0, -1).join('/')
}

export function formatCitationRange(startLine?: number, endLine?: number): string | null {
  if (!startLine) return null
  if (!endLine || endLine === startLine) return `line ${startLine}`
  return `lines ${startLine}–${endLine}`
}

export function citationDisplay(citation: GraphQaCitation): {
  title: string
  path: string
  detail: string
  range: string | null
} {
  const range = formatCitationRange(citation.startLine, citation.endLine)
  if (citation.kind === 'folder') {
    return { title: citation.path, path: citation.path, detail: '', range }
  }
  if (citation.kind === 'symbol') {
    return {
      title: citation.name || citationFileName(citation.path),
      path: citation.path,
      detail: citation.path,
      range
    }
  }
  return {
    title: citation.name || citationFileName(citation.path),
    path: citation.path,
    detail: citationShortPath(citation.path),
    range
  }
}

export function citationAriaLabel(citation: GraphQaCitation, openLabel: string): string {
  const shown = citationDisplay(citation)
  const parts = [shown.title]
  if (citation.kind === 'folder') {
    parts.push('folder')
  } else if (citation.kind === 'symbol' && shown.detail) {
    parts.push(`in ${shown.detail}`)
  } else if (shown.detail) {
    parts.push(shown.detail)
  }
  if (shown.range) parts.push(shown.range)
  parts.push(openLabel)
  return parts.join('. ').replace(/\. \./g, '. ')
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const result: unknown = await response.json()
    return isRecord(result) ? result : null
  } catch {
    return null
  }
}

export function askFailureMessage(status: number, apiMessage?: string | null): string {
  const message = apiMessage?.trim() || null
  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 409) return 'This scan is still running. Try again when it finishes.'
  if (status === 404) return 'This scan is not available to ask about.'
  if (status === 429) return 'Please wait a moment before asking another question.'
  if (status === 400) {
    if (message && /500/.test(message)) {
      return `Please keep your question to ${GRAPH_QA_MAX_QUESTION_LENGTH} characters or fewer.`
    }
    if (message && /required/i.test(message)) return 'Type a question first.'
    if (message) return message
  }
  if (message) return message
  return 'We could not answer that just now. Please try again.'
}

function askPath(workspaceId: string, scanId: string): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/scans/${encodeURIComponent(scanId)}/ask`
}

export function hasHostedAskContext(workspaceId?: string | null, scanId?: string | null): boolean {
  return Boolean(workspaceId?.trim() && scanId?.trim())
}

export async function askScanQuestion(
  workspaceId: string,
  scanId: string,
  question: string
): Promise<GraphQaAnswer> {
  const session = getCurrentSession()
  if (!session) throw new Error('Your session has expired. Please sign in again.')

  const trimmed = question.trim()
  if (!trimmed) throw new Error('Type a question first.')
  if (trimmed.length > GRAPH_QA_MAX_QUESTION_LENGTH) {
    throw new Error(`Please keep your question to ${GRAPH_QA_MAX_QUESTION_LENGTH} characters or fewer.`)
  }

  let response: Response
  try {
    response = await fetch(`/api${askPath(workspaceId, scanId)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question: trimmed })
    })
  } catch {
    throw new Error('We could not reach the server. Check your connection and try again.')
  }

  const result = await readJsonResponse(response)
  const apiMessage = result && typeof result.message === 'string' ? result.message : null

  if (!response.ok || !result || result.success !== true) {
    throw new Error(askFailureMessage(response.status, apiMessage))
  }

  const intent = INTENTS.has(result.intent as GraphQaIntent) ? (result.intent as GraphQaIntent) : 'fallback'
  if (typeof result.answer !== 'string' || result.answer.trim().length === 0) {
    throw new Error('We could not answer that just now. Please try again.')
  }

  const citations = Array.isArray(result.citations)
    ? result.citations.map(parseGraphQaCitation).filter((item): item is GraphQaCitation => item !== null)
    : []
  const suggestions = Array.isArray(result.suggestions)
    ? result.suggestions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []

  return { intent, answer: result.answer, citations, suggestions }
}
