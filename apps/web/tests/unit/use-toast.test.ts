import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TOAST_BODY_MAX,
  TOAST_TITLE_MAX,
  truncateToastText,
  useToast
} from '../../src/composables/useToast'

const toast = useToast()

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  toast.clear()
  vi.useRealTimers()
})

describe('useToast', () => {
  it.each([
    ['success', 5000],
    ['info', 5000],
    ['warning', 8000]
  ] as const)('auto-dismisses %s after %dms', (variant, ms) => {
    toast.push({ title: 'Done', variant })
    vi.advanceTimersByTime(ms - 1)
    expect(toast.toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toast.toasts).toHaveLength(0)
  })

  it('keeps error toasts until dismissed', () => {
    const id = toast.error("Couldn't save")
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(toast.toasts).toHaveLength(1)
    toast.dismiss(id)
    expect(toast.toasts).toHaveLength(0)
  })

  it('pauses on hover/focus and resumes with the remaining time', () => {
    const id = toast.success('Project created')
    vi.advanceTimersByTime(3000)
    toast.pause(id, 'hover')
    toast.pause(id, 'focus')
    vi.advanceTimersByTime(60_000)
    expect(toast.toasts).toHaveLength(1)
    toast.resume(id, 'hover')
    vi.advanceTimersByTime(60_000)
    expect(toast.toasts).toHaveLength(1) // focus still holds it
    toast.resume(id, 'focus')
    vi.advanceTimersByTime(1999)
    expect(toast.toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toast.toasts).toHaveLength(0)
  })

  it('puts the newest toast on top', () => {
    toast.info('First')
    toast.info('Second')
    expect(toast.toasts.map(t => t.title)).toEqual(['Second', 'First'])
  })

  it('collapses duplicates into a count, moves them to the top and restarts the timer', () => {
    toast.error("Couldn't save")
    toast.info('Other')
    toast.error("Couldn't save")
    toast.error("Couldn't save")
    expect(toast.toasts).toHaveLength(2)
    expect(toast.toasts[0]).toMatchObject({ title: "Couldn't save", count: 3 })

    toast.success('Saved')
    vi.advanceTimersByTime(4000)
    toast.success('Saved')
    vi.advanceTimersByTime(4000)
    expect(toast.toasts.find(t => t.title === 'Saved')).toBeDefined()
    vi.advanceTimersByTime(1000)
    expect(toast.toasts.find(t => t.title === 'Saved')).toBeUndefined()
  })

  it('truncates title to 60 and body to 140 characters', () => {
    toast.info('t'.repeat(100), { body: 'b'.repeat(300) })
    expect(toast.toasts[0]?.title).toHaveLength(TOAST_TITLE_MAX)
    expect(toast.toasts[0]?.body).toHaveLength(TOAST_BODY_MAX)
    expect(truncateToastText('short', 10)).toBe('short')
  })

  it('runs the single action and dismisses the toast', () => {
    const onAction = vi.fn()
    const id = toast.error("Couldn't save", { action: { label: 'Retry', onAction } })
    toast.runAction(id)
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(toast.toasts).toHaveLength(0)
  })

  it('returns focus to the originating control when a focused-action toast is dismissed', () => {
    const origin = document.createElement('button')
    document.body.append(origin)
    origin.focus()
    const id = toast.warning('Project archived', {
      action: { label: 'Undo', onAction: () => {} },
      focusAction: true
    })
    origin.blur()
    toast.dismiss(id)
    expect(document.activeElement).toBe(origin)
    origin.remove()
  })
})
