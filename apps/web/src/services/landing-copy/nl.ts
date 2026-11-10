import type { LandingStrings } from './types'

export const nl: LandingStrings = {
  documentTitle: '{name} \u2014 Zie hoe je code samenhangt, en wat riskant is',
  metaDescription: '{name} maakt van een project op je computer een ringvormige kaart rond de echte startpunten. Geen account. Er wordt niets geüpload om een graaf te bekijken.',
  skipLink: 'Naar de inhoud',
  homeLabel: '{name} startpagina',
  nav: { label: 'Hoofdmenu', product: 'Product', how: 'Hoe het werkt', docs: 'Documentatie', githubLabel: '{name} op GitHub' },
  cta: { viewer: 'Probeer de viewer', selfHost: 'Zelf hosten', scan: 'Project scannen', projects: 'Naar je projecten', selfHostGuide: 'Handleiding zelf hosten' },
  hero: {
    eyebrow: '{name} \u00b7 lokaal eerst',
    titleLead: 'Zie hoe je code samenhangt \u2014 ',
    titleEmphasis: 'en wat riskant is.',
    leadBefore: '{name} maakt van een project op je computer een ',
    leadMap: 'ringvormige kaart',
    leadMiddle: ' rond de echte startpunten. ',
    leadNoAccount: 'Geen account. Niets geüpload',
    leadAfter: ' om een graaf te bekijken.',
    scanPrompt: 'Heb je een project klaar? ',
    graphTitle: 'Voorbeeldkaart van een project, getekend als ringen rond het startbestand',
    legendLabel: 'Zo lees je de lijnen',
    sampleTag: 'Voorbeelddata \u2014 een verzonnen project',
    inspectDefaultTitle: 'main.ts \u2014 waar het project begint',
    inspectDefaultBody: 'Beweeg over een bestand of ga er met Tab naartoe om te zien waarmee het verbonden is. Ringen tonen het aantal stappen vanaf de start.',
    inspectEntryBody: 'Al het andere wordt gemeten in stappen vanaf hier.',
    inspectEntryLabel: 'Startpunt',
    entryTag: 'STARTPUNT',
    graphListLabel: 'Bestanden in de voorbeeldkaart',
    graphTextIntro:
      'Tekstversie van de voorbeeldkaart. Het startbestand main.ts staat in het midden. Ring 1 bevat 8 bestanden die main.ts direct gebruikt. Ring 2 bevat 12 bestanden die via die bestanden worden bereikt. Ring 3 bevat er nog 10. Elk bestand toont zijn ernstigste bevinding met een pictogram en een woord. Lijnen zijn doorgetrokken als de koppeling in de code staat, gestreept als ze waarschijnlijk is en gestippeld als ze niet bevestigd kon worden.'
  },
  steps: { one: '{n} stap', other: '{n} stappen' },
  a11y: { node: '{label}, {steps} vanaf de start. {link}. {issue}', noIssues: 'Geen problemen gevonden.', issue: 'Probleem: {severity}', issueSentence: 'Probleem: {severity}.', inspectSteps: '{steps} vanaf {start}', inspectLink: 'koppeling:' },
  proof: {
    label: 'In het kort',
    items: [
      ['Draait op je eigen computer', 'Je code blijft waar ze is.'],
      ['Geen account nodig om te kijken', 'Open een graafbestand en kijk rond.'],
      ['Nu TypeScript en JavaScript', 'Andere talen staan vermeld als overgeslagen, niet verborgen.'],
      ['Elke koppeling vertelt hoe ze gevonden is', 'Gevonden in de code, waarschijnlijk of niet bevestigd.']
    ]
  },
  how: {
    kicker: 'Hoe het werkt',
    title: 'In drie stappen van map naar kaart.',
    lead: 'Wijs {name} een project aan, laat het de bestanden lezen en verken het resultaat. Je kunt de voortgang onderweg volgen.',
    step: 'STAP',
    steps: [
      ['Kies een project', 'Een map, een zipbestand of een Git-link. {name} controleert het eerst en meldt het als iets te groot is.'],
      ['{name} leest het', 'Het volgt elke import, noteert hoe zeker het is over elke koppeling en zoekt onderweg naar risicoplekken.'],
      ['Lees de kaart en het rapport', 'Begin bij het startbestand en werk naar buiten. Het rapport zegt in gewone taal waar je eerst naar moet kijken.']
    ],
    sources: ['Map', 'Zip', 'Git-link'],
    checking: { before: 'Controleren van ', files: '1.240 bestanden', middle: '\u2026 overslaan: ' },
    loaderLabel: 'Code analyseren',
    initialStatus: 'Analyse loopt (3 van 7)',
    runScan: 'Voorbeeldscan starten',
    previewToasts: 'Meldingen bekijken',
    phases: [
      ['Bestanden voorbereiden', '1.240 bestanden controleren\u2026'],
      ['Code analyseren', 'Analyse loopt (3 van 7)'],
      ['Code analyseren', 'Analyse loopt (7 van 7)'],
      ['Rapport opstellen', 'Bevindingen samenvoegen\u2026']
    ],
    finished: ['Scan voltooid', '142 van 150 bestanden gecontroleerd'],
    findingsLabel: 'Voorbeeldbevindingen',
    findings: ['Kringkoppeling tussen twee kernbestanden', 'Pagina grijpt rechtstreeks in de databaselaag', 'Bestand met veel inkomende koppelingen']
  },
  toasts: {
    sampleLoaded: 'Voorbeeldproject geladen',
    scanStarted: 'Scan gestart',
    scanFinished: 'Scan voltooid',
    scanFinishedBody: '142 bestanden in kaart gebracht \u00b7 2 koppelingen te controleren',
    viewMap: 'Kaart bekijken',
    previewInfo: 'Voorbeeld geladen',
    previewInfoBody: 'main.ts is het startpunt.',
    previewWarning: '2 koppelingen die we niet konden volgen',
    previewWarningBody: 'Ze staan in de dekking vermeld.',
    previewError: 'Eén map kon niet gelezen worden',
    previewErrorBody: 'Controleer de rechten en probeer het opnieuw.',
    retry: 'Opnieuw'
  },
  connections: {
    kicker: 'Hoe we elke koppeling vonden',
    title: 'Elke verbinding heeft een label.',
    lead: 'Sommige koppelingen zijn zeker. Sommige zijn goede gissingen. Sommige konden we niet volgen. {name} vertelt je welke welke is, in de lijn zelf en in de tekst ernaast.',
    lines: ['doorgetrokken lijn', 'gestreepte lijn', 'gestippelde lijn'],
    rows: [
      ['Gevonden in de code', 'Het staat er letterlijk, zoals een directe import. Zekerder wordt het niet.'],
      ['Waarschijnlijk', 'Niet letterlijk geschreven, maar het patroon wijst ernaar \u2014 bijvoorbeeld een bestand gekozen via een naamregel.'],
      ['Niet bevestigd', 'We zagen een koppeling maar konden niet zien waar ze heen gaat. Ze staat vermeld zodat je het zelf kunt nagaan \u2014 nooit weggelaten.']
    ]
  },
  coverage: {
    kicker: 'Dekking',
    title: 'Niets wordt stilletjes overgeslagen.',
    lead: 'Elke scan meldt wat er gecontroleerd is en wat niet, zodat een schoon resultaat nooit een blinde vlek verbergt.',
    note: 'Illustratieve cijfers uit het voorbeeldproject.',
    statValue: '142 van 150',
    statLabel: 'bestanden gecontroleerd \u00b7 95%',
    barLabel: '142 van 150 bestanden gecontroleerd; 8 overgeslagen',
    rows: [
      ['Bestanden in een taal die we nog niet lezen ', '(Python, Go)', '6 bestanden'],
      ['Koppelingen die we niet konden volgen ', '(berekend tijdens uitvoering)', '2 koppelingen'],
      ['Bestanden die je liet negeren ', '(bijv. node_modules)', 'vermeld']
    ]
  },
  selfHost: {
    kicker: 'Zelf hosten',
    title: 'Draai het op je eigen computer of server.',
    lead: '{name} werkt lokaal eerst. Host het zelf en je code verlaat nooit je netwerk.',
    bullets: ['Draait met Docker Compose', 'Je houdt je data en je toegangsregels', 'De broncode staat op GitHub'],
    terminalLabel: 'Voorbeeld van opstartcommando\u2019s',
    terminalBadge: 'Ter illustratie',
    comments: ['# 1. haal {name} op', '# 2. start het', '# 3. open het']
  },
  closing: { title: 'Klaar om je project als kaart te zien?', lead: 'Probeer eerst een voorbeeld in je browser, of host het zelf.' },
  footer: { label: 'Voettekst', docs: 'Documentatie', selfHost: 'Zelf hosten' },
  severity: { critical: 'Kritiek', high: 'Hoog', medium: 'Middel', low: 'Laag', info: 'Geen problemen' },
  linkKind: { extracted: 'Gevonden in de code', inferred: 'Waarschijnlijk', unresolved: 'Niet bevestigd', start: 'Startpunt' }
}
