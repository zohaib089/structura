import { pageTitle } from '../../../../packages/brand/src/brand'
import { createApp } from 'vue'
import { resolvePreferredWebLocale, webLocaleDirection } from '../services/locale'
import '../style.css'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import './viewer-base.css'
import { viewerMessages } from './messages'
import ViewerApp from './ViewerApp.vue'

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
createApp(ViewerApp, focusPath
  ? { focusPath, fileNeighborhood: params.get('neighborhood') === '1', openInspectorOnFocus: false }
  : {}).mount('#app')
