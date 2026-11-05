import { reactive, readonly } from 'vue'

/**
 * useToast - app-wide notifications (spec: design/loading-and-toasts.md §2).
 *
 * | variant | auto-dismiss | role / live       |
 * | success | 5s           | status / polite   |
 * | info    | 5s           | status / polite   |
 * | warning | 8s           | alert / assertive |
 * | error   | sticky       | alert / assertive |
 *
 * Copy rules: plain language, verb first, say what happened and what to do. Never put HTTP codes,
 * endpoints, IDs or stack traces in title/body; raw detail belongs behind a "Details" disclosure on the page.
 * Render once with <ToastStack /> (mounted in App.vue and the standalone viewer).
 */
export type ToastVariant = 'success' | 'info' | 'warning' | 'error'

export const TOAST_TITLE_MAX = 60
export const TOAST_BODY_MAX = 140
export const TOAST_DURATION_MS: Record<ToastVariant, number | null> = {
  success: 5000,
  info: 5000,
  warning: 8000,
  error: null
}

export interface ToastAction {
  label: string
  onAction: () => void
}

export interface ToastInput {
  /** Required, truncated to 60 characters. */
  title: string
  /** Optional, truncated to 140 characters. */
  body?: string
  variant?: ToastVariant
  /** Same key collapses into one toast with a count ("Couldn't save ×3"). Defaults to variant + title. */
  key?: string
  /** One action max: Retry / View / Undo. Dismisses the toast after it runs. */
  action?: ToastAction
  /** Override auto-dismiss in ms; null = sticky. Defaults per variant. */
  duration?: number | null
  /** Accessible name for the × button (localise per call site). Default "Dismiss". */
  dismissLabel?: string
  /**
   * Set when a user action caused the toast and it has an action: focus moves to the action button
   * and returns to the originating control when the toast is dismissed.
   */
  focusAction?: boolean
}

export interface ToastItem {
  id: string
  key: string
  variant: ToastVariant
  title: string
  body: string
  action: ToastAction | null
  dismissLabel: string
  duration: number | null
  count: number
  focusAction: boolean
  /** Bumps when a duplicate collapses in, so the stack can re-announce / re-focus. */
  revision: number
}

interface TimerState {
  timer: ReturnType<typeof setTimeout> | undefined
  startedAt: number
  remaining: number
  holds: Set<string>
  origin: HTMLElement | null
}

export function truncateToastText(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

const state = reactive<{ toasts: ToastItem[] }>({ toasts: [] })
const timers = new Map<string, TimerState>()
let seq = 0

function schedule(id: string) {
  const t = timers.get(id)
  const item = state.toasts.find(toast => toast.id === id)
  if (!t || !item || item.duration === null || t.holds.size > 0) return
  if (t.timer !== undefined) clearTimeout(t.timer)
  t.startedAt = Date.now()
  t.timer = setTimeout(() => dismiss(id), t.remaining)
}

function stop(t: TimerState) {
  if (t.timer !== undefined) {
    clearTimeout(t.timer)
    t.remaining -= Date.now() - t.startedAt
    t.timer = undefined
  }
}

/** Pause auto-dismiss for a reason ('hover' | 'focus'); the timer resumes once every reason is released. */
export function pauseToast(id: string, reason: string) {
  const t = timers.get(id)
  if (!t) return
  stop(t)
  t.holds.add(reason)
}

export function resumeToast(id: string, reason: string) {
  const t = timers.get(id)
  if (!t) return
  t.holds.delete(reason)
  if (t.holds.size === 0 && t.timer === undefined) schedule(id)
}

export function dismiss(id: string) {
  const index = state.toasts.findIndex(toast => toast.id === id)
  if (index === -1) return
  const t = timers.get(id)
  if (t?.timer !== undefined) clearTimeout(t.timer)
  const origin = t?.origin ?? null
  timers.delete(id)
  const focusWasInside =
    typeof document !== 'undefined' &&
    (document.activeElement === document.body ||
      document.activeElement === null ||
      document.activeElement.closest('[data-toast-region]') !== null)
  state.toasts.splice(index, 1)
  if (origin && focusWasInside && origin.isConnected) origin.focus()
}

export function runToastAction(id: string) {
  const item = state.toasts.find(toast => toast.id === id)
  if (!item?.action) return
  const { onAction } = item.action
  dismiss(id)
  onAction()
}

export function clearToasts() {
  for (const id of state.toasts.map(toast => toast.id)) dismiss(id)
}

export function pushToast(input: ToastInput): string {
  const variant = input.variant ?? 'info'
  const title = truncateToastText(input.title, TOAST_TITLE_MAX)
  const key = input.key ?? `${variant}:${title}`
  const duration = input.duration === undefined ? TOAST_DURATION_MS[variant] : input.duration

  const existing = state.toasts.find(toast => toast.key === key)
  if (existing) {
    existing.count += 1
    existing.revision += 1
    existing.body = truncateToastText(input.body ?? existing.body, TOAST_BODY_MAX)
    existing.action = input.action ?? existing.action
    // Newest on top, and the clock restarts so the user sees the repeat.
    state.toasts.splice(state.toasts.indexOf(existing), 1)
    state.toasts.unshift(existing)
    const t = timers.get(existing.id)
    if (t) {
      if (t.timer !== undefined) clearTimeout(t.timer)
      t.timer = undefined
      t.remaining = duration ?? 0
      schedule(existing.id)
    }
    return existing.id
  }

  const id = `toast-${++seq}`
  const item: ToastItem = {
    id,
    key,
    variant,
    title,
    body: input.body ? truncateToastText(input.body, TOAST_BODY_MAX) : '',
    action: input.action ?? null,
    dismissLabel: input.dismissLabel ?? 'Dismiss',
    duration,
    count: 1,
    focusAction: input.focusAction === true && Boolean(input.action),
    revision: 0
  }
  timers.set(id, {
    timer: undefined,
    startedAt: 0,
    remaining: duration ?? 0,
    holds: new Set(),
    origin:
      item.focusAction && typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
  })
  state.toasts.unshift(item)
  schedule(id)
  return id
}

type ToastOptions = Omit<ToastInput, 'title' | 'variant'>

export function useToast() {
  return {
    toasts: readonly(state).toasts,
    push: pushToast,
    success: (title: string, options: ToastOptions = {}) => pushToast({ ...options, title, variant: 'success' }),
    info: (title: string, options: ToastOptions = {}) => pushToast({ ...options, title, variant: 'info' }),
    warning: (title: string, options: ToastOptions = {}) => pushToast({ ...options, title, variant: 'warning' }),
    error: (title: string, options: ToastOptions = {}) => pushToast({ ...options, title, variant: 'error' }),
    dismiss,
    clear: clearToasts,
    pause: pauseToast,
    resume: resumeToast,
    runAction: runToastAction
  }
}
