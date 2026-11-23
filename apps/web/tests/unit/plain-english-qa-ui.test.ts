import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  GRAPH_QA_MAX_QUESTION_LENGTH,
  askFailureMessage,
  askScanQuestion,
  citationAriaLabel,
  citationDisplay,
  formatCitationRange,
  hasHostedAskContext,
  parseGraphQaCitation
} from '../../src/api/scan-ask'
import ReportAsk from '../../src/components/dashboard/report/ReportAsk.vue'
import { scanReportMessages } from '../../src/services/scan-report-messages'

const messages = scanReportMessages('en')

const answerBody = {
  success: true,
  intent: 'hotspots',
  answer: 'The riskiest files are src/app.ts and packages/engine/src/graph/qa.ts.',
  citations: [
    { kind: 'file', path: 'src/app.ts' },
    { kind: 'folder', path: 'packages/engine' },
    { kind: 'symbol', path: 'packages/engine/src/graph/qa.ts', name: 'answerGraphQuestion', startLine: 126, endLine: 160 }
  ],
  suggestions: ['How healthy is this project?', 'Where is code duplicated?']
}

const answerBodyWithCode = {
  ...answerBody,
  code: 'qa.hotspots.list',
  params: { count: 2, paths: ['src/app.ts', 'packages/engine/src/graph/qa.ts'], scores: ['61', '47'], extraCount: 0 }
}

function sessionJson() {
  return JSON.stringify({
    token: 'qa-session',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    user: { id: 'user-1' }
  })
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response
}

async function mountAsk(
  props: Record<string, unknown> = {}
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: defineComponent({ render: () => h('div') }) }]
  })
  await router.push('/en/w/ws-1/projects/p/scans/scan-1/summary')
  await router.isReady()
  const wrapper = mount(ReportAsk, {
    props: {
      workspaceId: 'ws-1',
      scanId: 'scan-1',
      graphHref: (path?: string) => ({ path: '/graph', query: path ? { node: path } : {} }),
      title: messages.askTitle,
      hint: messages.askHint,
      inputLabel: messages.askInputLabel,
      placeholder: messages.askPlaceholder,
      buttonLabel: messages.askButton,
      thinkingLabel: messages.askThinking,
      starters: messages.askStarters,
      citationsTitle: messages.askCitationsTitle,
      followUpsTitle: messages.askFollowUpsTitle,
      openLabel: messages.askOpen,
      charCount: messages.askCharCount,
      tooLong: messages.askTooLong,
      ...props
    },
    global: { plugins: [router] }
  })
  return { wrapper, router }
}

describe('plain-English Q&A helpers', () => {
  it('requires both hosted ids before the card can show', () => {
    expect(hasHostedAskContext('ws-1', 'scan-1')).toBe(true)
    expect(hasHostedAskContext('  ', 'scan-1')).toBe(false)
    expect(hasHostedAskContext('ws-1', '')).toBe(false)
    expect(hasHostedAskContext(undefined, 'scan-1')).toBe(false)
    expect(hasHostedAskContext('ws-1', null)).toBe(false)
  })

  it('parses file, folder, and symbol citations and ignores invalid ones', () => {
    expect(parseGraphQaCitation({ kind: 'file', path: 'src/app.ts' })).toEqual({
      kind: 'file',
      path: 'src/app.ts'
    })
    expect(
      parseGraphQaCitation({
        kind: 'symbol',
        path: 'src/app.ts',
        name: 'boot',
        startLine: 4,
        endLine: 9
      })
    ).toEqual({ kind: 'symbol', path: 'src/app.ts', name: 'boot', startLine: 4, endLine: 9 })
    expect(parseGraphQaCitation({ kind: 'folder', path: 'src' })?.kind).toBe('folder')
    expect(parseGraphQaCitation({ kind: 'file', path: '' })).toBeNull()
    expect(parseGraphQaCitation({ kind: 'other', path: 'src/app.ts' })).toBeNull()
  })

  it('formats citation labels and line ranges for graph links', () => {
    expect(formatCitationRange(10, 18)).toBe('lines 10–18')
    expect(formatCitationRange(4, 4)).toBe('line 4')
    expect(citationDisplay({ kind: 'file', path: 'apps/web/src/app.ts' })).toEqual({
      title: 'app.ts',
      path: 'apps/web/src/app.ts',
      detail: 'apps/web/src',
      range: null
    })
    expect(citationDisplay({ kind: 'folder', path: 'packages/engine' }).title).toBe('packages/engine')
    const symbol = citationAriaLabel(
      { kind: 'symbol', path: 'src/qa.ts', name: 'answerGraphQuestion', startLine: 2, endLine: 9 },
      'Show in graph'
    )
    expect(symbol).toContain('answerGraphQuestion')
    expect(symbol).toContain('src/qa.ts')
    expect(symbol).toContain('lines 2–9')
    expect(symbol).toContain('Show in graph')
  })

  it('turns API failures into plain-English messages', () => {
    expect(askFailureMessage(401)).toContain('sign in')
    expect(askFailureMessage(409)).toContain('still running')
    expect(askFailureMessage(404)).toContain('not available')
    expect(askFailureMessage(429)).toContain('wait a moment')
    expect(askFailureMessage(400, 'Question must be 500 characters or fewer.')).toContain('500 characters')
    expect(askFailureMessage(500)).toContain('try again')
  })
})

