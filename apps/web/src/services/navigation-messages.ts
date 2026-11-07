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
  /** Accessible name for the dashboard drawer close button. */
  closeMenu: string
  /** Brand tagline shown on the sign-in brand panel. */
  brandTagline: string
  logIn: string
  logOut: string
  launchApp: string
  dashboard: string
  docs: string
  github: string
}

/**
 * New landing labels are English in every locale until they are translated.
 * Existing labels stay in the locale that already had them.
 */
const messages: Record<WebLocale, Omit<NavigationMessages, 'docs' | 'github'>> = {
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
    closeMenu: 'Close menu',
    brandTagline: 'Your architecture, owned and verified.',
    logIn: 'Log in',
    logOut: 'Log out',
    launchApp: 'Launch app',
    dashboard: 'Dashboard'
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
    closeMenu: 'Fechar menu',
    brandTagline: 'A sua arquitetura, sob o seu controlo e verificada.',
    logIn: 'Entrar',
    logOut: 'Sair',
    launchApp: 'Abrir aplicativo',
    dashboard: 'Painel'
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
    closeMenu: 'Chiudi menu',
    brandTagline: 'La tua architettura, sotto il tuo controllo e verificata.',
    logIn: 'Accedi',
    logOut: 'Esci',
    launchApp: 'Apri app',
    dashboard: 'Dashboard'
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
    closeMenu: 'Fermer le menu',
    brandTagline: 'Votre architecture, maîtrisée et vérifiée.',
    logIn: 'Connexion',
    logOut: 'Déconnexion',
    launchApp: 'Ouvrir l’application',
    dashboard: 'Tableau de bord'
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
    closeMenu: 'Menu sluiten',
    brandTagline: 'Je architectuur, in eigen beheer en geverifieerd.',
    logIn: 'Inloggen',
    logOut: 'Uitloggen',
    launchApp: 'App openen',
    dashboard: 'Dashboard'
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
    closeMenu: 'Cerrar menú',
    brandTagline: 'Tu arquitectura, bajo tu control y verificada.',
    logIn: 'Iniciar sesión',
    logOut: 'Cerrar sesión',
    launchApp: 'Abrir aplicación',
    dashboard: 'Panel'
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
    closeMenu: 'メニューを閉じる',
    brandTagline: 'あなたのアーキテクチャを、自分の手で、確かな根拠とともに。',
    logIn: 'ログイン',
    logOut: 'ログアウト',
    launchApp: 'アプリを開く',
    dashboard: 'ダッシュボード'
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
    closeMenu: '关闭菜单',
    brandTagline: '你的架构，自主掌控，有据可查。',
    logIn: '登录',
    logOut: '退出登录',
    launchApp: '打开应用',
    dashboard: '仪表盘'
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
    closeMenu: 'मेनू बंद करें',
    brandTagline: 'आपका आर्किटेक्चर, आपके नियंत्रण में और सत्यापित।',
    logIn: 'लॉग इन करें',
    logOut: 'लॉग आउट करें',
    launchApp: 'ऐप खोलें',
    dashboard: 'डैशबोर्ड'
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
    closeMenu: 'مینو بند کریں',
    brandTagline: 'آپ کا آرکیٹیکچر، آپ کے اختیار میں اور تصدیق شدہ۔',
    logIn: 'لاگ اِن',
    logOut: 'لاگ آؤٹ',
    launchApp: 'ایپ کھولیں',
    dashboard: 'ڈیش بورڈ'
  }
}

export function navigationMessages(locale: WebLocale): NavigationMessages {
  return { ...messages[locale], docs: 'Docs', github: 'GitHub' }
}
