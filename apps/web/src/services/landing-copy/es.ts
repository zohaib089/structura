import type { LandingStrings } from './types'

export const es: LandingStrings = {
  documentTitle: '{name} \u2014 Mira cómo encaja tu código y qué es arriesgado',
  metaDescription: '{name} convierte un proyecto de tu equipo en un mapa de anillos alrededor de sus puntos de entrada reales. Sin cuenta. No se sube nada para ver un grafo.',
  skipLink: 'Saltar al contenido',
  homeLabel: 'Inicio de {name}',
  nav: { label: 'Principal', product: 'Producto', how: 'Cómo funciona', docs: 'Documentación', githubLabel: '{name} en GitHub' },
  cta: { viewer: 'Probar el visor', selfHost: 'Autoalojar', scan: 'Analizar un proyecto', projects: 'Ir a tus proyectos', selfHostGuide: 'Guía de autoalojamiento' },
  hero: {
    eyebrow: '{name} \u00b7 primero en local',
    titleLead: 'Mira cómo encaja tu código \u2014 ',
    titleEmphasis: 'y qué es arriesgado.',
    leadBefore: '{name} convierte un proyecto de tu equipo en un ',
    leadMap: 'mapa de anillos',
    leadMiddle: ' alrededor de sus puntos de partida reales. ',
    leadNoAccount: 'Sin cuenta. No se sube nada',
    leadAfter: ' para ver un grafo.',
    scanPrompt: '¿Tienes un proyecto listo? ',
    graphTitle: 'Mapa de ejemplo de un proyecto, dibujado en anillos alrededor de su archivo de entrada',
    legendLabel: 'Cómo leer las líneas',
    sampleTag: 'Datos de ejemplo \u2014 un proyecto inventado',
    inspectDefaultTitle: 'main.ts \u2014 donde empieza el proyecto',
    inspectDefaultBody: 'Pasa el cursor o usa Tab sobre un archivo para ver con qué se conecta. Los anillos muestran los pasos desde el inicio.',
    inspectEntryBody: 'Todo lo demás se mide en pasos desde aquí.',
    inspectEntryLabel: 'Punto de entrada',
    entryTag: 'PUNTO DE ENTRADA',
    graphListLabel: 'Archivos del mapa de ejemplo',
    graphTextIntro:
      'Versión en texto del mapa de ejemplo. El archivo inicial main.ts está en el centro. El anillo 1 tiene 8 archivos que main.ts usa directamente. El anillo 2 tiene 12 archivos alcanzados a través de esos. El anillo 3 tiene 10 más. Cada archivo muestra su hallazgo más grave con un icono y una palabra. Las líneas son continuas cuando el enlace está en el código, discontinuas cuando es probable y punteadas cuando no se pudo confirmar.'
  },
  steps: { one: '{n} paso', other: '{n} pasos' },
  a11y: { node: '{label}, a {steps} del inicio. {link}. {issue}', noIssues: 'No se encontraron problemas.', issue: 'Problema {severity}', issueSentence: 'Problema {severity}.', inspectSteps: 'a {steps} de {start}', inspectLink: 'enlace:' },
  proof: {
    label: 'De un vistazo',
    items: [
      ['Funciona en tu equipo', 'Tu código se queda donde está.'],
      ['Sin cuenta para ver', 'Abre un archivo de grafo y explora.'],
      ['TypeScript y JavaScript por ahora', 'Los demás lenguajes aparecen como omitidos, no ocultos.'],
      ['Cada enlace dice cómo se encontró', 'Encontrado en el código, probable o sin confirmar.']
    ]
  },
  how: {
    kicker: 'Cómo funciona',
    title: 'Tres pasos de la carpeta al mapa.',
    lead: 'Indica un proyecto a {name}, deja que lea los archivos y explora el resultado. Puedes seguir el progreso mientras avanza.',
    step: 'PASO',
    steps: [
      ['Elige un proyecto', 'Una carpeta, un archivo zip o un enlace de Git. {name} lo revisa primero y te avisa si algo es demasiado grande.'],
      ['{name} lo lee', 'Sigue cada import, anota cuán seguro está de cada enlace y busca puntos de riesgo por el camino.'],
      ['Lee el mapa y el informe', 'Empieza por el archivo de entrada y avanza hacia fuera. El informe indica qué revisar primero, con palabras sencillas.']
    ],
    sources: ['Carpeta', 'Zip', 'Enlace de Git'],
    checking: { before: 'Revisando ', files: '1240 archivos', middle: '\u2026 omitiendo ' },
    loaderLabel: 'Analizando el código',
    initialStatus: 'Ejecutando analizador (3 de 7)',
    runScan: 'Ejecutar un análisis de ejemplo',
    previewToasts: 'Ver notificaciones de ejemplo',
    phases: [
      ['Preparando archivos', 'Revisando 1240 archivos\u2026'],
      ['Analizando el código', 'Ejecutando analizador (3 de 7)'],
      ['Analizando el código', 'Ejecutando analizador (7 de 7)'],
      ['Creando el informe', 'Reuniendo los hallazgos\u2026']
    ],
    finished: ['Análisis terminado', '142 de 150 archivos revisados'],
    findingsLabel: 'Hallazgos de ejemplo',
    findings: ['Enlace circular entre dos archivos principales', 'Una página accede directamente a la capa de base de datos', 'Archivo con muchos enlaces entrantes']
  },
  toasts: {
    sampleLoaded: 'Proyecto de ejemplo cargado',
    scanStarted: 'Análisis iniciado',
    scanFinished: 'Análisis terminado',
    scanFinishedBody: '142 archivos mapeados \u00b7 2 enlaces por revisar',
    viewMap: 'Ver mapa',
    previewInfo: 'Ejemplo cargado',
    previewInfoBody: 'main.ts es el punto de partida.',
    previewWarning: '2 enlaces que no pudimos seguir',
    previewWarningBody: 'Aparecen en la cobertura.',
    previewError: 'No se pudo leer una carpeta',
    previewErrorBody: 'Revisa los permisos y vuelve a intentarlo.',
    retry: 'Reintentar'
  },
  connections: {
    kicker: 'Cómo encontramos cada enlace',
    title: 'Cada conexión tiene su etiqueta.',
    lead: 'Algunos enlaces son seguros. Otros son buenas suposiciones. Algunos no pudimos seguirlos. {name} te dice cuál es cuál, en la propia línea y en el texto de al lado.',
    lines: ['línea continua', 'línea discontinua', 'línea punteada'],
    rows: [
      ['Encontrado en el código', 'Está escrito ahí mismo, como un import directo. No hay mayor certeza.'],
      ['Probable', 'No está escrito directamente, pero el patrón apunta a él \u2014 por ejemplo, un archivo elegido por una regla de nombres.'],
      ['Sin confirmar', 'Vimos un enlace pero no pudimos saber adónde va. Queda en la lista para que lo revises \u2014 nunca se descarta.']
    ]
  },
  coverage: {
    kicker: 'Cobertura',
    title: 'Nada se omite en silencio.',
    lead: 'Cada análisis informa de lo que revisó y de lo que no, para que un resultado limpio nunca oculte un punto ciego.',
    note: 'Cifras ilustrativas del proyecto de ejemplo.',
    statValue: '142 de 150',
    statLabel: 'archivos revisados \u00b7 95 %',
    barLabel: '142 de 150 archivos revisados; 8 omitidos',
    rows: [
      ['Archivos en un lenguaje que aún no leemos ', '(Python, Go)', '6 archivos'],
      ['Enlaces que no pudimos seguir ', '(calculados en tiempo de ejecución)', '2 enlaces'],
      ['Archivos que pediste ignorar ', '(p. ej. node_modules)', 'en la lista']
    ]
  },
  selfHost: {
    kicker: 'Autoalojamiento',
    title: 'Ejecútalo en tu propio equipo o servidor.',
    lead: '{name} funciona primero en local. Alójalo tú mismo y tu código nunca sale de tu red.',
    bullets: ['Funciona con Docker Compose', 'Conservas tus datos y tus reglas de acceso', 'El código fuente está en GitHub'],
    terminalLabel: 'Comandos de inicio de ejemplo',
    terminalBadge: 'Ilustrativo',
    comments: ['# 1. obtener {name}', '# 2. iniciarlo', '# 3. abrirlo']
  },
  closing: { title: '¿Listo para ver tu proyecto como un mapa?', lead: 'Prueba primero un ejemplo en tu navegador, o alójalo tú mismo.' },
  footer: { label: 'Pie de página', docs: 'Documentación', selfHost: 'Autoalojar' },
  severity: { critical: 'Crítico', high: 'Alto', medium: 'Medio', low: 'Bajo', info: 'Sin problemas' },
  linkKind: { extracted: 'Encontrado en el código', inferred: 'Probable', unresolved: 'Sin confirmar', start: 'Punto de entrada' }
}
