/** Host-side memory for the graph viewer's collapsed details panel. The viewer itself never touches
 * browser storage (see viewer-sinks.test.ts), so hosts that may persist UI prefs pass this store in. */
export interface ViewerPanelPrefs {
  /** Saved state, or null when the user never chose (the viewer may then pick a width-based default). */
  read: () => boolean | null
  write: (collapsed: boolean) => void
}

export const VIEWER_PANEL_COLLAPSED_KEY = 'atlasmith.viewer.panelCollapsed'

export const localViewerPanelPrefs: ViewerPanelPrefs = {
  read() {
    try {
      const saved = window.localStorage.getItem(VIEWER_PANEL_COLLAPSED_KEY)
      return saved === null ? null : saved === '1'
    } catch {
      return null
    }
  },
  write(collapsed) {
    try {
      window.localStorage.setItem(VIEWER_PANEL_COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      /* storage blocked: the state lasts for this page only */
    }
  }
}
