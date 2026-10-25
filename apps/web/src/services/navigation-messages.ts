import type { WebLocale } from './locale'

export interface NavigationMessages {
  mainNavigation: string
  home: string
  whatIsIt: string
  howItWorks: string
  services: string
  reviews: string
  contact: string
  language: string
  toggleTheme: string
  logIn: string
  logOut: string
  launchApp: string
}

const messages: Record<WebLocale, NavigationMessages> = {
  en: {
    mainNavigation: 'Main navigation',
    home: 'Go back home',
    whatIsIt: 'What is it',
    howItWorks: 'How it works',
    services: 'Services',
    reviews: 'Reviews',
    contact: 'Contact',
    language: 'Language',
    toggleTheme: 'Toggle theme',
    logIn: 'Log in',
    logOut: 'Log out',
    launchApp: 'Launch app'
  },
  pt: {
    mainNavigation: 'Navegação principal',
    home: 'Voltar ao início',
    whatIsIt: 'O que é',
    howItWorks: 'Como funciona',
    services: 'Serviços',
    reviews: 'Avaliações',
    contact: 'Contato',
    language: 'Idioma',
    toggleTheme: 'Alternar tema',
    logIn: 'Entrar',
    logOut: 'Sair',
    launchApp: 'Abrir aplicativo'
  },
  it: {
    mainNavigation: 'Navigazione principale',
    home: 'Torna alla pagina iniziale',
    whatIsIt: 'Che cos’è',
    howItWorks: 'Come funziona',
    services: 'Servizi',
    reviews: 'Recensioni',
    contact: 'Contatti',
    language: 'Lingua',
    toggleTheme: 'Cambia tema',
    logIn: 'Accedi',
    logOut: 'Esci',
    launchApp: 'Apri app'
  },
  fr: {
    mainNavigation: 'Navigation principale',
    home: 'Retour à l’accueil',
    whatIsIt: 'Présentation',
    howItWorks: 'Fonctionnement',
    services: 'Services',
    reviews: 'Avis',
    contact: 'Contact',
    language: 'Langue',
    toggleTheme: 'Changer de thème',
    logIn: 'Connexion',
    logOut: 'Déconnexion',
    launchApp: 'Ouvrir l’application'
  },
  nl: {
    mainNavigation: 'Hoofdnavigatie',
    home: 'Terug naar home',
    whatIsIt: 'Wat is het',
    howItWorks: 'Hoe het werkt',
    services: 'Diensten',
    reviews: 'Beoordelingen',
    contact: 'Contact',
    language: 'Taal',
    toggleTheme: 'Thema wisselen',
    logIn: 'Inloggen',
    logOut: 'Uitloggen',
    launchApp: 'App openen'
  },
  es: {
    mainNavigation: 'Navegación principal',
    home: 'Volver al inicio',
    whatIsIt: 'Qué es',
    howItWorks: 'Cómo funciona',
    services: 'Servicios',
    reviews: 'Opiniones',
    contact: 'Contacto',
    language: 'Idioma',
    toggleTheme: 'Cambiar tema',
    logIn: 'Iniciar sesión',
    logOut: 'Cerrar sesión',
    launchApp: 'Abrir aplicación'
  },
  ja: {
    mainNavigation: 'メインナビゲーション',
    home: 'ホームに戻る',
    whatIsIt: 'サービスについて',
    howItWorks: '使い方',
    services: 'サービス',
    reviews: 'レビュー',
    contact: 'お問い合わせ',
    language: '言語',
    toggleTheme: 'テーマを切り替え',
    logIn: 'ログイン',
    logOut: 'ログアウト',
    launchApp: 'アプリを開く'
  },
  'zh-Hans': {
    mainNavigation: '主导航',
    home: '返回首页',
    whatIsIt: '产品介绍',
    howItWorks: '工作原理',
    services: '服务',
    reviews: '评价',
    contact: '联系',
    language: '语言',
    toggleTheme: '切换主题',
    logIn: '登录',
    logOut: '退出登录',
    launchApp: '打开应用'
  },
  hi: {
    mainNavigation: 'मुख्य नेविगेशन',
    home: 'मुखपृष्ठ पर वापस जाएँ',
    whatIsIt: 'यह क्या है',
    howItWorks: 'यह कैसे काम करता है',
    services: 'सेवाएँ',
    reviews: 'समीक्षाएँ',
    contact: 'संपर्क करें',
    language: 'भाषा',
    toggleTheme: 'थीम बदलें',
    logIn: 'लॉग इन करें',
    logOut: 'लॉग आउट करें',
    launchApp: 'ऐप खोलें'
  },
  ur: {
    mainNavigation: 'مرکزی نیویگیشن',
    home: 'صفحۂ اول پر واپس جائیں',
    whatIsIt: 'یہ کیا ہے',
    howItWorks: 'یہ کیسے کام کرتا ہے',
    services: 'خدمات',
    reviews: 'جائزے',
    contact: 'رابطہ',
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
