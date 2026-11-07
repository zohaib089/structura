import type { LandingStrings } from './types'

export const ja: LandingStrings = {
  documentTitle: '{name} \u2014 コードのつながりと、リスクのある箇所を見える化',
  metaDescription: '{name} は手元のプロジェクトを、実際のエントリーポイントを中心とした同心円状のマップに変えます。アカウント不要。グラフを見るためにアップロードは不要です。',
  skipLink: 'コンテンツへスキップ',
  homeLabel: '{name} ホーム',
  nav: { label: 'メイン', product: '製品', how: '仕組み', docs: 'ドキュメント', githubLabel: 'GitHub の {name}' },
  cta: { viewer: 'ビューアーを試す', selfHost: 'セルフホスト', scan: 'プロジェクトをスキャン', projects: 'プロジェクトへ', selfHostGuide: 'セルフホストガイド' },
  hero: {
    eyebrow: '{name} \u00b7 ローカルファースト',
    titleLead: 'コードのつながりを見る \u2014 ',
    titleEmphasis: 'そして、どこが危ないかも。',
    leadBefore: '{name} は手元のプロジェクトを、',
    leadMap: '同心円状のマップ',
    leadMiddle: 'に変えます。中心は実際の起点です。',
    leadNoAccount: 'アカウント不要。アップロードも不要',
    leadAfter: 'でグラフを見られます。',
    scanPrompt: 'プロジェクトの準備はできていますか？ ',
    graphTitle: 'エントリーファイルを中心に同心円で描いたプロジェクトのサンプルマップ',
    legendLabel: '線の読み方',
    sampleTag: 'サンプルデータ \u2014 架空のプロジェクト',
    inspectDefaultTitle: 'main.ts \u2014 プロジェクトの起点',
    inspectDefaultBody: 'ファイルにカーソルを合わせるか Tab で移動すると、つながりが表示されます。円は起点からのステップ数を示します。',
    inspectEntryBody: 'ほかのすべては、ここからのステップ数で測られます。',
    inspectEntryLabel: 'エントリーポイント',
    entryTag: 'エントリーポイント',
    graphListLabel: 'サンプルマップのファイル',
    graphTextIntro:
      'サンプルマップのテキスト版です。起点ファイル main.ts が中心にあります。リング1には main.ts が直接使う8ファイル、リング2にはそれらを経由して届く12ファイル、リング3にはさらに10ファイルがあります。各ファイルは最も深刻な指摘をアイコンと言葉で示します。コード内で見つかったつながりは実線、推定は破線、確認できなかったものは点線です。'
  },
  steps: { one: '{n} ステップ', other: '{n} ステップ' },
  a11y: { node: '{label}、起点から{steps}。{link}。{issue}', noIssues: '問題は見つかりませんでした。', issue: '重大度: {severity}', issueSentence: '重大度: {severity}。', inspectSteps: '{start} から {steps}', inspectLink: 'つながり:' },
  proof: {
    label: '概要',
    items: [
      ['手元のマシンで動作', 'コードはその場所から動きません。'],
      ['閲覧にアカウント不要', 'グラフファイルを開いて見て回れます。'],
      ['現在は TypeScript と JavaScript', 'ほかの言語は隠さず「スキップ」として表示します。'],
      ['すべてのつながりに根拠を表示', 'コード内で確認、推定、確認できず、のいずれか。']
    ]
  },
  how: {
    kicker: '仕組み',
    title: 'フォルダからマップまで3ステップ。',
    lead: '{name} にプロジェクトを指定してファイルを読ませ、結果を探索します。進行状況はその場で確認できます。',
    step: 'ステップ',
    steps: [
      ['プロジェクトを選ぶ', 'フォルダ、zip ファイル、Git リンクのいずれか。{name} が最初に確認し、大きすぎる場合は知らせます。'],
      ['{name} が読み取る', 'すべての import をたどり、つながりごとの確かさを記録し、途中でリスクのある箇所を探します。'],
      ['マップとレポートを読む', 'エントリーファイルから外側へたどります。レポートは最初に見るべき点をわかりやすい言葉で示します。']
    ],
    sources: ['フォルダ', 'Zip', 'Git リンク'],
    checking: { before: '確認中: ', files: '1,240 ファイル', middle: '\u2026 スキップ: ' },
    loaderLabel: 'コードを解析中',
    initialStatus: '解析を実行中（7 中 3）',
    runScan: 'サンプルスキャンを実行',
    previewToasts: '通知をプレビュー',
    phases: [
      ['ファイルを準備中', '1,240 ファイルを確認中\u2026'],
      ['コードを解析中', '解析を実行中（7 中 3）'],
      ['コードを解析中', '解析を実行中（7 中 7）'],
      ['レポートを作成中', '指摘をまとめています\u2026']
    ],
    finished: ['スキャン完了', '150 ファイル中 142 を確認'],
    findingsLabel: '指摘の例',
    findings: ['2つの主要ファイル間の循環参照', 'ページがデータベース層に直接アクセス', '多くのファイルから参照されているファイル']
  },
  toasts: {
    sampleLoaded: 'サンプルプロジェクトを読み込みました',
    scanStarted: 'スキャンを開始しました',
    scanFinished: 'スキャン完了',
    scanFinishedBody: '142 ファイルをマップ化 \u00b7 確認が必要なつながり 2 件',
    viewMap: 'マップを見る',
    previewInfo: 'サンプルを読み込みました',
    previewInfoBody: 'main.ts が起点です。',
    previewWarning: 'たどれなかったつながりが 2 件',
    previewWarningBody: 'カバレッジに一覧があります。',
    previewError: 'フォルダを1つ読み込めませんでした',
    previewErrorBody: '権限を確認してから再試行してください。',
    retry: '再試行'
  },
  connections: {
    kicker: 'つながりの見つけ方',
    title: 'すべてのつながりにラベルがあります。',
    lead: '確実なつながりもあれば、妥当な推定もあり、たどれなかったものもあります。{name} は線そのものと横の説明で、どれがどれかを示します。',
    lines: ['実線', '破線', '点線'],
    rows: [
      ['コード内で確認', '直接の import のように、はっきり書かれています。これ以上確かなものはありません。'],
      ['推定', '直接は書かれていませんが、パターンから導かれます \u2014 たとえば命名規則で選ばれるファイルです。'],
      ['確認できず', 'つながりは見えましたが、行き先がわかりませんでした。自分で確認できるよう一覧に残します \u2014 消すことはありません。']
    ]
  },
  coverage: {
    kicker: 'カバレッジ',
    title: '黙ってスキップすることはありません。',
    lead: 'どのスキャンも、確認したものとしなかったものを報告します。きれいな結果が死角を隠すことはありません。',
    note: 'サンプルプロジェクトの例示用の数値です。',
    statValue: '150 中 142',
    statLabel: 'ファイルを確認 \u00b7 95%',
    barLabel: '150 ファイル中 142 を確認、8 をスキップ',
    rows: [
      ['まだ読めない言語のファイル ', '（Python、Go）', '6 ファイル'],
      ['たどれなかったつながり ', '（実行時に計算）', '2 件'],
      ['除外を指定したファイル ', '（例: node_modules）', '一覧あり']
    ]
  },
  selfHost: {
    kicker: 'セルフホスト',
    title: '自分のコンピューターやサーバーで実行。',
    lead: '{name} はローカルファーストです。自分でホストすれば、コードがネットワークの外に出ることはありません。',
    bullets: ['Docker Compose で動作', 'データとアクセスルールは自分で管理', 'ソースコードは GitHub で公開'],
    terminalLabel: '起動コマンドの例',
    terminalBadge: '例示',
    comments: ['# 1. {name} を取得', '# 2. 起動', '# 3. 開く']
  },
  closing: { title: 'プロジェクトをマップで見てみませんか？', lead: 'まずはブラウザでサンプルを試すか、自分でホストしてください。' },
  footer: { label: 'フッター', docs: 'ドキュメント', selfHost: 'セルフホスト' },
  severity: { critical: '重大', high: '高', medium: '中', low: '低', info: '問題なし' },
  linkKind: { extracted: 'コード内で確認', inferred: '推定', unresolved: '確認できず', start: 'エントリーポイント' }
}
