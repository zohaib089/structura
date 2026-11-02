/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HOSTED_APP?: string
  readonly VITE_VIEWER_BOOT_SAMPLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}