import type { WebLocale } from './locale'

export interface NavigationMessages {
  mainNavigation: string
  home: string
  honest: string
  howItWorks: string
  coverage: string
  drift: string
  quickstart: string
  language: string
  toggleTheme: string
  logIn: string
  logOut: string
  launchApp: string
}

/**
 * New landing labels are English in every locale until they are translated.
 * Existing labels stay in the locale that already had them.
 */
const messages: Record<WebLocale, NavigationMessages> = {
  en: {
    mainNavigation: 'Main navigation',
    home: 'Go back home',
    honest: 'Edges',
    howItWorks: 'How it works',
    coverage: 'Coverage',
    drift: 'Drift',
    quickstart: 'Quickstart',
    language: 'Language',
    toggleTheme: 'Toggle theme',
    logIn: 'Log in',
    logOut: 'Log out',
    launchApp: 'Launch app'
  },
  pt: {
    mainNavigation: 'Navegação principal',
    home: 'Voltar ao início',
    honest: 'Edges',
    howItWorks: 'Como funciona',
    coverage: 'Coverage',
    drift: 'Drift',
    quickstart: 'Quickstart',
    language: 'Idioma',
    toggleTheme: 'Alternar tema',
    logIn: 'Entrar',
    logOut: 'Sair',
    launchApp: 'Abrir aplicativo'
  },
  it: {
    mainNavigation: 'Navigazione principale',
    home: 'Torna alla pagina iniziale',
    honest: 'Edges',
    howItWorks: 'Come funziona',
    coverage: 'Coverage',
    drift: 'Drift',
    quickstart: 'Quickstart',
    language: 'Lingua',
    toggleTheme: 'Cambia tema',
    logIn: 'Accedi',
    logOut: 'Esci',
    launchApp: 'Apri app'
  },
  fr: {
    mainNavigation: 'Navigation principale',
    home: 'Retour à l’accueil',
    honest: 'Edges',
    howItWorks: 'Fonctionnement',
    coverage: 'Coverage',
    drift: 'Drift',
    quickstart: 'Quickstart',
    language: 'Langue',
    toggleTheme: 'Changer de thème',
    logIn: 'Connexion',
    logOut: 'Déconnexion',
    launchApp: 'Ouvrir l’application'
  },
  nl: {
    mainNavigation: 'Hoofdnavigatie',
    home: 'Terug naar home',
    honest: 'Edges',
    howItWorks: 'Hoe het werkt',
    coverage: 'Coverage',
    drift: 'Drift',
    quickstart: 'Quickstart',
    language: 'Taal',
    toggleTheme: 'Thema wisselen',
    logIn: 'Inloggen',
    logOut: 'Uitloggen',
    launchApp: 'App openen'
  },
  es: {
    mainNavigation: 'Navegación principal',
    home: 'Volver al inicio',
    honest: 'Edges',
    howItWorks: 'Cómo funciona',
    coverage: 'Coverage',
    drift: 'Drift',
    quickstart: 'Quickstart',
    language: 'Idioma',
    toggleTheme: 'Cambiar tema',
    logIn: 'Iniciar sesión',
    logOut: 'Cerrar sesión',
    launchApp: 'Abrir aplicación'
  },
  ja: {
    mainNavigation: 'メインナビゲーション',
    home: 'ホームに戻る',
    honest: 'Edges',
    howItWorks: '使い方',
    coverage: 'Coverage',
    drift: 'Drift',
    quickstart: 'Quickstart',
    language: '言語',
    toggleTheme: 'テーマを切り替え',
    logIn: 'ログイン',
    logOut: 'ログアウト',
    launchApp: 'アプリを開く'
  },
  'zh-Hans': {
    mainNavigation: '主导航',
    home: '返回首页',
    honest: 'Edges',
    howItWorks: '工作原理',
    coverage: 'Coverage',
    drift: 'Drift',
    quickstart: 'Quickstart',
    language: '语言',
    toggleTheme: '切换主题',
    logIn: '登录',
    logOut: '退出登录',
    launchApp: '打开应用'
  },
  hi: {
    mainNavigation: 'मुख्य नेविगेशन',
    home: 'मुखपृष्ठ पर वापस जाएँ',
    honest: 'Edges',
    howItWorks: 'यह कैसे काम करता है',
    coverage: 'Coverage',
    drift: 'Drift',
    quickstart: 'Quickstart',
    language: 'भाषा',
    toggleTheme: 'थीम बदलें',
    logIn: 'लॉग इन करें',
    logOut: 'लॉग आउट करें',
    launchApp: 'ऐप खोलें'
  },
  ur: {
    mainNavigation: 'مرکزی نیویگیشن',
    home: 'صفحۂ اول پر واپس جائیں',
    honest: 'Edges',
    howItWorks: 'یہ کیسے کام کرتا ہے',
    coverage: 'Coverage',
    drift: 'Drift',
    quickstart: 'Quickstart',
    language: 'زبان',
    toggleTheme: 'تھیم تبدیل کریں',
    logIn: 'لاگ اِن',
    logOut: 'لاگ آؤٹ',
    launchApp: 'ایپ کھولیں'
  }
}

export function navigationMessages(locale: WebLocale): NavigationMessages {
  return messages[locale]
}
