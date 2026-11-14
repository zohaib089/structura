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
    const onFile = async (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file) doc.value = JSON.parse(await file.text()) as GraphDocument
    }
    return () => h('div', { style: 'position:fixed;inset:0;display:flex;flex-direction:column' }, [
      doc.value
        ? h(ViewerApp, { embedded: true, shellTheme: theme, graphDocument: doc.value, focusPath, openInspectorOnFocus: false, fileNeighborhood: params.get('neighborhood') === '1', style: 'flex:1;min-block-size:0' })
        : h('input', { type: 'file', accept: 'application/json', 'data-testid': 'file-input', onChange: onFile })
    ])
  }
})
if (params.get('embedded') === '1') createApp(EmbeddedHarness).mount('#app')
else createApp(ViewerApp, focusPath
  ? { focusPath, fileNeighborhood: params.get('neighborhood') === '1', openInspectorOnFocus: false }
  : {}).mount('#app')