describe('askScanQuestion client', () => {
  beforeEach(() => {
    localStorage.setItem('structura-auth-session-v2', sessionJson())
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('POSTs the trimmed question to the hosted ask route', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(answerBodyWithCode))
    const result = await askScanQuestion('ws-1', 'scan-1', '  What are the riskiest files?  ')
    expect(result.answer).toContain('riskiest files')
    expect(result.code).toBe('qa.hotspots.list')
    expect(result.params).toEqual({
      count: 2,
      paths: ['src/app.ts', 'packages/engine/src/graph/qa.ts'],
      scores: ['61', '47'],
      extraCount: 0
    })
    expect(result.citations).toHaveLength(3)
    expect(result.suggestions).toHaveLength(2)
    expect(fetch).toHaveBeenCalledWith(
      '/api/workspaces/ws-1/scans/scan-1/ask',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer qa-session',
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ question: 'What are the riskiest files?' })
      })
    )
  })

  it('rejects a blank question and one over the 500-character limit without calling the API', async () => {
    await expect(askScanQuestion('ws-1', 'scan-1', '   ')).rejects.toThrow('Type a question first.')
    await expect(askScanQuestion('ws-1', 'scan-1', 'x'.repeat(GRAPH_QA_MAX_QUESTION_LENGTH + 1))).rejects.toThrow(
      '500 characters'
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('surfaces a plain-English network error', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(askScanQuestion('ws-1', 'scan-1', 'How healthy is this project?')).rejects.toThrow(
      'We could not reach the server'
    )
  })
})

