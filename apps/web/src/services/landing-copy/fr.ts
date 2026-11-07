import type { LandingStrings } from './types'

export const fr: LandingStrings = {
  documentTitle: '{name} \u2014 Voyez comment votre code s\u2019articule, et ce qui est risqué',
  metaDescription: '{name} transforme un projet sur votre machine en carte en anneaux autour de ses vrais points d\u2019entrée. Sans compte. Rien n\u2019est envoyé pour consulter un graphe.',
  skipLink: 'Aller au contenu',
  homeLabel: 'Accueil {name}',
  nav: { label: 'Principal', product: 'Produit', how: 'Fonctionnement', docs: 'Documentation', githubLabel: '{name} sur GitHub' },
  cta: { viewer: 'Essayer la visionneuse', selfHost: 'Auto-héberger', scan: 'Analyser un projet', projects: 'Voir vos projets', selfHostGuide: 'Guide d\u2019auto-hébergement' },
  hero: {
    eyebrow: '{name} \u00b7 local d\u2019abord',
    titleLead: 'Voyez comment votre code s\u2019articule \u2014 ',
    titleEmphasis: 'et ce qui est risqué.',
    leadBefore: '{name} transforme un projet sur votre machine en ',
    leadMap: 'carte en anneaux',
    leadMiddle: ' autour de ses vrais points de départ. ',
    leadNoAccount: 'Sans compte. Rien n\u2019est envoyé',
    leadAfter: ' pour consulter un graphe.',
    scanPrompt: 'Un projet sous la main ? ',
    graphTitle: 'Exemple de carte d\u2019un projet, dessinée en anneaux autour de son fichier d\u2019entrée',
    legendLabel: 'Comment lire les lignes',
    sampleTag: 'Données d\u2019exemple \u2014 un projet fictif',
    inspectDefaultTitle: 'main.ts \u2014 là où le projet démarre',
    inspectDefaultBody: 'Survolez un fichier ou atteignez-le avec Tab pour voir ses liens. Les anneaux indiquent la distance depuis le départ.',
    inspectEntryBody: 'Tout le reste se mesure en étapes à partir d\u2019ici.',
    inspectEntryLabel: 'Point d\u2019entrée',
    entryTag: 'POINT D\u2019ENTRÉE',
    graphListLabel: 'Fichiers de la carte d\u2019exemple',
    graphTextIntro:
      'Version texte de la carte d\u2019exemple. Le fichier de départ main.ts est au centre. L\u2019anneau 1 contient 8 fichiers que main.ts utilise directement. L\u2019anneau 2 contient 12 fichiers atteints par ceux-ci. L\u2019anneau 3 en contient 10 de plus. Chaque fichier affiche son problème le plus grave avec une icône et un mot. Les lignes sont pleines quand le lien est trouvé dans le code, en tirets quand il est probable, et en pointillés quand il n\u2019a pas pu être confirmé.'
  },
  steps: { one: '{n} étape', other: '{n} étapes' },
  a11y: { node: '{label}, à {steps} du départ. {link}. {issue}', noIssues: 'Aucun problème trouvé.', issue: 'Problème {severity}', issueSentence: 'Problème {severity}.', inspectSteps: 'à {steps} de {start}', inspectLink: 'lien :' },
  proof: {
    label: 'En bref',
    items: [
      ['Fonctionne sur votre machine', 'Votre code reste là où il est.'],
      ['Aucun compte pour consulter', 'Ouvrez un fichier de graphe et explorez.'],
      ['TypeScript et JavaScript pour l\u2019instant', 'Les autres langages sont listés comme ignorés, pas cachés.'],
      ['Chaque lien dit comment il a été trouvé', 'Trouvé dans le code, probable ou non confirmé.']
    ]
  },
  how: {
    kicker: 'Fonctionnement',
    title: 'Trois étapes, du dossier à la carte.',
    lead: 'Indiquez un projet à {name}, laissez-le lire les fichiers, puis explorez le résultat. Vous suivez la progression en direct.',
    step: 'ÉTAPE',
    steps: [
      ['Choisissez un projet', 'Un dossier, un fichier zip ou un lien Git. {name} le vérifie d\u2019abord et vous prévient si quelque chose est trop volumineux.'],
      ['{name} le lit', 'Il suit chaque import, note son degré de certitude pour chaque lien et repère les zones à risque en chemin.'],
      ['Lisez la carte et le rapport', 'Partez du fichier d\u2019entrée et avancez vers l\u2019extérieur. Le rapport indique quoi regarder en premier, en termes simples.']
    ],
    sources: ['Dossier', 'Zip', 'Lien Git'],
    checking: { before: 'Vérification de ', files: '1 240 fichiers', middle: '\u2026 en ignorant ' },
    loaderLabel: 'Analyse du code',
    initialStatus: 'Analyseur en cours (3 sur 7)',
    runScan: 'Lancer une analyse d\u2019exemple',
    previewToasts: 'Aperçu des notifications',
    phases: [
      ['Préparation des fichiers', 'Vérification de 1 240 fichiers\u2026'],
      ['Analyse du code', 'Analyseur en cours (3 sur 7)'],
      ['Analyse du code', 'Analyseur en cours (7 sur 7)'],
      ['Création du rapport', 'Regroupement des résultats\u2026']
    ],
    finished: ['Analyse terminée', '142 fichiers sur 150 vérifiés'],
    findingsLabel: 'Exemples de résultats',
    findings: ['Lien circulaire entre deux fichiers centraux', 'Une page accède directement à la couche base de données', 'Fichier avec de nombreux liens entrants']
  },
  toasts: {
    sampleLoaded: 'Projet d\u2019exemple chargé',
    scanStarted: 'Analyse lancée',
    scanFinished: 'Analyse terminée',
    scanFinishedBody: '142 fichiers cartographiés \u00b7 2 liens à vérifier',
    viewMap: 'Voir la carte',
    previewInfo: 'Exemple chargé',
    previewInfoBody: 'main.ts est le point de départ.',
    previewWarning: '2 liens que nous n\u2019avons pas pu suivre',
    previewWarningBody: 'Ils sont listés dans la couverture.',
    previewError: 'Impossible de lire un dossier',
    previewErrorBody: 'Vérifiez les autorisations, puis réessayez.',
    retry: 'Réessayer'
  },
  connections: {
    kicker: 'Comment chaque lien a été trouvé',
    title: 'Chaque connexion est étiquetée.',
    lead: 'Certains liens sont certains. D\u2019autres sont de bonnes déductions. Certains n\u2019ont pas pu être suivis. {name} vous dit lesquels, dans la ligne elle-même et dans le texte à côté.',
    lines: ['ligne pleine', 'ligne en tirets', 'ligne en pointillés'],
    rows: [
      ['Trouvé dans le code', 'C\u2019est écrit noir sur blanc, comme un import direct. On ne peut pas être plus sûr.'],
      ['Probable', 'Pas écrit directement, mais le motif y mène \u2014 par exemple un fichier choisi par une règle de nommage.'],
      ['Non confirmé', 'Nous avons vu un lien sans pouvoir dire où il mène. Il est listé pour que vous le vérifiiez \u2014 jamais supprimé.']
    ]
  },
  coverage: {
    kicker: 'Couverture',
    title: 'Rien n\u2019est ignoré en silence.',
    lead: 'Chaque analyse indique ce qu\u2019elle a vérifié et ce qu\u2019elle n\u2019a pas vérifié : un résultat propre ne cache jamais d\u2019angle mort.',
    note: 'Chiffres illustratifs tirés du projet d\u2019exemple.',
    statValue: '142 sur 150',
    statLabel: 'fichiers vérifiés \u00b7 95 %',
    barLabel: '142 fichiers sur 150 vérifiés ; 8 ignorés',
    rows: [
      ['Fichiers dans un langage pas encore pris en charge ', '(Python, Go)', '6 fichiers'],
      ['Liens que nous n\u2019avons pas pu suivre ', '(calculés à l\u2019exécution)', '2 liens'],
      ['Fichiers que vous avez demandé d\u2019ignorer ', '(p. ex. node_modules)', 'listés']
    ]
  },
  selfHost: {
    kicker: 'Auto-hébergement',
    title: 'Exécutez-le sur votre ordinateur ou votre serveur.',
    lead: '{name} fonctionne d\u2019abord en local. Hébergez-le vous-même : votre code ne quitte jamais votre réseau.',
    bullets: ['Fonctionne avec Docker Compose', 'Vous gardez vos données et vos règles d\u2019accès', 'Le code source est sur GitHub'],
    terminalLabel: 'Exemple de commandes de démarrage',
    terminalBadge: 'Illustratif',
    comments: ['# 1. récupérer {name}', '# 2. le démarrer', '# 3. l\u2019ouvrir']
  },
  closing: { title: 'Prêt à voir votre projet sous forme de carte ?', lead: 'Essayez d\u2019abord un exemple dans votre navigateur, ou hébergez-le vous-même.' },
  footer: { label: 'Pied de page', docs: 'Documentation', selfHost: 'Auto-héberger' },
  severity: { critical: 'Critique', high: 'Élevé', medium: 'Moyen', low: 'Faible', info: 'Aucun problème' },
  linkKind: { extracted: 'Trouvé dans le code', inferred: 'Probable', unresolved: 'Non confirmé', start: 'Point d\u2019entrée' }
}
