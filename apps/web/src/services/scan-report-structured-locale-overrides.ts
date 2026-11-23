import type { ScanReportMessages } from './scan-report-messages'
import type { WebLocale } from './locale'

/** Translations for report tab names and structured engine-derived labels. */
export type ScanReportStructuredMessages = Pick<
  ScanReportMessages,
  | 'tabSummary'
  | 'tabFindings'
  | 'tabViolations'
  | 'tabSecurity'
  | 'tabBadPractices'
  | 'tabImprovements'
  | 'tabRemovals'
  | 'tabGraph'
  | 'tabHistory'
  | 'tabArchitecture'
  | 'qualityLabelArchitectureNone'
  | 'qualityLabelCyclesNone'
  | 'qualityLabelCycles'
  | 'qualityLabelHotspotsNone'
  | 'qualityLabelHotspots'
  | 'qualityLabelHotspotsWithMax'
  | 'qualityLabelImportsNone'
  | 'qualityLabelImportsUnresolved'
  | 'qualityLabelImportsExternal'
  | 'qualityLabelSizeNone'
  | 'qualityLabelSizeFiles'
  | 'qualityLabelSizeFunctions'
  | 'qualityLabelForbiddenDeps'
  | 'qualityLabelUndeclaredImports'
  | 'qualityListAnd'
  | 'qualitySmallPenalty'
  | 'duplicatesDescriptionTwoPaths'
  | 'duplicatesDescriptionOnePath'
  | 'duplicatesDescriptionManyPaths'
>