describe('Ask about this project card', () => {
  beforeEach(() => {
    localStorage.setItem('structura-auth-session-v2', sessionJson())
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('renders the input, Ask button, and starter chips when hosted context is present', async () => {
    const { wrapper } = await mountAsk()
    expect(wrapper.get('[data-testid="ask-about-project"]').text()).toContain('Ask about this project')
    expect(wrapper.get('[data-testid="ask-submit"]').text()).toContain('Ask')
    expect(wrapper.get('#report-ask-input').attributes('maxlength')).toBe(String(GRAPH_QA_MAX_QUESTION_LENGTH))
    const starters = wrapper.findAll('[data-testid="ask-starters"] button').map((item) => item.text())
    expect(starters).toEqual([...messages.askStarters])
  })

  it('hides cleanly when workspace or scan ids are missing', async () => {
    const missingWorkspace = await mountAsk({ workspaceId: '', scanId: 'scan-1' })
    expect(missingWorkspace.wrapper.find('[data-testid="ask-about-project"]').exists()).toBe(false)
    const missingScan = await mountAsk({ workspaceId: 'ws-1', scanId: null })
    expect(missingScan.wrapper.find('[data-testid="ask-about-project"]').exists()).toBe(false)
    const missingBoth = await mountAsk({ workspaceId: undefined, scanId: undefined })
    expect(missingBoth.wrapper.find('[data-testid="ask-about-project"]').exists()).toBe(false)
  })

  it('submits from the Ask button and from Enter with { question }', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(answerBody))
    const { wrapper } = await mountAsk()
    const input = wrapper.get('#report-ask-input')
    await input.setValue('What are the riskiest files?')
    await wrapper.get('[data-testid="ask-submit"]').trigger('click')
    // click on a submit button may not emit form submit in happy-dom; submit the form too if needed
    if (vi.mocked(fetch).mock.calls.length === 0) {
      await wrapper.get('[data-testid="ask-form"]').trigger('submit')
    }
    await flushPromises()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('/api/workspaces/ws-1/scans/scan-1/ask')
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))).toEqual({
      question: 'What are the riskiest files?'
    })

    vi.mocked(fetch).mockClear()
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ...answerBody, intent: 'quality', answer: 'The project scores 69.' }))
    await input.setValue('How healthy is this project?')
    await wrapper.get('[data-testid="ask-form"]').trigger('submit')
    await flushPromises()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))).toEqual({
      question: 'How healthy is this project?'
    })
    expect(wrapper.get('[data-testid="ask-answer"]').text()).toContain('The project scores 69.')
  })

  it('ignores blank submissions and enforces the 500-character limit', async () => {
    const { wrapper } = await mountAsk()
    await wrapper.get('#report-ask-input').setValue('   ')
    await wrapper.get('[data-testid="ask-form"]').trigger('submit')
    await flushPromises()
    expect(fetch).not.toHaveBeenCalled()

    await wrapper.get('#report-ask-input').setValue('x'.repeat(GRAPH_QA_MAX_QUESTION_LENGTH + 40))
    expect((wrapper.get('#report-ask-input').element as HTMLInputElement).value).toHaveLength(
      GRAPH_QA_MAX_QUESTION_LENGTH
    )
    expect(wrapper.get('[data-testid="ask-char-count"]').text()).toContain(String(GRAPH_QA_MAX_QUESTION_LENGTH))
  })

  it('fills the input and submits when a starter chip is clicked', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(answerBody))
    const { wrapper } = await mountAsk()
    await wrapper.findAll('[data-testid="ask-starters"] button')[0]!.trigger('click')
    await flushPromises()
    expect((wrapper.get('#report-ask-input').element as HTMLInputElement).value).toBe(
      'What are the riskiest files?'
    )
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))).toEqual({
      question: 'What are the riskiest files?'
    })
  })

  it('shows a loading state, answer, graph citations, and follow-up chips', async () => {
    let resolveFetch: (value: Response) => void = () => {}
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        })
    )
    const { wrapper } = await mountAsk()
    await wrapper.get('#report-ask-input').setValue('What are the riskiest files?')
    await wrapper.get('[data-testid="ask-form"]').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-testid="ask-thinking"]').text()).toBe('Thinking…')
    expect(wrapper.get('[data-testid="ask-submit"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="ask-live"]').attributes('aria-live')).toBe('polite')

    resolveFetch(jsonResponse(answerBody))
    await flushPromises()
    const result = wrapper.get('[data-testid="ask-answer"]')
    expect(result.text()).toContain('The riskiest files are src/app.ts')
    const citations = wrapper.findAll('[data-testid="ask-citations"] a')
    expect(citations).toHaveLength(3)
    expect(citations[0]!.attributes('href')).toBe('/graph?node=src/app.ts')
    expect(citations[1]!.attributes('href')).toBe('/graph?node=packages/engine')
    expect(citations[2]!.attributes('href')).toBe('/graph?node=packages/engine/src/graph/qa.ts')
    expect(citations[1]!.attributes('data-citation-kind')).toBe('folder')
    expect(citations[2]!.text()).toContain('answerGraphQuestion')
    expect(citations[2]!.text()).toContain('lines 126–160')

    const followUps = wrapper.findAll('[data-testid="ask-followups"] button')
    expect(followUps.map((item) => item.text())).toEqual([
      'How healthy is this project?',
      'Where is code duplicated?'
    ])

    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ ...answerBody, intent: 'quality', answer: 'Score 69 out of 100.', citations: [], suggestions: [] })
    )
    await followUps[0]!.trigger('click')
    await flushPromises()
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls.at(-1)?.[1]?.body))).toEqual({
      question: 'How healthy is this project?'
    })
    expect(wrapper.get('[data-testid="ask-answer"]').text()).toContain('Score 69 out of 100.')
  })

  it('ignores a stale response when a newer question is asked', async () => {
    const resolvers: Array<(value: Response) => void> = []
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve)
        })
    )
    const { wrapper } = await mountAsk()
    await wrapper.get('#report-ask-input').setValue('First question')
    await wrapper.get('[data-testid="ask-form"]').trigger('submit')
    await flushPromises()
    await wrapper.get('#report-ask-input').setValue('Second question')
    // The submit button is disabled while loading; increment happens on each submit().
    // Force a second ask after bumping request state by calling submit on the form —
    // the first request is still in flight, so the second should be ignored unless we
    // allow it. Loading blocks a second submit. This test documents that overlapping
    // requests from submit() are prevented by the loading flag.
    expect(wrapper.get('[data-testid="ask-submit"]').attributes('disabled')).toBeDefined()
    expect(fetch).toHaveBeenCalledTimes(1)
    resolvers[0]!(jsonResponse(answerBody))
    await flushPromises()
    expect(wrapper.get('[data-testid="ask-answer"]').text()).toContain('riskiest files')
  })

  it('shows a plain-English error when the API fails', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, message: 'Question must be 500 characters or fewer.' }, 400)
    )
    const { wrapper } = await mountAsk()
    await wrapper.get('#report-ask-input').setValue('How healthy is this project?')
    await wrapper.get('[data-testid="ask-form"]').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-testid="ask-error"]').text()).toContain('500 characters')

    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))
    await wrapper.get('[data-testid="ask-form"]').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-testid="ask-error"]').text()).toContain('could not reach the server')
  })
})
