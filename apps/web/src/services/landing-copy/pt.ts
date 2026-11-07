import type { LandingStrings } from './types'

export const pt: LandingStrings = {
  documentTitle: '{name} \u2014 Veja como o seu código se encaixa, e o que é arriscado',
  metaDescription: 'O {name} transforma um projeto na sua máquina num mapa em anéis à volta dos seus verdadeiros pontos de entrada. Sem conta. Nada é enviado para ver um grafo.',
  skipLink: 'Saltar para o conteúdo',
  homeLabel: 'Início do {name}',
  nav: { label: 'Principal', product: 'Produto', how: 'Como funciona', docs: 'Documentação', githubLabel: '{name} no GitHub' },
  cta: { viewer: 'Experimentar o visualizador', selfHost: 'Alojar localmente', scan: 'Analisar um projeto', projects: 'Ir para os seus projetos', selfHostGuide: 'Guia de alojamento' },
  hero: {
    eyebrow: '{name} \u00b7 primeiro local',
    titleLead: 'Veja como o seu código se encaixa \u2014 ',
    titleEmphasis: 'e o que é arriscado.',
    leadBefore: 'O {name} transforma um projeto na sua máquina num ',
    leadMap: 'mapa em anéis',
    leadMiddle: ' à volta dos seus verdadeiros pontos de partida. ',
    leadNoAccount: 'Sem conta. Nada é enviado',
    leadAfter: ' para ver um grafo.',
    scanPrompt: 'Tem um projeto pronto? ',
    graphTitle: 'Mapa de exemplo de um projeto, desenhado em anéis à volta do ficheiro de entrada',
    legendLabel: 'Como ler as linhas',
    sampleTag: 'Dados de exemplo \u2014 um projeto fictício',
    inspectDefaultTitle: 'main.ts \u2014 onde o projeto começa',
    inspectDefaultBody: 'Passe o rato ou use Tab num ficheiro para ver as suas ligações. Os anéis mostram a distância ao início.',
    inspectEntryBody: 'Tudo o resto é medido em passos a partir daqui.',
    inspectEntryLabel: 'Ponto de entrada',
    entryTag: 'PONTO DE ENTRADA',
    graphListLabel: 'Ficheiros no mapa de exemplo',
    graphTextIntro:
      'Versão em texto do mapa de exemplo. O ficheiro inicial main.ts está no centro. O anel 1 tem 8 ficheiros que o main.ts usa diretamente. O anel 2 tem 12 ficheiros alcançados através desses. O anel 3 tem mais 10. Cada ficheiro mostra o seu problema mais grave com um ícone e uma palavra. As linhas são contínuas quando a ligação está no código, tracejadas quando é provável e pontilhadas quando não foi possível confirmá-la.'
  },
  steps: { one: '{n} passo', other: '{n} passos' },
  a11y: { node: '{label}, a {steps} do início. {link}. {issue}', noIssues: 'Nenhum problema encontrado.', issue: 'Problema {severity}', issueSentence: 'Problema {severity}.', inspectSteps: 'a {steps} de {start}', inspectLink: 'ligação:' },
  proof: {
    label: 'Resumo',
    items: [
      ['Funciona na sua máquina', 'O seu código fica onde está.'],
      ['Sem conta para ver', 'Abra um ficheiro de grafo e explore.'],
      ['TypeScript e JavaScript por agora', 'Outras linguagens aparecem como ignoradas, não escondidas.'],
      ['Cada ligação diz como foi encontrada', 'Encontrada no código, provável ou não confirmada.']
    ]
  },
  how: {
    kicker: 'Como funciona',
    title: 'Três passos da pasta ao mapa.',
    lead: 'Indique um projeto ao {name}, deixe-o ler os ficheiros e explore o resultado. Pode acompanhar o progresso enquanto decorre.',
    step: 'PASSO',
    steps: [
      ['Escolha um projeto', 'Uma pasta, um ficheiro zip ou uma ligação Git. O {name} verifica-o primeiro e avisa se algo for demasiado grande.'],
      ['O {name} lê-o', 'Segue cada import, regista o grau de certeza de cada ligação e procura pontos de risco pelo caminho.'],
      ['Leia o mapa e o relatório', 'Comece no ficheiro de entrada e avance para fora. O relatório diz o que ver primeiro, em linguagem simples.']
    ],
    sources: ['Pasta', 'Zip', 'Ligação Git'],
    checking: { before: 'A verificar ', files: '1240 ficheiros', middle: '\u2026 a ignorar ' },
    loaderLabel: 'A analisar o código',
    initialStatus: 'Analisador em execução (3 de 7)',
    runScan: 'Executar uma análise de exemplo',
    previewToasts: 'Pré-visualizar notificações',
    phases: [
      ['A preparar ficheiros', 'A verificar 1240 ficheiros\u2026'],
      ['A analisar o código', 'Analisador em execução (3 de 7)'],
      ['A analisar o código', 'Analisador em execução (7 de 7)'],
      ['A criar o relatório', 'A reunir os resultados\u2026']
    ],
    finished: ['Análise concluída', '142 de 150 ficheiros verificados'],
    findingsLabel: 'Exemplos de resultados',
    findings: ['Ligação circular entre dois ficheiros centrais', 'Uma página acede diretamente à camada de base de dados', 'Ficheiro com muitas ligações de entrada']
  },
  toasts: {
    sampleLoaded: 'Projeto de exemplo carregado',
    scanStarted: 'Análise iniciada',
    scanFinished: 'Análise concluída',
    scanFinishedBody: '142 ficheiros mapeados \u00b7 2 ligações a verificar',
    viewMap: 'Ver mapa',
    previewInfo: 'Exemplo carregado',
    previewInfoBody: 'main.ts é o ponto de partida.',
    previewWarning: '2 ligações que não conseguimos seguir',
    previewWarningBody: 'Estão listadas na cobertura.',
    previewError: 'Não foi possível ler uma pasta',
    previewErrorBody: 'Verifique as permissões e tente novamente.',
    retry: 'Tentar novamente'
  },
  connections: {
    kicker: 'Como encontrámos cada ligação',
    title: 'Cada ligação tem uma etiqueta.',
    lead: 'Algumas ligações são certas. Outras são boas suposições. Algumas não conseguimos seguir. O {name} diz-lhe qual é qual, na própria linha e no texto ao lado.',
    lines: ['linha contínua', 'linha tracejada', 'linha pontilhada'],
    rows: [
      ['Encontrada no código', 'Está escrita ali mesmo, como um import direto. Não há maior certeza.'],
      ['Provável', 'Não está escrita diretamente, mas o padrão aponta para ela \u2014 por exemplo, um ficheiro escolhido por uma regra de nomes.'],
      ['Não confirmada', 'Vimos uma ligação mas não conseguimos saber para onde vai. Fica listada para a poder verificar \u2014 nunca é descartada.']
    ]
  },
  coverage: {
    kicker: 'Cobertura',
    title: 'Nada é ignorado em silêncio.',
    lead: 'Cada análise indica o que verificou e o que não verificou, para que um resultado limpo nunca esconda um ponto cego.',
    note: 'Números ilustrativos do projeto de exemplo.',
    statValue: '142 de 150',
    statLabel: 'ficheiros verificados \u00b7 95%',
    barLabel: '142 de 150 ficheiros verificados; 8 ignorados',
    rows: [
      ['Ficheiros numa linguagem que ainda não lemos ', '(Python, Go)', '6 ficheiros'],
      ['Ligações que não conseguimos seguir ', '(calculadas em tempo de execução)', '2 ligações'],
      ['Ficheiros que pediu para ignorar ', '(p. ex. node_modules)', 'listados']
    ]
  },
  selfHost: {
    kicker: 'Alojamento próprio',
    title: 'Execute-o no seu computador ou servidor.',
    lead: 'O {name} funciona primeiro em local. Aloje-o você mesmo e o seu código nunca sai da sua rede.',
    bullets: ['Funciona com Docker Compose', 'Mantém os seus dados e as suas regras de acesso', 'O código-fonte está no GitHub'],
    terminalLabel: 'Exemplo de comandos de arranque',
    terminalBadge: 'Ilustrativo',
    comments: ['# 1. obter o {name}', '# 2. iniciar', '# 3. abrir']
  },
  closing: { title: 'Pronto para ver o seu projeto como um mapa?', lead: 'Experimente primeiro um exemplo no navegador, ou aloje-o você mesmo.' },
  footer: { label: 'Rodapé', docs: 'Documentação', selfHost: 'Alojar localmente' },
  severity: { critical: 'Crítico', high: 'Alto', medium: 'Médio', low: 'Baixo', info: 'Sem problemas' },
  linkKind: { extracted: 'Encontrada no código', inferred: 'Provável', unresolved: 'Não confirmada', start: 'Ponto de entrada' }
}
