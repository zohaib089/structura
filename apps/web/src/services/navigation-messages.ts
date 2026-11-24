import type { WebLocale } from './locale'

export interface NavigationMessages {
  home: string
  language: string
  toggleTheme: string
  /** Accessible name for the dashboard drawer close button. */
  closeMenu: string
  /** Brand tagline shown on the sign-in brand panel. */
  brandTagline: string
  logIn: string
  logOut: string
  launchApp: string
}

/**
 * Shared shell chrome for every supported locale.
 */
const messages: Record<WebLocale, NavigationMessages> = {
  en: {
    home: 'Go back home',
    language: 'Language',
    toggleTheme: 'Toggle theme',
    closeMenu: 'Close menu',
    brandTagline: 'Your architecture, owned and verified.',
    logIn: 'Log in',
    logOut: 'Log out',
    launchApp: 'Launch app',
  },
  pt: {
    home: 'Voltar ao início',
    language: 'Idioma',
    toggleTheme: 'Alternar tema',
    closeMenu: 'Fechar menu',
    brandTagline: 'A sua arquitetura, sob o seu controlo e verificada.',
    logIn: 'Entrar',
    logOut: 'Sair',
    launchApp: 'Abrir aplicativo',
  },
  it: {
    home: 'Torna alla pagina iniziale',
    language: 'Lingua',
    toggleTheme: 'Cambia tema',
    closeMenu: 'Chiudi menu',
    brandTagline: 'La tua architettura, sotto il tuo controllo e verificata.',
    logIn: 'Accedi',
    logOut: 'Esci',
    launchApp: 'Apri app',
  },
  fr: {
    home: 'Retour à l’accueil',
    language: 'Langue',
    toggleTheme: 'Changer de thème',
    closeMenu: 'Fermer le menu',
    brandTagline: 'Votre architecture, maîtrisée et vérifiée.',
    logIn: 'Connexion',
    logOut: 'Déconnexion',
    launchApp: 'Ouvrir l’application',
  },
  nl: {
    home: 'Terug naar home',
    language: 'Taal',
    toggleTheme: 'Thema wisselen',
    closeMenu: 'Menu sluiten',
    brandTagline: 'Je architectuur, in eigen beheer en geverifieerd.',
    logIn: 'Inloggen',
    logOut: 'Uitloggen',
    launchApp: 'App openen',
  },
  es: {
    home: 'Volver al inicio',
    language: 'Idioma',
    toggleTheme: 'Cambiar tema',
    closeMenu: 'Cerrar menú',
    brandTagline: 'Tu arquitectura, bajo tu control y verificada.',
    logIn: 'Iniciar sesión',
    logOut: 'Cerrar sesión',
    launchApp: 'Abrir aplicación',
  },
  ja: {
    home: 'ホームに戻る',
    language: '言語',
    toggleTheme: 'テーマを切り替え',
    closeMenu: 'メニューを閉じる',
    brandTagline: 'あなたのアーキテクチャを、自分の手で、確かな根拠とともに。',
    logIn: 'ログイン',
    logOut: 'ログアウト',
    launchApp: 'アプリを開く',
  },
  'zh-Hans': {
    home: '返回首页',
    language: '语言',
    toggleTheme: '切换主题',
    closeMenu: '关闭菜单',
    brandTagline: '你的架构，自主掌控，有据可查。',
    logIn: '登录',
    logOut: '退出登录',
    launchApp: '打开应用',
  },
  hi: {
    home: 'मुखपृष्ठ पर वापस जाएँ',
    language: 'भाषा',
    toggleTheme: 'थीम बदलें',
    closeMenu: 'मेनू बंद करें',
    brandTagline: 'आपका आर्किटेक्चर, आपके नियंत्रण में और सत्यापित।',
    logIn: 'लॉग इन करें',
    logOut: 'लॉग आउट करें',
    launchApp: 'ऐप खोलें',
  },
  ur: {
    home: 'صفحۂ اول پر واپس جائیں',
    language: 'زبان',
    toggleTheme: 'تھیم تبدیل کریں',
    closeMenu: 'مینو بند کریں',
    brandTagline: 'آپ کا آرکیٹیکچر، آپ کے اختیار میں اور تصدیق شدہ۔',
    logIn: 'لاگ اِن',
    logOut: 'لاگ آؤٹ',
    launchApp: 'ایپ کھولیں',
  }
}

export function navigationMessages(locale: WebLocale): NavigationMessages {
  return messages[locale]
}
