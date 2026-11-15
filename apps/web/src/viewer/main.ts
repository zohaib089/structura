import { pageTitle } from '../../../../packages/brand/src/brand'
import { createApp, defineComponent, h, shallowRef } from 'vue'
import { resolvePreferredWebLocale, webLocaleDirection } from '../services/locale'
import '../style.css'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import './viewer-base.css'
import { viewerMessages } from './messages'
import ViewerApp from './ViewerApp.vue'
import type { GraphDocument } from './graph-types'
import { buildReportPathSeverityMap } from '../services/scan-report-tree-display'

const locale = resolvePreferredWebLocale(null, navigator.languages)
const theme = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
document.documentElement.lang = locale
document.documentElement.dir = webLocaleDirection(locale)
document.documentElement.dataset.theme = theme
document.title = pageTitle(viewerMessages(locale).title)

// Capture / deep-link override: ?focus=<repo path> starts on that file; &neighborhood=1 shows its
// imports / importers (the file view the editor extension uses) instead of the entry overview.
const params = new URLSearchParams(window.location.search)
const focusPath = params.get('focus')
// &embedded=1 renders the viewer the way the web dashboard embeds it (embedded chrome, label scaling,
// zoom pad) from a local graph.json, so dense real-data graphs can be checked without the API.
const EmbeddedHarness = defineComponent({
  setup() {
    const doc = shallowRef<GraphDocument | null>(null)
    const severity = shallowRef<ReturnType<typeof buildReportPathSeverityMap> | undefined>(undefined)
    // One graph.json, plus optionally a scan report (report.v1, has findings) for severity on the map.
    const onFile = async (event: Event) => {
      const files = [...((event.target as HTMLInputElement).files ?? [])]
      let graph: GraphDocument | null = null
      for (const file of files) {
        const json = JSON.parse(await file.text()) as { nodes?: unknown; findings?: Parameters<typeof buildReportPathSeverityMap>[0] }
        if (Array.isArray(json.nodes)) graph = json as unknown as GraphDocument
        else if (Array.isArray(json.findings)) severity.value = buildReportPathSeverityMap(json.findings)
      }
      if (graph) doc.value = graph
    }
    return () => h('div', { style: 'position:fixed;inset:0;display:flex;flex-direction:column' }, [
      doc.value
        ? h(ViewerApp, { embedded: true, shellTheme: theme, graphDocument: doc.value, focusPath, openInspectorOnFocus: false, fileNeighborhood: params.get('neighborhood') === '1', pathSeverityCounts: severity.value, style: 'flex:1;min-block-size:0' })
        : h('input', { type: 'file', accept: 'application/json', multiple: true, 'data-testid': 'file-input', onChange: onFile })
    ])
  }
})
if (params.get('embedded') === '1') createApp(EmbeddedHarness).mount('#app')
else createApp(ViewerApp, focusPath
  ? { focusPath, fileNeighborhood: params.get('neighborhood') === '1', openInspectorOnFocus: false }
  : {}).mount('#app')
