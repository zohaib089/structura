import type { LandingStrings } from './types'

export const it: LandingStrings = {
  documentTitle: '{name} \u2014 Guarda come si incastra il tuo codice, e cosa è rischioso',
  metaDescription: '{name} trasforma un progetto sul tuo computer in una mappa ad anelli attorno ai suoi veri punti di ingresso. Nessun account. Nulla viene caricato per vedere un grafo.',
  skipLink: 'Vai al contenuto',
  homeLabel: 'Home di {name}',
  nav: { label: 'Principale', product: 'Prodotto', how: 'Come funziona', docs: 'Documentazione', githubLabel: '{name} su GitHub' },
  cta: { viewer: 'Prova il visualizzatore', selfHost: 'Self-hosting', scan: 'Analizza un progetto', projects: 'Vai ai tuoi progetti', selfHostGuide: 'Guida al self-hosting' },
  hero: {
    eyebrow: '{name} \u00b7 prima in locale',
    titleLead: 'Guarda come si incastra il tuo codice \u2014 ',
    titleEmphasis: 'e cosa è rischioso.',
    leadBefore: '{name} trasforma un progetto sul tuo computer in una ',
    leadMap: 'mappa ad anelli',
    leadMiddle: ' attorno ai suoi veri punti di partenza. ',
    leadNoAccount: 'Nessun account. Nulla viene caricato',
    leadAfter: ' per vedere un grafo.',
    scanPrompt: 'Hai un progetto pronto? ',
    graphTitle: 'Mappa di esempio di un progetto, disegnata ad anelli attorno al file di ingresso',
    legendLabel: 'Come leggere le linee',
    sampleTag: 'Dati di esempio \u2014 un progetto inventato',
    inspectDefaultTitle: 'main.ts \u2014 dove parte il progetto',
    inspectDefaultBody: 'Passa il mouse o usa Tab su un file per vedere a cosa si collega. Gli anelli mostrano i passi dall\u2019inizio.',
    inspectEntryBody: 'Tutto il resto si misura in passi a partire da qui.',
    inspectEntryLabel: 'Punto di ingresso',
    entryTag: 'PUNTO DI INGRESSO',
    graphListLabel: 'File nella mappa di esempio',
    graphTextIntro:
      'Versione testuale della mappa di esempio. Il file iniziale main.ts è al centro. L\u2019anello 1 contiene 8 file che main.ts usa direttamente. L\u2019anello 2 contiene 12 file raggiunti tramite questi. L\u2019anello 3 ne contiene altri 10. Ogni file mostra il problema più grave con un\u2019icona e una parola. Le linee sono continue quando il collegamento è nel codice, tratteggiate quando è probabile e punteggiate quando non è stato possibile confermarlo.'
  },
  steps: { one: '{n} passo', other: '{n} passi' },
  a11y: { node: '{label}, a {steps} dall\u2019inizio. {link}. {issue}', noIssues: 'Nessun problema trovato.', issue: 'Problema {severity}', issueSentence: 'Problema {severity}.', inspectSteps: 'a {steps} da {start}', inspectLink: 'collegamento:' },
  proof: {
    label: 'In sintesi',
    items: [
      ['Funziona sul tuo computer', 'Il tuo codice resta dov\u2019è.'],
      ['Nessun account per consultare', 'Apri un file di grafo e dai un\u2019occhiata.'],
      ['TypeScript e JavaScript per ora', 'Gli altri linguaggi sono elencati come saltati, non nascosti.'],
      ['Ogni collegamento dice come è stato trovato', 'Trovato nel codice, probabile o non confermato.']
    ]
  },
  how: {
    kicker: 'Come funziona',
    title: 'Tre passi dalla cartella alla mappa.',
    lead: 'Indica un progetto a {name}, lascia che legga i file, poi esplora il risultato. Puoi seguire l\u2019avanzamento mentre lavora.',
    step: 'PASSO',
    steps: [
      ['Scegli un progetto', 'Una cartella, un file zip o un link Git. {name} lo controlla prima e ti avvisa se qualcosa è troppo grande.'],
      ['{name} lo legge', 'Segue ogni import, annota quanto è sicuro di ogni collegamento e cerca i punti rischiosi lungo il percorso.'],
      ['Leggi la mappa e il report', 'Parti dal file di ingresso e procedi verso l\u2019esterno. Il report indica cosa guardare per primo, in parole semplici.']
    ],
    sources: ['Cartella', 'Zip', 'Link Git'],
    checking: { before: 'Controllo di ', files: '1.240 file', middle: '\u2026 escludendo ' },
    loaderLabel: 'Analisi del codice',
    initialStatus: 'Analizzatore in esecuzione (3 di 7)',
    runScan: 'Avvia un\u2019analisi di esempio',
    previewToasts: 'Anteprima notifiche',
    phases: [
      ['Preparazione dei file', 'Controllo di 1.240 file\u2026'],
      ['Analisi del codice', 'Analizzatore in esecuzione (3 di 7)'],
      ['Analisi del codice', 'Analizzatore in esecuzione (7 di 7)'],
      ['Creazione del report', 'Raccolta dei risultati\u2026']
    ],
    finished: ['Analisi completata', '142 file su 150 controllati'],
    findingsLabel: 'Esempi di risultati',
    findings: ['Collegamento circolare tra due file principali', 'Una pagina accede direttamente al livello del database', 'File con molti collegamenti in entrata']
  },
  toasts: {
    sampleLoaded: 'Progetto di esempio caricato',
    scanStarted: 'Analisi avviata',
    scanFinished: 'Analisi completata',
    scanFinishedBody: '142 file mappati \u00b7 2 collegamenti da verificare',
    viewMap: 'Vedi mappa',
    previewInfo: 'Esempio caricato',
    previewInfoBody: 'main.ts è il punto di partenza.',
    previewWarning: '2 collegamenti che non abbiamo potuto seguire',
    previewWarningBody: 'Sono elencati nella copertura.',
    previewError: 'Impossibile leggere una cartella',
    previewErrorBody: 'Controlla i permessi, poi riprova.',
    retry: 'Riprova'
  },
  connections: {
    kicker: 'Come abbiamo trovato ogni collegamento',
    title: 'Ogni connessione ha un\u2019etichetta.',
    lead: 'Alcuni collegamenti sono certi. Altri sono buone ipotesi. Alcuni non siamo riusciti a seguirli. {name} ti dice quale è quale, nella linea stessa e nel testo accanto.',
    lines: ['linea continua', 'linea tratteggiata', 'linea punteggiata'],
    rows: [
      ['Trovato nel codice', 'È scritto proprio lì, come un import diretto. Più sicuro di così non si può.'],
      ['Probabile', 'Non è scritto direttamente, ma lo schema porta lì \u2014 per esempio un file scelto da una regola di denominazione.'],
      ['Non confermato', 'Abbiamo visto un collegamento ma non sappiamo dove porta. È elencato perché tu possa verificarlo \u2014 mai scartato.']
    ]
  },
  coverage: {
    kicker: 'Copertura',
    title: 'Niente viene saltato in silenzio.',
    lead: 'Ogni analisi riporta cosa ha controllato e cosa no, così un risultato pulito non nasconde mai un punto cieco.',
    note: 'Numeri illustrativi dal progetto di esempio.',
    statValue: '142 su 150',
    statLabel: 'file controllati \u00b7 95%',
    barLabel: '142 file su 150 controllati; 8 saltati',
    rows: [
      ['File in un linguaggio che non leggiamo ancora ', '(Python, Go)', '6 file'],
      ['Collegamenti che non abbiamo potuto seguire ', '(calcolati in esecuzione)', '2 collegamenti'],
      ['File che hai chiesto di ignorare ', '(ad es. node_modules)', 'elencati']
    ]
  },
  selfHost: {
    kicker: 'Self-hosting',
    title: 'Eseguilo sul tuo computer o server.',
    lead: '{name} è pensato prima per il locale. Ospitalo tu e il tuo codice non lascia mai la tua rete.',
    bullets: ['Funziona con Docker Compose', 'Mantieni i tuoi dati e le tue regole di accesso', 'Il codice sorgente è su GitHub'],
    terminalLabel: 'Esempio di comandi di avvio',
    terminalBadge: 'Illustrativo',
    comments: ['# 1. scarica {name}', '# 2. avvialo', '# 3. aprilo']
  },
  closing: { title: 'Pronto a vedere il tuo progetto come una mappa?', lead: 'Prova prima un esempio nel browser, oppure ospitalo tu.' },
  footer: { label: 'Piè di pagina', docs: 'Documentazione', selfHost: 'Self-hosting' },
  severity: { critical: 'Critico', high: 'Alto', medium: 'Medio', low: 'Basso', info: 'Nessun problema' },
  linkKind: { extracted: 'Trovato nel codice', inferred: 'Probabile', unresolved: 'Non confermato', start: 'Punto di ingresso' }
}
