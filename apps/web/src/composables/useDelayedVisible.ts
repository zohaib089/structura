import { onScopeDispose, ref, watch, type Ref } from 'vue'

export interface DelayedVisibleOptions {
  /** Do not show before this many ms of continuous activity (avoids flicker). Default 200. */
  delay?: number
  /** Once shown, stay visible at least this many ms. Default 400. */
  minVisible?: number
}

export const LOADER_DELAY_MS = 200
export const LOADER_MIN_VISIBLE_MS = 400

/**
 * Flicker-free visibility for loaders: `active` must stay true for `delay` ms before
 * `visible` flips on, and once visible it stays on for at least `minVisible` ms.
 */
export function useDelayedVisible(
  active: Ref<boolean>,
  options: DelayedVisibleOptions = {}
): Ref<boolean> {
  const delay = options.delay ?? LOADER_DELAY_MS
  const minVisible = options.minVisible ?? LOADER_MIN_VISIBLE_MS
  const visible = ref(false)
  let showTimer: ReturnType<typeof setTimeout> | undefined
  let hideTimer: ReturnType<typeof setTimeout> | undefined
  let shownAt = 0

  function clearTimers() {
    if (showTimer !== undefined) clearTimeout(showTimer)
    if (hideTimer !== undefined) clearTimeout(hideTimer)
    showTimer = undefined
    hideTimer = undefined
  }

  function show() {
    visible.value = true
    shownAt = Date.now()
  }

  function onActive(isActive: boolean) {
    if (isActive) {
      // Re-activated while waiting out the minimum: stay visible, cancel the pending hide.
      if (hideTimer !== undefined) {
        clearTimeout(hideTimer)
        hideTimer = undefined
      }
      if (visible.value || showTimer !== undefined) return
      if (delay <= 0) return show()
      showTimer = setTimeout(() => {
        showTimer = undefined
        show()
      }, delay)
      return
    }
    if (showTimer !== undefined) {
      clearTimeout(showTimer)
      showTimer = undefined
    }
    if (!visible.value || hideTimer !== undefined) return
    const remaining = minVisible - (Date.now() - shownAt)
    if (remaining <= 0) {
      visible.value = false
      return
    }
    hideTimer = setTimeout(() => {
      hideTimer = undefined
      visible.value = false
    }, remaining)
  }

  watch(active, onActive, { immediate: true })
  onScopeDispose(clearTimers)
  return visible
}
