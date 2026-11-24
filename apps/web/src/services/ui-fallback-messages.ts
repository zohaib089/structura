import { isSupportedWebLocale, type WebLocale } from './locale'

type FallbackKey = 'loading' | 'loadingEllipsis' | 'loadingReport' | 'loadingGraph' | 'tips' | 'breadcrumb'

const messages: Record<WebLocale, Record<FallbackKey, string>> = {
  en: { loading: 'Loading', loadingEllipsis: 'Loading…', loadingReport: 'Loading report', loadingGraph: 'Loading graph', tips: 'Tips', breadcrumb: 'Breadcrumb' },
  pt: { loading: 'A carregar', loadingEllipsis: 'A carregar…', loadingReport: 'A carregar o relatório', loadingGraph: 'A carregar o grafo', tips: 'Dicas', breadcrumb: 'Caminho de navegação' },
  it: { loading: 'Caricamento', loadingEllipsis: 'Caricamento…', loadingReport: 'Caricamento del report', loadingGraph: 'Caricamento del grafo', tips: 'Suggerimenti', breadcrumb: 'Percorso di navigazione' },
  fr: { loading: 'Chargement', loadingEllipsis: 'Chargement…', loadingReport: 'Chargement du rapport', loadingGraph: 'Chargement du graphe', tips: 'Conseils', breadcrumb: 'Fil d’Ariane' },
  nl: { loading: 'Laden', loadingEllipsis: 'Laden…', loadingReport: 'Rapport laden', loadingGraph: 'Grafiek laden', tips: 'Tips', breadcrumb: 'Navigatiepad' },
  es: { loading: 'Cargando', loadingEllipsis: 'Cargando…', loadingReport: 'Cargando el informe', loadingGraph: 'Cargando el grafo', tips: 'Consejos', breadcrumb: 'Ruta de navegación' },
  ja: { loading: '読み込み中', loadingEllipsis: '読み込み中…', loadingReport: 'レポートを読み込み中', loadingGraph: 'グラフを読み込み中', tips: 'ヒント', breadcrumb: 'パンくずリスト' },
  'zh-Hans': { loading: '加载中', loadingEllipsis: '加载中…', loadingReport: '正在加载报告', loadingGraph: '正在加载关系图', tips: '提示', breadcrumb: '面包屑导航' },
  hi: { loading: 'लोड हो रहा है', loadingEllipsis: 'लोड हो रहा है…', loadingReport: 'रिपोर्ट लोड हो रही है', loadingGraph: 'ग्राफ़ लोड हो रहा है', tips: 'सुझाव', breadcrumb: 'नेविगेशन पथ' },
  ur: { loading: 'لوڈ ہو رہا ہے', loadingEllipsis: 'لوڈ ہو رہا ہے…', loadingReport: 'رپورٹ لوڈ ہو رہی ہے', loadingGraph: 'گراف لوڈ ہو رہا ہے', tips: 'تجاویز', breadcrumb: 'صفحے کا راستہ' }
}

export function uiFallbackMessage(key: FallbackKey, locale?: string): string {
  const fromDoc = typeof document !== 'undefined' ? document.documentElement.lang : ''
  const raw = locale || fromDoc || 'en'
  const tag = isSupportedWebLocale(raw) ? raw : 'en'
  return messages[tag][key]
}