export const scanReportStructuredMessages: Record<Exclude<WebLocale, 'en'>, ScanReportStructuredMessages> = {
  pt: {
    tabSummary: 'Resumo',
    tabFindings: 'Todos os problemas',
    tabViolations: 'Violações de código',
    tabSecurity: 'Segurança',
    tabBadPractices: 'Más práticas',
    tabImprovements: 'Melhorias',
    tabRemovals: 'Remoções',
    tabGraph: 'Gráfico',
    tabHistory: 'Histórico',
    tabArchitecture: (violations) => violations > 0 ? `Arquitetura (${violations})` : 'Arquitetura',
    qualityLabelArchitectureNone: 'Nenhuma quebra de regra de estrutura',
    qualityLabelCyclesNone: 'Nenhuma importação circular',
    qualityLabelCycles: (count) => count === 1 ? '1 importação circular' : `${count} importações circulares`,
    qualityLabelHotspotsNone: 'Nenhum arquivo muito conectado',
    qualityLabelHotspots: (count) => count === 1 ? '1 arquivo é um ponto de risco alto' : `${count} arquivos são pontos de risco altos`,
    qualityLabelHotspotsWithMax: (count, maxCount) => { const base = count === 1 ? '1 arquivo é um ponto de risco alto' : `${count} arquivos são pontos de risco altos`; const extra = maxCount === 1 ? '1 arquivo com a pontuação máxima' : `${maxCount} arquivos com a pontuação máxima`; return `${base}, incluindo ${extra}` },
    qualityLabelImportsNone: 'As importações resolvem corretamente',
    qualityLabelImportsUnresolved: (percent) => `${percent}% das importações não puderam ser resolvidas`,
    qualityLabelImportsExternal: (percent) => `${percent}% das importações vêm de pacotes de terceiros`,
    qualityLabelSizeNone: 'Nenhum arquivo ou função grande demais',
    qualityLabelSizeFiles: (count) => count === 1 ? '1 arquivo muito grande' : `${count} arquivos muito grandes`,
    qualityLabelSizeFunctions: (count) => count === 1 ? '1 função muito grande' : `${count} funções muito grandes`,
    qualityLabelForbiddenDeps: (count) => count === 1 ? '1 dependência proibida' : `${count} dependências proibidas`,
    qualityLabelUndeclaredImports: (count) => count === 1 ? '1 importação não declarada' : `${count} importações não declaradas`,
    qualityListAnd(parts) {
      if (parts.length === 0) return ''
      if (parts.length === 1) return parts[0] ?? ''
      if (parts.length === 2) return `${parts[0]} e ${parts[1]}`
      return `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}`
    },
    qualitySmallPenalty: (categoryTitle) => `uma pequena penalidade de ${categoryTitle.toLowerCase()}`,
    duplicatesDescriptionTwoPaths: (lines, pathA, pathB) => { const block = lines === 1 ? '1 linha idêntica' : `${lines} linhas idênticas`; return `${block} em ${pathA} e ${pathB}` },
    duplicatesDescriptionOnePath: (lines, count, path) => { const block = lines === 1 ? '1 linha idêntica' : `${lines} linhas idênticas`; const times = count === 2 ? 'duas vezes' : `${count} vezes`; return `${block} aparecem ${times} em ${path}` },
    duplicatesDescriptionManyPaths: (lines, fileCount) => { const block = lines === 1 ? '1 linha idêntica' : `${lines} linhas idênticas`; return `${block} em ${fileCount} arquivos` },
  },
  it: {
    tabSummary: 'Riepilogo',
    tabFindings: 'Tutti i problemi',
    tabViolations: 'Violazioni del codice',
    tabSecurity: 'Sicurezza',
    tabBadPractices: 'Cattive pratiche',
    tabImprovements: 'Miglioramenti',
    tabRemovals: 'Elementi da rimuovere',
    tabGraph: 'Grafo',
    tabHistory: 'Cronologia',
    tabArchitecture: (violations) => violations > 0 ? `Architettura (${violations})` : 'Architettura',
    qualityLabelArchitectureNone: 'Nessuna violazione delle regole di struttura',
    qualityLabelCyclesNone: 'Nessun import circolare',
    qualityLabelCycles: (count) => count === 1 ? '1 import circolare' : `${count} import circolari`,
    qualityLabelHotspotsNone: 'Nessun file molto connesso',
    qualityLabelHotspots: (count) => count === 1 ? '1 file è un hotspot pesante' : `${count} file sono hotspot pesanti`,
    qualityLabelHotspotsWithMax: (count, maxCount) => { const base = count === 1 ? '1 file è un hotspot pesante' : `${count} file sono hotspot pesanti`; const extra = maxCount === 1 ? '1 file al punteggio massimo' : `${maxCount} file al punteggio massimo`; return `${base}, di cui ${extra}` },
    qualityLabelImportsNone: 'Gli import si risolvono correttamente',
    qualityLabelImportsUnresolved: (percent) => `Impossibile risolvere il ${percent}% degli import`,
    qualityLabelImportsExternal: (percent) => `Il ${percent}% degli import proviene da pacchetti di terze parti`,
    qualityLabelSizeNone: 'Nessun file o funzione troppo grande',
    qualityLabelSizeFiles: (count) => count === 1 ? '1 file molto grande' : `${count} file molto grandi`,
    qualityLabelSizeFunctions: (count) => count === 1 ? '1 funzione molto grande' : `${count} funzioni molto grandi`,
    qualityLabelForbiddenDeps: (count) => count === 1 ? '1 dipendenza vietata' : `${count} dipendenze vietate`,
    qualityLabelUndeclaredImports: (count) => count === 1 ? '1 import non dichiarato' : `${count} import non dichiarati`,
    qualityListAnd(parts) {
      if (parts.length === 0) return ''
      if (parts.length === 1) return parts[0] ?? ''
      if (parts.length === 2) return `${parts[0]} e ${parts[1]}`
      return `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}`
    },
    qualitySmallPenalty: (categoryTitle) => `una piccola penalità di ${categoryTitle.toLowerCase()}`,
    duplicatesDescriptionTwoPaths: (lines, pathA, pathB) => { const block = lines === 1 ? '1 riga identica' : `${lines} righe identiche`; return `${block} in ${pathA} e ${pathB}` },
    duplicatesDescriptionOnePath: (lines, count, path) => { const block = lines === 1 ? '1 riga identica' : `${lines} righe identiche`; const times = count === 2 ? 'due volte' : `${count} volte`; return `${block} compaiono ${times} in ${path}` },
    duplicatesDescriptionManyPaths: (lines, fileCount) => { const block = lines === 1 ? '1 riga identica' : `${lines} righe identiche`; return `${block} in ${fileCount} file` },
  },
  fr: {
    tabSummary: 'Résumé',
    tabFindings: 'Tous les problèmes',
    tabViolations: 'Écarts au code',
    tabSecurity: 'Sécurité',
    tabBadPractices: 'Mauvaises pratiques',
    tabImprovements: 'Améliorations',
    tabRemovals: 'Éléments à retirer',
    tabGraph: 'Graphe',
    tabHistory: 'Historique',
    tabArchitecture: (violations) => violations > 0 ? `Architecture (${violations})` : 'Architecture',
    qualityLabelArchitectureNone: 'Aucune rupture des règles de structure',
    qualityLabelCyclesNone: 'Aucun import circulaire',
    qualityLabelCycles: (count) => count === 1 ? '1 import circulaire' : `${count} imports circulaires`,
    qualityLabelHotspotsNone: 'Aucun fichier fortement connecté',
    qualityLabelHotspots: (count) => count === 1 ? '1 fichier est un point de risque élevé' : `${count} fichiers sont des points de risque élevés`,
    qualityLabelHotspotsWithMax: (count, maxCount) => { const base = count === 1 ? '1 fichier est un point de risque élevé' : `${count} fichiers sont des points de risque élevés`; const extra = maxCount === 1 ? '1 fichier à la note maximale' : `${maxCount} fichiers à la note maximale`; return `${base}, dont ${extra}` },
    qualityLabelImportsNone: 'Les imports se résolvent correctement',
    qualityLabelImportsUnresolved: (percent) => `${percent} % des imports n’ont pas pu être résolus`,
    qualityLabelImportsExternal: (percent) => `${percent} % des imports viennent de paquets tiers`,
    qualityLabelSizeNone: 'Aucun fichier ni fonction trop volumineux',
    qualityLabelSizeFiles: (count) => count === 1 ? '1 fichier très volumineux' : `${count} fichiers très volumineux`,
    qualityLabelSizeFunctions: (count) => count === 1 ? '1 fonction très volumineuse' : `${count} fonctions très volumineuses`,
    qualityLabelForbiddenDeps: (count) => count === 1 ? '1 dépendance interdite' : `${count} dépendances interdites`,
    qualityLabelUndeclaredImports: (count) => count === 1 ? '1 import non déclaré' : `${count} imports non déclarés`,
    qualityListAnd(parts) {
      if (parts.length === 0) return ''
      if (parts.length === 1) return parts[0] ?? ''
      if (parts.length === 2) return `${parts[0]} et ${parts[1]}`
      return `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}`
    },
    qualitySmallPenalty: (categoryTitle) => `une petite pénalité de ${categoryTitle.toLowerCase()}`,
    duplicatesDescriptionTwoPaths: (lines, pathA, pathB) => { const block = lines === 1 ? '1 ligne identique' : `${lines} lignes identiques`; return `${block} dans ${pathA} et ${pathB}` },
    duplicatesDescriptionOnePath: (lines, count, path) => { const block = lines === 1 ? '1 ligne identique' : `${lines} lignes identiques`; const times = count === 2 ? 'deux fois' : `${count} fois`; return `${block} apparaissent ${times} dans ${path}` },
    duplicatesDescriptionManyPaths: (lines, fileCount) => { const block = lines === 1 ? '1 ligne identique' : `${lines} lignes identiques`; return `${block} dans ${fileCount} fichiers` },
  },
  nl: {
    tabSummary: 'Overzicht',
    tabFindings: 'Alle problemen',
    tabViolations: 'Code-overtredingen',
    tabSecurity: 'Beveiliging',
    tabBadPractices: 'Slechte gewoonten',
    tabImprovements: 'Verbeteringen',
    tabRemovals: 'Te verwijderen',
    tabGraph: 'Grafiek',
    tabHistory: 'Geschiedenis',
    tabArchitecture: (violations) => violations > 0 ? `Architectuur (${violations})` : 'Architectuur',
    qualityLabelArchitectureNone: 'Geen schendingen van structuurregels',
    qualityLabelCyclesNone: 'Geen circulaire imports',
    qualityLabelCycles: (count) => count === 1 ? '1 circulaire import' : `${count} circulaire imports`,
    qualityLabelHotspotsNone: 'Geen sterk verbonden hotspots',
    qualityLabelHotspots: (count) => count === 1 ? '1 bestand is een zware hotspot' : `${count} bestanden zijn zware hotspots`,
    qualityLabelHotspotsWithMax: (count, maxCount) => { const base = count === 1 ? '1 bestand is een zware hotspot' : `${count} bestanden zijn zware hotspots`; const extra = maxCount === 1 ? '1 bestand met de maximale score' : `${maxCount} bestanden met de maximale score`; return `${base}, waaronder ${extra}` },
    qualityLabelImportsNone: 'Imports worden netjes herleid',
    qualityLabelImportsUnresolved: (percent) => `${percent}% van de imports kon niet worden herleid`,
    qualityLabelImportsExternal: (percent) => `${percent}% van de imports komt uit pakketten van derden`,
    qualityLabelSizeNone: 'Geen ongewoon grote bestanden of functies',
    qualityLabelSizeFiles: (count) => count === 1 ? '1 zeer groot bestand' : `${count} zeer grote bestanden`,
    qualityLabelSizeFunctions: (count) => count === 1 ? '1 zeer grote functie' : `${count} zeer grote functies`,
    qualityLabelForbiddenDeps: (count) => count === 1 ? '1 verboden afhankelijkheid' : `${count} verboden afhankelijkheden`,
    qualityLabelUndeclaredImports: (count) => count === 1 ? '1 niet-gedeclareerde import' : `${count} niet-gedeclareerde imports`,
    qualityListAnd(parts) {
      if (parts.length === 0) return ''
      if (parts.length === 1) return parts[0] ?? ''
      if (parts.length === 2) return `${parts[0]} en ${parts[1]}`
      return `${parts.slice(0, -1).join(', ')} en ${parts.at(-1)}`
    },
    qualitySmallPenalty: (categoryTitle) => `een kleine aftrek voor ${categoryTitle.toLowerCase()}`,
    duplicatesDescriptionTwoPaths: (lines, pathA, pathB) => { const block = lines === 1 ? '1 identieke regel' : `${lines} identieke regels`; return `${block} in ${pathA} en ${pathB}` },
    duplicatesDescriptionOnePath: (lines, count, path) => { const block = lines === 1 ? '1 identieke regel' : `${lines} identieke regels`; const times = count === 2 ? 'twee keer' : `${count} keer`; return `${block} komen ${times} voor in ${path}` },
    duplicatesDescriptionManyPaths: (lines, fileCount) => { const block = lines === 1 ? '1 identieke regel' : `${lines} identieke regels`; return `${block} in ${fileCount} bestanden` },
  },
  es: {
    tabSummary: 'Resumen',
    tabFindings: 'Todos los problemas',
    tabViolations: 'Infracciones de código',
    tabSecurity: 'Seguridad',
    tabBadPractices: 'Malas prácticas',
    tabImprovements: 'Mejoras',
    tabRemovals: 'Elementos a quitar',
    tabGraph: 'Gráfico',
    tabHistory: 'Historial',
    tabArchitecture: (violations) => violations > 0 ? `Arquitectura (${violations})` : 'Arquitectura',
    qualityLabelArchitectureNone: 'Ninguna ruptura de las reglas de estructura',
    qualityLabelCyclesNone: 'Ninguna importación circular',
    qualityLabelCycles: (count) => count === 1 ? '1 importación circular' : `${count} importaciones circulares`,
    qualityLabelHotspotsNone: 'Ningún archivo muy conectado',
    qualityLabelHotspots: (count) => count === 1 ? '1 archivo es un punto de riesgo alto' : `${count} archivos son puntos de riesgo altos`,
    qualityLabelHotspotsWithMax: (count, maxCount) => { const base = count === 1 ? '1 archivo es un punto de riesgo alto' : `${count} archivos son puntos de riesgo altos`; const extra = maxCount === 1 ? '1 archivo con la puntuación máxima' : `${maxCount} archivos con la puntuación máxima`; return `${base}, de ellos ${extra}` },
    qualityLabelImportsNone: 'Las importaciones se resuelven correctamente',
    qualityLabelImportsUnresolved: (percent) => `No se pudo resolver el ${percent}% de las importaciones`,
    qualityLabelImportsExternal: (percent) => `El ${percent}% de las importaciones viene de paquetes de terceros`,
    qualityLabelSizeNone: 'Ningún archivo ni función demasiado grande',
    qualityLabelSizeFiles: (count) => count === 1 ? '1 archivo muy grande' : `${count} archivos muy grandes`,
    qualityLabelSizeFunctions: (count) => count === 1 ? '1 función muy grande' : `${count} funciones muy grandes`,
    qualityLabelForbiddenDeps: (count) => count === 1 ? '1 dependencia prohibida' : `${count} dependencias prohibidas`,
    qualityLabelUndeclaredImports: (count) => count === 1 ? '1 importación no declarada' : `${count} importaciones no declaradas`,
    qualityListAnd(parts) {
      if (parts.length === 0) return ''
      if (parts.length === 1) return parts[0] ?? ''
      if (parts.length === 2) return `${parts[0]} y ${parts[1]}`
      return `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`
    },
    qualitySmallPenalty: (categoryTitle) => `una pequeña penalización de ${categoryTitle.toLowerCase()}`,
    duplicatesDescriptionTwoPaths: (lines, pathA, pathB) => { const block = lines === 1 ? '1 línea idéntica' : `${lines} líneas idénticas`; return `${block} en ${pathA} y ${pathB}` },
    duplicatesDescriptionOnePath: (lines, count, path) => { const block = lines === 1 ? '1 línea idéntica' : `${lines} líneas idénticas`; const times = count === 2 ? 'dos veces' : `${count} veces`; return `${block} aparecen ${times} en ${path}` },
    duplicatesDescriptionManyPaths: (lines, fileCount) => { const block = lines === 1 ? '1 línea idéntica' : `${lines} líneas idénticas`; return `${block} en ${fileCount} archivos` },
  },
  ja: {
    tabSummary: '概要',
    tabFindings: 'すべての問題',
    tabViolations: 'コードの違反',
    tabSecurity: 'セキュリティ',
    tabBadPractices: '好ましくない書き方',
    tabImprovements: '改善',
    tabRemovals: '削除候補',
    tabGraph: 'グラフ',
    tabHistory: '履歴',
    tabArchitecture: (violations) => violations > 0 ? `アーキテクチャ（${violations}）` : 'アーキテクチャ',
    qualityLabelArchitectureNone: '構造ルールの違反はありません',
    qualityLabelCyclesNone: '循環インポートはありません',
    qualityLabelCycles: (count) => `${count} 件の循環インポート`,
    qualityLabelHotspotsNone: 'つながりが多いホットスポットはありません',
    qualityLabelHotspots: (count) => `負荷の高いホットスポットが ${count} ファイルあります`,
    qualityLabelHotspotsWithMax: (count, maxCount) => `負荷の高いホットスポットが ${count} ファイルあり、うち ${maxCount} ファイルが最高点です`,
    qualityLabelImportsNone: 'インポートは正しく解決されています',
    qualityLabelImportsUnresolved: (percent) => `インポートの ${percent}% を解決できませんでした`,
    qualityLabelImportsExternal: (percent) => `インポートの ${percent}% はサードパーティ製パッケージです`,
    qualityLabelSizeNone: '極端に大きなファイルや関数はありません',
    qualityLabelSizeFiles: (count) => `非常に大きなファイルが ${count} 個`,
    qualityLabelSizeFunctions: (count) => `非常に大きな関数が ${count} 個`,
    qualityLabelForbiddenDeps: (count) => `禁止された依存が ${count} 件`,
    qualityLabelUndeclaredImports: (count) => `未宣言のインポートが ${count} 件`,
    qualityListAnd(parts) {
      if (parts.length === 0) return ''
      if (parts.length === 1) return parts[0] ?? ''
      return parts.join('、')
    },
    qualitySmallPenalty: (categoryTitle) => `${categoryTitle}の小さな減点`,
    duplicatesDescriptionTwoPaths: (lines, pathA, pathB) => `${lines} 行が ${pathA} と ${pathB} で同一です`,
    duplicatesDescriptionOnePath: (lines, count, path) => `${lines} 行が ${path} に ${count} 回現れます`,
    duplicatesDescriptionManyPaths: (lines, fileCount) => `${lines} 行が ${fileCount} ファイルにあります`,
  },
  'zh-Hans': {
    tabSummary: '摘要',
    tabFindings: '全部问题',
    tabViolations: '代码违规',
    tabSecurity: '安全',
    tabBadPractices: '不良做法',
    tabImprovements: '改进',
    tabRemovals: '待删除项',
    tabGraph: '关系图',
    tabHistory: '历史',
    tabArchitecture: (violations) => violations > 0 ? `架构（${violations}）` : '架构',
    qualityLabelArchitectureNone: '没有结构规则被打破',
    qualityLabelCyclesNone: '没有循环导入',
    qualityLabelCycles: (count) => `${count} 处循环导入`,
    qualityLabelHotspotsNone: '没有高度关联的热点文件',
    qualityLabelHotspots: (count) => `${count} 个文件是高风险热点`,
    qualityLabelHotspotsWithMax: (count, maxCount) => `${count} 个文件是高风险热点，其中 ${maxCount} 个达到最高分`,
    qualityLabelImportsNone: '导入都能正确解析',
    qualityLabelImportsUnresolved: (percent) => `${percent}% 的导入无法解析`,
    qualityLabelImportsExternal: (percent) => `${percent}% 的导入来自第三方包`,
    qualityLabelSizeNone: '没有异常大的文件或函数',
    qualityLabelSizeFiles: (count) => `${count} 个非常大的文件`,
    qualityLabelSizeFunctions: (count) => `${count} 个非常大的函数`,
    qualityLabelForbiddenDeps: (count) => `${count} 处禁止的依赖`,
    qualityLabelUndeclaredImports: (count) => `${count} 处未声明的导入`,
    qualityListAnd(parts) {
      if (parts.length === 0) return ''
      if (parts.length === 1) return parts[0] ?? ''
      if (parts.length === 2) return `${parts[0]}和${parts[1]}`
      return `${parts.slice(0, -1).join('、')}和${parts.at(-1)}`
    },
    qualitySmallPenalty: (categoryTitle) => `${categoryTitle}有少量扣分`,
    duplicatesDescriptionTwoPaths: (lines, pathA, pathB) => `${lines} 行相同代码出现在 ${pathA} 和 ${pathB}`,
    duplicatesDescriptionOnePath: (lines, count, path) => `${lines} 行相同代码在 ${path} 中出现 ${count} 次`,
    duplicatesDescriptionManyPaths: (lines, fileCount) => `${lines} 行相同代码出现在 ${fileCount} 个文件中`,
  },
  hi: {
    tabSummary: 'सारांश',
    tabFindings: 'सभी समस्याएँ',
    tabViolations: 'कोड उल्लंघन',
    tabSecurity: 'सुरक्षा',
    tabBadPractices: 'खराब प्रथाएँ',
    tabImprovements: 'सुधार',
    tabRemovals: 'हटाने योग्य',
    tabGraph: 'ग्राफ़',
    tabHistory: 'इतिहास',
    tabArchitecture: (violations) => violations > 0 ? `आर्किटेक्चर (${violations})` : 'आर्किटेक्चर',
    qualityLabelArchitectureNone: 'संरचना नियमों का कोई उल्लंघन नहीं',
    qualityLabelCyclesNone: 'कोई चक्रीय इंपोर्ट नहीं',
    qualityLabelCycles: (count) => count === 1 ? '1 चक्रीय इंपोर्ट' : `${count} चक्रीय इंपोर्ट`,
    qualityLabelHotspotsNone: 'कोई अत्यधिक जुड़ा हॉटस्पॉट नहीं',
    qualityLabelHotspots: (count) => count === 1 ? '1 फ़ाइल भारी हॉटस्पॉट है' : `${count} फ़ाइलें भारी हॉटस्पॉट हैं`,
    qualityLabelHotspotsWithMax: (count, maxCount) => { const base = count === 1 ? '1 फ़ाइल भारी हॉटस्पॉट है' : `${count} फ़ाइलें भारी हॉटस्पॉट हैं`; const extra = maxCount === 1 ? '1 फ़ाइल अधिकतम अंक पर' : `${maxCount} फ़ाइलें अधिकतम अंक पर`; return `${base}, जिनमें ${extra}` },
    qualityLabelImportsNone: 'इंपोर्ट सही ढंग से हल हो जाते हैं',
    qualityLabelImportsUnresolved: (percent) => `${percent}% इंपोर्ट हल नहीं हो सके`,
    qualityLabelImportsExternal: (percent) => `${percent}% इंपोर्ट तीसरे पक्ष के पैकेज से हैं`,
    qualityLabelSizeNone: 'कोई असामान्य रूप से बड़ी फ़ाइल या फ़ंक्शन नहीं',
    qualityLabelSizeFiles: (count) => count === 1 ? '1 बहुत बड़ी फ़ाइल' : `${count} बहुत बड़ी फ़ाइलें`,
    qualityLabelSizeFunctions: (count) => count === 1 ? '1 बहुत बड़ा फ़ंक्शन' : `${count} बहुत बड़े फ़ंक्शन`,
    qualityLabelForbiddenDeps: (count) => count === 1 ? '1 निषिद्ध निर्भरता' : `${count} निषिद्ध निर्भरताएँ`,
    qualityLabelUndeclaredImports: (count) => count === 1 ? '1 अघोषित इंपोर्ट' : `${count} अघोषित इंपोर्ट`,
    qualityListAnd(parts) {
      if (parts.length === 0) return ''
      if (parts.length === 1) return parts[0] ?? ''
      if (parts.length === 2) return `${parts[0]} और ${parts[1]}`
      return `${parts.slice(0, -1).join(', ')} और ${parts.at(-1)}`
    },
    qualitySmallPenalty: (categoryTitle) => `${categoryTitle} का थोड़ा दंड`,
    duplicatesDescriptionTwoPaths: (lines, pathA, pathB) => { const block = lines === 1 ? '1 समान पंक्ति' : `${lines} समान पंक्तियाँ`; return `${block} ${pathA} और ${pathB} में` },
    duplicatesDescriptionOnePath: (lines, count, path) => { const block = lines === 1 ? '1 समान पंक्ति' : `${lines} समान पंक्तियाँ`; return `${block} ${path} में ${count} बार आती हैं` },
    duplicatesDescriptionManyPaths: (lines, fileCount) => { const block = lines === 1 ? '1 समान पंक्ति' : `${lines} समान पंक्तियाँ`; return `${block} ${fileCount} फ़ाइलों में` },
  },
  ur: {
    tabSummary: 'خلاصہ',
    tabFindings: 'تمام مسائل',
    tabViolations: 'کوڈ کی خلاف ورزیاں',
    tabSecurity: 'سیکیورٹی',
    tabBadPractices: 'خراب طریقے',
    tabImprovements: 'بہتری',
    tabRemovals: 'ہٹانے کے قابل',
    tabGraph: 'گراف',
    tabHistory: 'تاریخ',
    tabArchitecture: (violations) => violations > 0 ? `آرکیٹیکچر (${violations})` : 'آرکیٹیکچر',
    qualityLabelArchitectureNone: 'ڈھانچے کے قواعد کی کوئی خلاف ورزی نہیں',
    qualityLabelCyclesNone: 'کوئی چکری امپورٹ نہیں',
    qualityLabelCycles: (count) => count === 1 ? '1 چکری امپورٹ' : `${count} چکری امپورٹس`,
    qualityLabelHotspotsNone: 'کوئی زیادہ جڑا ہوا ہاٹ سپاٹ نہیں',
    qualityLabelHotspots: (count) => count === 1 ? '1 فائل ایک بھاری ہاٹ سپاٹ ہے' : `${count} فائلیں بھاری ہاٹ سپاٹس ہیں`,
    qualityLabelHotspotsWithMax: (count, maxCount) => { const base = count === 1 ? '1 فائل ایک بھاری ہاٹ سپاٹ ہے' : `${count} فائلیں بھاری ہاٹ سپاٹس ہیں`; const extra = maxCount === 1 ? '1 فائل زیادہ سے زیادہ اسکور پر' : `${maxCount} فائلیں زیادہ سے زیادہ اسکور پر`; return `${base}، جن میں ${extra}` },
    qualityLabelImportsNone: 'امپورٹس ٹھیک سے حل ہو جاتی ہیں',
    qualityLabelImportsUnresolved: (percent) => `${percent}% امپورٹس حل نہیں ہو سکیں`,
    qualityLabelImportsExternal: (percent) => `${percent}% امپورٹس فریق ثالث کے پیکجز سے آتی ہیں`,
    qualityLabelSizeNone: 'کوئی غیر معمولی بڑی فائل یا فنکشن نہیں',
    qualityLabelSizeFiles: (count) => count === 1 ? '1 بہت بڑی فائل' : `${count} بہت بڑی فائلیں`,
    qualityLabelSizeFunctions: (count) => count === 1 ? '1 بہت بڑا فنکشن' : `${count} بہت بڑے فنکشنز`,
    qualityLabelForbiddenDeps: (count) => count === 1 ? '1 ممنوعہ انحصار' : `${count} ممنوعہ انحصارات`,
    qualityLabelUndeclaredImports: (count) => count === 1 ? '1 غیر اعلان شدہ امپورٹ' : `${count} غیر اعلان شدہ امپورٹس`,
    qualityListAnd(parts) {
      if (parts.length === 0) return ''
      if (parts.length === 1) return parts[0] ?? ''
      if (parts.length === 2) return `${parts[0]} اور ${parts[1]}`
      return `${parts.slice(0, -1).join('، ')} اور ${parts.at(-1)}`
    },
    qualitySmallPenalty: (categoryTitle) => `${categoryTitle} کا ہلکا جرمانہ`,
    duplicatesDescriptionTwoPaths: (lines, pathA, pathB) => { const block = lines === 1 ? '1 ایک جیسی سطر' : `${lines} ایک جیسی سطریں`; return `${block} ${pathA} اور ${pathB} میں` },
    duplicatesDescriptionOnePath: (lines, count, path) => { const block = lines === 1 ? '1 ایک جیسی سطر' : `${lines} ایک جیسی سطریں`; return `${block} ${path} میں ${count} بار آتی ہیں` },
    duplicatesDescriptionManyPaths: (lines, fileCount) => { const block = lines === 1 ? '1 ایک جیسی سطر' : `${lines} ایک جیسی سطریں`; return `${block} ${fileCount} فائلوں میں` },
  }
}
