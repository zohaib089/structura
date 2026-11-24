import type { Scan } from '../api/scans'
import type { WebLocale } from './locale'
import type { ScanMessages } from './scan-messages'

/** User-facing scan and Open project copy. Methods that only forward other keys stay on the English object. */
type ScanMessageOverrides = Omit<
  ScanMessages,
  'archiveLimitLabel' | 'scanStepLabels' | 'scanStepTerminalLabels'
>

function sourceLabel(
  scan: Scan,
  folderUpload: string,
  gitRemote: string
): string {
  if (scan.source === 'upload') return folderUpload
  const branch = scan.branch ? `@${scan.branch}` : ''
  return `${scan.url ?? gitRemote}${branch}`
}

export const scanMessageLocaleOverrides: Record<Exclude<WebLocale, 'en'>, ScanMessageOverrides> = {
  pt: {
    hubEyebrow: 'Análise da origem',
    hubTitle: 'Abrir um projeto',
    hubDescription:
      'Analise uma pasta local, um ficheiro .zip ou um repositório do GitHub ou GitLab. Os resultados ficam neste espaço de trabalho até a política de retenção do servidor ser aplicada.',
    openProjectTitle: 'Abrir projeto',
    openProjectHint:
      'Escolha uma pasta, envie um .zip ou cole um link Git. O Atlasmith analisa primeiro no seu computador e depois monta o relatório.',
    sourceFolder: 'Pasta',
    sourceZip: 'Zip',
    sourceGit: 'URL Git',
    folderDropTitle: 'Largue uma pasta',
    zipDropTitle: 'Largue um .zip',
    browseLabel: 'Procurar',
    dropOr: 'ou',
    folderHint: 'Análise local primeiro · pastas de compilação como node_modules e .git são ignoradas',
    zipHint(maxLabel) {
      return `Tamanho máximo do ficheiro ${maxLabel} · análise local primeiro`
    },
    gitUrlLabel: 'URL do repositório',
    gitUrlHint: 'Link HTTPS do GitHub ou GitLab',
    invalidGitUrl:
      'Introduza o URL de um repositório do GitHub ou GitLab, por exemplo https://github.com/org/repo',
    branchLabel: 'Branch',
    branchOptional: '(opcional)',
    startScan: 'Iniciar análise',
    scanning: 'Análise em curso…',
    uploadProgress: 'A preparar o envio…',
    zipUploadTooLarge(actualLabel, maxLabel) {
      return `Este .zip tem ${actualLabel}, o que ultrapassa o limite de ${maxLabel}.`
    },
    invalidZipUpload: 'Escolha um único ficheiro .zip.',
    scanListTitle: 'Análises recentes',
    scanListEmpty: 'Ainda não há análises. Inicie uma acima.',
    loadScansError: 'Não foi possível carregar as análises deste espaço de trabalho.',
    refreshScans: 'Atualizar',
    scanStatus(status) {
      return ({
        queued: 'Na fila',
        running: 'Em execução',
        succeeded: 'Concluída',
        failed: 'Falhou',
        cancelled: 'Cancelada'
      })[status]
    },
    scanSourceLabel(scan) {
      return sourceLabel(scan, 'Envio de pasta', 'Git remoto')
    },
    scanFailed: 'A análise falhou',
    scanStepPrepare: 'Preparar',
    scanStepUpload: 'Enviar',
    scanStepQueued: 'A sua análise está na fila — normalmente menos de um minuto.',
    scanStepQueuedTitle: 'Na fila',
    scanStepAnalysing: 'A analisar',
    scanStepBuilding: 'A gerar o relatório',
    scanStepSucceeded: 'Análise concluída',
    scanStepFailed: 'A análise falhou',
    scanStepCancelled: 'Análise cancelada',
    scanCancel: 'Cancelar',
    scanCancelling: 'A cancelar…',
    scanCompleteToast: 'Análise concluída',
    viewReportAction: 'Ver relatório',
    progressHeading: 'Progresso da análise',
    selectScan: 'Ver insights',
    recentScansTitle: 'Análises recentes',
    viewAllScans: 'Abrir arquitetura',
    noScanSelected: 'Selecione uma análise concluída para rever o grafo.',
    loadingScanGraph: 'A carregar o grafo da análise…',
    loadScanGraphError: 'Não foi possível carregar o grafo desta análise.',
    scanStepStatusLines() {
      return {
        prepare: 'A verificar os seus ficheiros…',
        upload: 'A enviar o ficheiro…',
        queued: this.scanStepQueued,
        analysing: 'A executar as análises…',
        building: 'A reunir os resultados…'
      }
    }
  },
  it: {
    hubEyebrow: 'Analisi dell’origine',
    hubTitle: 'Apri un progetto',
    hubDescription:
      'Analizza una cartella locale, un archivio .zip o un repository GitHub o GitLab. I risultati restano in quest’area di lavoro fino all’applicazione della politica di conservazione del server.',
    openProjectTitle: 'Apri progetto',
    openProjectHint:
      'Scegli una cartella, carica un .zip o incolla un link Git. Atlasmith lo analizza prima in locale, poi crea il report.',
    sourceFolder: 'Cartella',
    sourceZip: 'Zip',
    sourceGit: 'URL Git',
    folderDropTitle: 'Trascina una cartella',
    zipDropTitle: 'Trascina un .zip',
    browseLabel: 'Sfoglia',
    dropOr: 'oppure',
    folderHint: 'Analisi prima in locale · le cartelle di build come node_modules e .git vengono ignorate',
    zipHint(maxLabel) {
      return `Dimensione massima dell’archivio ${maxLabel} · analisi prima in locale`
    },
    gitUrlLabel: 'URL del repository',
    gitUrlHint: 'Link HTTPS di GitHub o GitLab',
    invalidGitUrl:
      'Inserisci l’URL di un repository GitHub o GitLab, ad esempio https://github.com/org/repo',
    branchLabel: 'Branch',
    branchOptional: '(facoltativo)',
    startScan: 'Avvia scansione',
    scanning: 'Scansione in corso…',
    uploadProgress: 'Preparazione del caricamento…',
    zipUploadTooLarge(actualLabel, maxLabel) {
      return `Questo .zip pesa ${actualLabel}, oltre il limite di ${maxLabel}.`
    },
    invalidZipUpload: 'Scegli un solo archivio .zip.',
    scanListTitle: 'Scansioni recenti',
    scanListEmpty: 'Nessuna scansione per ora. Avviane una qui sopra.',
    loadScansError: 'Impossibile caricare le scansioni di quest’area di lavoro.',
    refreshScans: 'Aggiorna',
    scanStatus(status) {
      return ({
        queued: 'In coda',
        running: 'In corso',
        succeeded: 'Completata',
        failed: 'Non riuscita',
        cancelled: 'Annullata'
      })[status]
    },
    scanSourceLabel(scan) {
      return sourceLabel(scan, 'Caricamento cartella', 'Git remoto')
    },
    scanFailed: 'Scansione non riuscita',
    scanStepPrepare: 'Preparazione',
    scanStepUpload: 'Caricamento',
    scanStepQueued: 'La scansione è in coda — di solito meno di un minuto.',
    scanStepQueuedTitle: 'In coda',
    scanStepAnalysing: 'Analisi',
    scanStepBuilding: 'Creazione del report',
    scanStepSucceeded: 'Scansione completata',
    scanStepFailed: 'Scansione non riuscita',
    scanStepCancelled: 'Scansione annullata',
    scanCancel: 'Annulla',
    scanCancelling: 'Annullamento…',
    scanCompleteToast: 'Scansione completata',
    viewReportAction: 'Apri il report',
    progressHeading: 'Avanzamento della scansione',
    selectScan: 'Vedi gli insight',
    recentScansTitle: 'Scansioni recenti',
    viewAllScans: 'Apri l’architettura',
    noScanSelected: 'Seleziona una scansione completata per esaminare il grafo.',
    loadingScanGraph: 'Caricamento del grafo della scansione…',
    loadScanGraphError: 'Impossibile caricare il grafo di questa scansione.',
    scanStepStatusLines() {
      return {
        prepare: 'Verifica dei file in corso…',
        upload: 'Invio dell’archivio…',
        queued: this.scanStepQueued,
        analysing: 'Esecuzione delle analisi…',
        building: 'Raccolta dei risultati…'
      }
    }
  },
  fr: {
    hubEyebrow: 'Analyse de la source',
    hubTitle: 'Ouvrir un projet',
    hubDescription:
      'Analysez un dossier local, une archive .zip ou un dépôt GitHub ou GitLab. Les résultats restent dans cet espace de travail jusqu’à l’application de la politique de conservation du serveur.',
    openProjectTitle: 'Ouvrir un projet',
    openProjectHint:
      'Choisissez un dossier, envoyez un .zip ou collez un lien Git. Atlasmith l’analyse d’abord en local, puis constitue le rapport.',
    sourceFolder: 'Dossier',
    sourceZip: 'Zip',
    sourceGit: 'URL Git',
    folderDropTitle: 'Déposez un dossier',
    zipDropTitle: 'Déposez un .zip',
    browseLabel: 'Parcourir',
    dropOr: 'ou',
    folderHint: 'Analyse d’abord en local · les dossiers de compilation comme node_modules et .git sont ignorés',
    zipHint(maxLabel) {
      return `Taille maximale de l’archive ${maxLabel} · analyse d’abord en local`
    },
    gitUrlLabel: 'URL du dépôt',
    gitUrlHint: 'Lien HTTPS GitHub ou GitLab',
    invalidGitUrl:
      'Saisissez l’URL d’un dépôt GitHub ou GitLab, par exemple https://github.com/org/repo',
    branchLabel: 'Branche',
    branchOptional: '(facultatif)',
    startScan: 'Lancer l’analyse',
    scanning: 'Analyse en cours…',
    uploadProgress: 'Préparation de l’envoi…',
    zipUploadTooLarge(actualLabel, maxLabel) {
      return `Ce .zip pèse ${actualLabel}, ce qui dépasse la limite de ${maxLabel}.`
    },
    invalidZipUpload: 'Choisissez une seule archive .zip.',
    scanListTitle: 'Analyses récentes',
    scanListEmpty: 'Pas encore d’analyse. Lancez-en une ci-dessus.',
    loadScansError: 'Impossible de charger les analyses de cet espace de travail.',
    refreshScans: 'Actualiser',
    scanStatus(status) {
      return ({
        queued: 'En file d’attente',
        running: 'En cours',
        succeeded: 'Terminée',
        failed: 'Échouée',
        cancelled: 'Annulée'
      })[status]
    },
    scanSourceLabel(scan) {
      return sourceLabel(scan, 'Dossier envoyé', 'Dépôt Git')
    },
    scanFailed: 'L’analyse a échoué',
    scanStepPrepare: 'Préparation',
    scanStepUpload: 'Envoi',
    scanStepQueued: 'Votre analyse est en file d’attente — en général moins d’une minute.',
    scanStepQueuedTitle: 'En file d’attente',
    scanStepAnalysing: 'Analyse',
    scanStepBuilding: 'Création du rapport',
    scanStepSucceeded: 'Analyse terminée',
    scanStepFailed: 'L’analyse a échoué',
    scanStepCancelled: 'Analyse annulée',
    scanCancel: 'Annuler',
    scanCancelling: 'Annulation…',
    scanCompleteToast: 'Analyse terminée',
    viewReportAction: 'Voir le rapport',
    progressHeading: 'Avancement de l’analyse',
    selectScan: 'Voir les insights',
    recentScansTitle: 'Analyses récentes',
    viewAllScans: 'Ouvrir l’architecture',
    noScanSelected: 'Sélectionnez une analyse terminée pour examiner le graphe.',
    loadingScanGraph: 'Chargement du graphe de l’analyse…',
    loadScanGraphError: 'Impossible de charger le graphe de cette analyse.',
    scanStepStatusLines() {
      return {
        prepare: 'Vérification de vos fichiers…',
        upload: 'Envoi de l’archive…',
        queued: this.scanStepQueued,
        analysing: 'Exécution des analyseurs…',
        building: 'Regroupement des résultats…'
      }
    }
  },
  nl: {
    hubEyebrow: 'Bronanalyse',
    hubTitle: 'Een project openen',
    hubDescription:
      'Analyseer een lokale map, een .zip-archief of een GitHub- of GitLab-repository. Resultaten blijven in deze werkruimte tot het bewaarbeleid van de server geldt.',
    openProjectTitle: 'Project openen',
    openProjectHint:
      'Kies een map, upload een .zip of plak een Git-link. Atlasmith analyseert eerst lokaal en bouwt daarna het rapport.',
    sourceFolder: 'Map',
    sourceZip: 'Zip',
    sourceGit: 'Git-URL',
    folderDropTitle: 'Sleep een map hierheen',
    zipDropTitle: 'Sleep een .zip hierheen',
    browseLabel: 'Bladeren',
    dropOr: 'of',
    folderHint: 'Eerst lokaal analyseren · buildmappen zoals node_modules en .git worden overgeslagen',
    zipHint(maxLabel) {
      return `Maximale archiefgrootte ${maxLabel} · eerst lokaal analyseren`
    },
    gitUrlLabel: 'Repository-URL',
    gitUrlHint: 'HTTPS-link van GitHub of GitLab',
    invalidGitUrl:
      'Voer de URL van een GitHub- of GitLab-repository in, bijvoorbeeld https://github.com/org/repo',
    branchLabel: 'Branch',
    branchOptional: '(optioneel)',
    startScan: 'Analyse starten',
    scanning: 'Analyse bezig…',
    uploadProgress: 'Upload voorbereiden…',
    zipUploadTooLarge(actualLabel, maxLabel) {
      return `Deze .zip is ${actualLabel} en overschrijdt de limiet van ${maxLabel}.`
    },
    invalidZipUpload: 'Kies één .zip-archief.',
    scanListTitle: 'Recente analyses',
    scanListEmpty: 'Nog geen analyses. Start er hierboven een.',
    loadScansError: 'Kan de analyses van deze werkruimte niet laden.',
    refreshScans: 'Vernieuwen',
    scanStatus(status) {
      return ({
        queued: 'In de wachtrij',
        running: 'Bezig',
        succeeded: 'Geslaagd',
        failed: 'Mislukt',
        cancelled: 'Geannuleerd'
      })[status]
    },
    scanSourceLabel(scan) {
      return sourceLabel(scan, 'Map-upload', 'Git-remote')
    },
    scanFailed: 'Analyse mislukt',
    scanStepPrepare: 'Voorbereiden',
    scanStepUpload: 'Uploaden',
    scanStepQueued: 'Je analyse staat in de wachtrij — meestal binnen een minuut.',
    scanStepQueuedTitle: 'In de wachtrij',
    scanStepAnalysing: 'Analyseren',
    scanStepBuilding: 'Rapport maken',
    scanStepSucceeded: 'Analyse voltooid',
    scanStepFailed: 'Analyse mislukt',
    scanStepCancelled: 'Analyse geannuleerd',
    scanCancel: 'Annuleren',
    scanCancelling: 'Annuleren…',
    scanCompleteToast: 'Analyse voltooid',
    viewReportAction: 'Rapport bekijken',
    progressHeading: 'Voortgang van de analyse',
    selectScan: 'Inzichten bekijken',
    recentScansTitle: 'Recente analyses',
    viewAllScans: 'Architectuur openen',
    noScanSelected: 'Selecteer een voltooide analyse om de grafiek te bekijken.',
    loadingScanGraph: 'Grafiek van de analyse laden…',
    loadScanGraphError: 'Kan de grafiek van deze analyse niet laden.',
    scanStepStatusLines() {
      return {
        prepare: 'Je bestanden worden gecontroleerd…',
        upload: 'Het archief wordt verstuurd…',
        queued: this.scanStepQueued,
        analysing: 'De analysers worden uitgevoerd…',
        building: 'Bevindingen worden verzameld…'
      }
    }
  },
  es: {
    hubEyebrow: 'Análisis del origen',
    hubTitle: 'Abrir un proyecto',
    hubDescription:
      'Analiza una carpeta local, un archivo .zip o un repositorio de GitHub o GitLab. Los resultados permanecen en este espacio de trabajo hasta que se aplique la política de retención del servidor.',
    openProjectTitle: 'Abrir proyecto',
    openProjectHint:
      'Elige una carpeta, sube un .zip o pega un enlace Git. Atlasmith lo analiza primero en local y después elabora el informe.',
    sourceFolder: 'Carpeta',
    sourceZip: 'Zip',
    sourceGit: 'URL de Git',
    folderDropTitle: 'Suelta una carpeta',
    zipDropTitle: 'Suelta un .zip',
    browseLabel: 'Examinar',
    dropOr: 'o',
    folderHint: 'Análisis primero en local · se omiten carpetas de compilación como node_modules y .git',
    zipHint(maxLabel) {
      return `Tamaño máximo del archivo ${maxLabel} · análisis primero en local`
    },
    gitUrlLabel: 'URL del repositorio',
    gitUrlHint: 'Enlace HTTPS de GitHub o GitLab',
    invalidGitUrl:
      'Introduce la URL de un repositorio de GitHub o GitLab, por ejemplo https://github.com/org/repo',
    branchLabel: 'Rama',
    branchOptional: '(opcional)',
    startScan: 'Iniciar análisis',
    scanning: 'Análisis en curso…',
    uploadProgress: 'Preparando el envío…',
    zipUploadTooLarge(actualLabel, maxLabel) {
      return `Este .zip pesa ${actualLabel}, por encima del límite de ${maxLabel}.`
    },
    invalidZipUpload: 'Elige un único archivo .zip.',
    scanListTitle: 'Análisis recientes',
    scanListEmpty: 'Aún no hay análisis. Inicia uno arriba.',
    loadScansError: 'No se han podido cargar los análisis de este espacio de trabajo.',
    refreshScans: 'Actualizar',
    scanStatus(status) {
      return ({
        queued: 'En cola',
        running: 'En curso',
        succeeded: 'Completado',
        failed: 'Fallido',
        cancelled: 'Cancelado'
      })[status]
    },
    scanSourceLabel(scan) {
      return sourceLabel(scan, 'Carpeta subida', 'Git remoto')
    },
    scanFailed: 'El análisis ha fallado',
    scanStepPrepare: 'Preparar',
    scanStepUpload: 'Enviar',
    scanStepQueued: 'Tu análisis está en cola; suele tardar menos de un minuto.',
    scanStepQueuedTitle: 'En cola',
    scanStepAnalysing: 'Analizando',
    scanStepBuilding: 'Elaborando el informe',
    scanStepSucceeded: 'Análisis completado',
    scanStepFailed: 'El análisis ha fallado',
    scanStepCancelled: 'Análisis cancelado',
    scanCancel: 'Cancelar',
    scanCancelling: 'Cancelando…',
    scanCompleteToast: 'Análisis completado',
    viewReportAction: 'Ver informe',
    progressHeading: 'Progreso del análisis',
    selectScan: 'Ver insights',
    recentScansTitle: 'Análisis recientes',
    viewAllScans: 'Abrir la arquitectura',
    noScanSelected: 'Selecciona un análisis terminado para revisar el grafo.',
    loadingScanGraph: 'Cargando el grafo del análisis…',
    loadScanGraphError: 'No se ha podido cargar el grafo de este análisis.',
    scanStepStatusLines() {
      return {
        prepare: 'Comprobando tus archivos…',
        upload: 'Enviando el archivo…',
        queued: this.scanStepQueued,
        analysing: 'Ejecutando los análisis…',
        building: 'Reuniendo los hallazgos…'
      }
    }
  },
  ja: {
    hubEyebrow: 'ソースの分析',
    hubTitle: 'プロジェクトを開く',
    hubDescription:
      'ローカルフォルダー、.zip アーカイブ、GitHub または GitLab のリポジトリを分析します。結果は、サーバーの保持ポリシーが適用されるまで、このワークスペースに残ります。',
    openProjectTitle: 'プロジェクトを開く',
    openProjectHint:
      'フォルダーを選ぶか、.zip をアップロードするか、Git のリンクを貼り付けてください。Atlasmith はまずローカルで分析し、その後レポートを作成します。',
    sourceFolder: 'フォルダー',
    sourceZip: 'Zip',
    sourceGit: 'Git URL',
    folderDropTitle: 'フォルダーをドロップ',
    zipDropTitle: '.zip をドロップ',
    browseLabel: '参照',
    dropOr: 'または',
    folderHint: 'まずローカルで分析 · node_modules や .git などのビルド用フォルダーは除外されます',
    zipHint(maxLabel) {
      return `アーカイブの上限 ${maxLabel} · まずローカルで分析`
    },
    gitUrlLabel: 'リポジトリの URL',
    gitUrlHint: 'GitHub または GitLab の HTTPS リンク',
    invalidGitUrl:
      'GitHub または GitLab のリポジトリ URL を入力してください。例: https://github.com/org/repo',
    branchLabel: 'ブランチ',
    branchOptional: '（任意）',
    startScan: 'スキャンを開始',
    scanning: 'スキャンしています…',
    uploadProgress: 'アップロードを準備しています…',
    zipUploadTooLarge(actualLabel, maxLabel) {
      return `この .zip は ${actualLabel} あり、上限の ${maxLabel} を超えています。`
    },
    invalidZipUpload: '.zip アーカイブを 1 つ選んでください。',
    scanListTitle: '最近のスキャン',
    scanListEmpty: 'まだスキャンはありません。上から開始してください。',
    loadScansError: 'このワークスペースのスキャンを読み込めませんでした。',
    refreshScans: '更新',
    scanStatus(status) {
      return ({
        queued: '待機中',
        running: '実行中',
        succeeded: '完了',
        failed: '失敗',
        cancelled: 'キャンセル済み'
      })[status]
    },
    scanSourceLabel(scan) {
      return sourceLabel(scan, 'フォルダーのアップロード', 'Git リモート')
    },
    scanFailed: 'スキャンに失敗しました',
    scanStepPrepare: '準備',
    scanStepUpload: 'アップロード',
    scanStepQueued: 'スキャンは待機中です。通常は 1 分以内です。',
    scanStepQueuedTitle: '待機中',
    scanStepAnalysing: '分析中',
    scanStepBuilding: 'レポートを作成中',
    scanStepSucceeded: 'スキャンが完了しました',
    scanStepFailed: 'スキャンに失敗しました',
    scanStepCancelled: 'スキャンをキャンセルしました',
    scanCancel: 'キャンセル',
    scanCancelling: 'キャンセルしています…',
    scanCompleteToast: 'スキャンが完了しました',
    viewReportAction: 'レポートを見る',
    progressHeading: 'スキャンの進捗',
    selectScan: 'インサイトを見る',
    recentScansTitle: '最近のスキャン',
    viewAllScans: 'アーキテクチャを開く',
    noScanSelected: '完了したスキャンを選ぶと、グラフを確認できます。',
    loadingScanGraph: 'スキャンのグラフを読み込んでいます…',
    loadScanGraphError: 'このスキャンのグラフを読み込めませんでした。',
    scanStepStatusLines() {
      return {
        prepare: 'ファイルを確認しています…',
        upload: 'アーカイブを送信しています…',
        queued: this.scanStepQueued,
        analysing: 'アナライザーを実行しています…',
        building: '結果をまとめています…'
      }
    }
  },
  'zh-Hans': {
    hubEyebrow: '源码分析',
    hubTitle: '打开项目',
    hubDescription:
      '分析本地文件夹、.zip 压缩包，或 GitHub、GitLab 仓库。结果会保留在此工作区，直到服务器的保留策略生效。',
    openProjectTitle: '打开项目',
    openProjectHint:
      '选择一个文件夹、上传 .zip，或粘贴 Git 链接。Atlasmith 会先在本地分析，再生成报告。',
    sourceFolder: '文件夹',
    sourceZip: 'Zip',
    sourceGit: 'Git 地址',
    folderDropTitle: '拖放文件夹',
    zipDropTitle: '拖放 .zip',
    browseLabel: '浏览',
    dropOr: '或',
    folderHint: '先在本地分析 · 会跳过 node_modules 和 .git 等构建文件夹',
    zipHint(maxLabel) {
      return `压缩包大小上限 ${maxLabel} · 先在本地分析`
    },
    gitUrlLabel: '仓库地址',
    gitUrlHint: 'GitHub 或 GitLab 的 HTTPS 链接',
    invalidGitUrl: '请输入 GitHub 或 GitLab 仓库地址，例如 https://github.com/org/repo',
    branchLabel: '分支',
    branchOptional: '（可选）',
    startScan: '开始扫描',
    scanning: '正在扫描…',
    uploadProgress: '正在准备上传…',
    zipUploadTooLarge(actualLabel, maxLabel) {
      return `这个 .zip 大小为 ${actualLabel}，已超过 ${maxLabel} 的限制。`
    },
    invalidZipUpload: '请只选择一个 .zip 压缩包。',
    scanListTitle: '最近的扫描',
    scanListEmpty: '还没有扫描。请在上方开始一次。',
    loadScansError: '无法加载此工作区的扫描。',
    refreshScans: '刷新',
    scanStatus(status) {
      return ({
        queued: '排队中',
        running: '进行中',
        succeeded: '已完成',
        failed: '失败',
        cancelled: '已取消'
      })[status]
    },
    scanSourceLabel(scan) {
      return sourceLabel(scan, '文件夹上传', 'Git 远程仓库')
    },
    scanFailed: '扫描失败',
    scanStepPrepare: '准备',
    scanStepUpload: '上传',
    scanStepQueued: '你的扫描正在排队，通常不到一分钟。',
    scanStepQueuedTitle: '排队中',
    scanStepAnalysing: '正在分析',
    scanStepBuilding: '正在生成报告',
    scanStepSucceeded: '扫描完成',
    scanStepFailed: '扫描失败',
    scanStepCancelled: '扫描已取消',
    scanCancel: '取消',
    scanCancelling: '正在取消…',
    scanCompleteToast: '扫描完成',
    viewReportAction: '查看报告',
    progressHeading: '扫描进度',
    selectScan: '查看洞察',
    recentScansTitle: '最近的扫描',
    viewAllScans: '打开架构图',
    noScanSelected: '请选择一次已完成的扫描以查看关系图。',
    loadingScanGraph: '正在加载扫描关系图…',
    loadScanGraphError: '无法加载此次扫描的关系图。',
    scanStepStatusLines() {
      return {
        prepare: '正在检查你的文件…',
        upload: '正在发送压缩包…',
        queued: this.scanStepQueued,
        analysing: '正在运行分析器…',
        building: '正在汇总结果…'
      }
    }
  },
  hi: {
    hubEyebrow: 'स्रोत विश्लेषण',
    hubTitle: 'एक प्रोजेक्ट खोलें',
    hubDescription:
      'किसी स्थानीय फ़ोल्डर, .zip संग्रह, या GitHub या GitLab रिपॉज़िटरी का स्कैन करें। परिणाम इस वर्कस्पेस में तब तक रहते हैं जब तक सर्वर की रखरखाव नीति लागू नहीं होती।',
    openProjectTitle: 'प्रोजेक्ट खोलें',
    openProjectHint:
      'एक फ़ोल्डर चुनें, .zip अपलोड करें, या Git लिंक चिपकाएँ। Atlasmith पहले इसे आपके कंप्यूटर पर स्कैन करता है, फिर रिपोर्ट बनाता है।',
    sourceFolder: 'फ़ोल्डर',
    sourceZip: 'Zip',
    sourceGit: 'Git URL',
    folderDropTitle: 'फ़ोल्डर यहाँ छोड़ें',
    zipDropTitle: '.zip यहाँ छोड़ें',
    browseLabel: 'ब्राउज़ करें',
    dropOr: 'या',
    folderHint: 'पहले स्थानीय स्कैन · node_modules और .git जैसे बिल्ड फ़ोल्डर छोड़ दिए जाते हैं',
    zipHint(maxLabel) {
      return `संग्रह की अधिकतम साइज़ ${maxLabel} · पहले स्थानीय स्कैन`
    },
    gitUrlLabel: 'रिपॉज़िटरी URL',
    gitUrlHint: 'GitHub या GitLab का HTTPS लिंक',
    invalidGitUrl:
      'GitHub या GitLab रिपॉज़िटरी का URL दर्ज करें, उदाहरण: https://github.com/org/repo',
    branchLabel: 'ब्रांच',
    branchOptional: '(वैकल्पिक)',
    startScan: 'स्कैन शुरू करें',
    scanning: 'स्कैन चल रहा है…',
    uploadProgress: 'अपलोड तैयार हो रहा है…',
    zipUploadTooLarge(actualLabel, maxLabel) {
      return `यह .zip ${actualLabel} का है, जो ${maxLabel} की सीमा से अधिक है।`
    },
    invalidZipUpload: 'केवल एक .zip संग्रह चुनें।',
    scanListTitle: 'हाल के स्कैन',
    scanListEmpty: 'अभी कोई स्कैन नहीं है। ऊपर से एक शुरू करें।',
    loadScansError: 'इस वर्कस्पेस के स्कैन लोड नहीं हो सके।',
    refreshScans: 'रिफ़्रेश करें',
    scanStatus(status) {
      return ({
        queued: 'कतार में',
        running: 'चल रहा है',
        succeeded: 'पूरा हुआ',
        failed: 'विफल',
        cancelled: 'रद्द'
      })[status]
    },
    scanSourceLabel(scan) {
      return sourceLabel(scan, 'फ़ोल्डर अपलोड', 'Git रिमोट')
    },
    scanFailed: 'स्कैन विफल रहा',
    scanStepPrepare: 'तैयारी',
    scanStepUpload: 'अपलोड',
    scanStepQueued: 'आपका स्कैन कतार में है — आमतौर पर एक मिनट से कम।',
    scanStepQueuedTitle: 'कतार में',
    scanStepAnalysing: 'विश्लेषण हो रहा है',
    scanStepBuilding: 'रिपोर्ट बन रही है',
    scanStepSucceeded: 'स्कैन पूरा हुआ',
    scanStepFailed: 'स्कैन विफल रहा',
    scanStepCancelled: 'स्कैन रद्द हुआ',
    scanCancel: 'रद्द करें',
    scanCancelling: 'रद्द किया जा रहा है…',
    scanCompleteToast: 'स्कैन पूरा हुआ',
    viewReportAction: 'रिपोर्ट देखें',
    progressHeading: 'स्कैन की प्रगति',
    selectScan: 'इनसाइट देखें',
    recentScansTitle: 'हाल के स्कैन',
    viewAllScans: 'आर्किटेक्चर खोलें',
    noScanSelected: 'ग्राफ़ देखने के लिए एक पूरा हुआ स्कैन चुनें।',
    loadingScanGraph: 'स्कैन ग्राफ़ लोड हो रहा है…',
    loadScanGraphError: 'इस स्कैन का ग्राफ़ लोड नहीं हो सका।',
    scanStepStatusLines() {
      return {
        prepare: 'आपकी फ़ाइलें जाँची जा रही हैं…',
        upload: 'संग्रह भेजा जा रहा है…',
        queued: this.scanStepQueued,
        analysing: 'विश्लेषक चल रहे हैं…',
        building: 'निष्कर्ष जोड़े जा रहे हैं…'
      }
    }
  },
  ur: {
    hubEyebrow: 'ماخذ کا تجزیہ',
    hubTitle: 'ایک پروجیکٹ کھولیں',
    hubDescription:
      'مقامی فولڈر، .zip محفوظہ، یا GitHub یا GitLab ریپوزٹری کا اسکین کریں۔ نتائج اس ورک اسپیس میں اس وقت تک رہتے ہیں جب تک سرور کی محفوظگی پالیسی لاگو نہ ہو۔',
    openProjectTitle: 'پروجیکٹ کھولیں',
    openProjectHint:
      'ایک فولڈر منتخب کریں، .zip اپ لوڈ کریں، یا Git لنک چسپاں کریں۔ Atlasmith پہلے اسے آپ کے کمپیوٹر پر اسکین کرتا ہے، پھر رپورٹ تیار کرتا ہے۔',
    sourceFolder: 'فولڈر',
    sourceZip: 'Zip',
    sourceGit: 'Git URL',
    folderDropTitle: 'فولڈر یہاں چھوڑیں',
    zipDropTitle: '.zip یہاں چھوڑیں',
    browseLabel: 'براؤز کریں',
    dropOr: 'یا',
    folderHint: 'پہلے مقامی اسکین · node_modules اور .git جیسے بلڈ فولڈر چھوڑ دیے جاتے ہیں',
    zipHint(maxLabel) {
      return `محفوظہ کی زیادہ سے زیادہ سائز ${maxLabel} · پہلے مقامی اسکین`
    },
    gitUrlLabel: 'ریپوزٹری کا URL',
    gitUrlHint: 'GitHub یا GitLab کا HTTPS لنک',
    invalidGitUrl:
      'GitHub یا GitLab ریپوزٹری کا URL درج کریں، مثلاً https://github.com/org/repo',
    branchLabel: 'برانچ',
    branchOptional: '(اختیاری)',
    startScan: 'اسکین شروع کریں',
    scanning: 'اسکین جاری ہے…',
    uploadProgress: 'اپ لوڈ تیار ہو رہا ہے…',
    zipUploadTooLarge(actualLabel, maxLabel) {
      return `یہ .zip ${actualLabel} کا ہے، جو ${maxLabel} کی حد سے زیادہ ہے۔`
    },
    invalidZipUpload: 'صرف ایک .zip محفوظہ منتخب کریں۔',
    scanListTitle: 'حالیہ اسکینز',
    scanListEmpty: 'ابھی کوئی اسکین نہیں۔ اوپر سے ایک شروع کریں۔',
    loadScansError: 'اس ورک اسپیس کے اسکینز لوڈ نہیں ہو سکے۔',
    refreshScans: 'تازہ کریں',
    scanStatus(status) {
      return ({
        queued: 'قطار میں',
        running: 'جاری',
        succeeded: 'مکمل',
        failed: 'ناکام',
        cancelled: 'منسوخ'
      })[status]
    },
    scanSourceLabel(scan) {
      return sourceLabel(scan, 'فولڈر اپ لوڈ', 'Git ریموٹ')
    },
    scanFailed: 'اسکین ناکام رہا',
    scanStepPrepare: 'تیاری',
    scanStepUpload: 'اپ لوڈ',
    scanStepQueued: 'آپ کا اسکین قطار میں ہے — عام طور پر ایک منٹ سے کم۔',
    scanStepQueuedTitle: 'قطار میں',
    scanStepAnalysing: 'تجزیہ ہو رہا ہے',
    scanStepBuilding: 'رپورٹ بن رہی ہے',
    scanStepSucceeded: 'اسکین مکمل ہوا',
    scanStepFailed: 'اسکین ناکام رہا',
    scanStepCancelled: 'اسکین منسوخ ہوا',
    scanCancel: 'منسوخ کریں',
    scanCancelling: 'منسوخ ہو رہا ہے…',
    scanCompleteToast: 'اسکین مکمل ہوا',
    viewReportAction: 'رپورٹ دیکھیں',
    progressHeading: 'اسکین کی پیشرفت',
    selectScan: 'بصیرت دیکھیں',
    recentScansTitle: 'حالیہ اسکینز',
    viewAllScans: 'آرکیٹیکچر کھولیں',
    noScanSelected: 'گراف دیکھنے کے لیے ایک مکمل اسکین منتخب کریں۔',
    loadingScanGraph: 'اسکین گراف لوڈ ہو رہا ہے…',
    loadScanGraphError: 'اس اسکین کا گراف لوڈ نہیں ہو سکا۔',
    scanStepStatusLines() {
      return {
        prepare: 'آپ کی فائلیں جاچی جا رہی ہیں…',
        upload: 'محفوظہ بھیجا جا رہا ہے…',
        queued: this.scanStepQueued,
        analysing: 'تجزیہ کار چل رہے ہیں…',
        building: 'نتائج جمع کیے جا رہے ہیں…'
      }
    }
  }
}
