import { createApp } from 'vue'
import '../../../apps/web/src/style.css'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '../../../apps/web/src/viewer/viewer-base.css'
import ExtensionApp from './ExtensionApp.vue'

document.documentElement.lang = 'en'
document.documentElement.dataset.theme = document.body.classList.contains('vscode-light') ? 'light' : 'dark'

createApp(ExtensionApp).mount('#app')
