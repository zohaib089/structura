import type { WebLocale } from '../services/locale'
import type { ViewerMessages } from './messages'

export type ViewerChromeMessages = Pick<
  ViewerMessages,
  | 'layoutLabel'
  | 'layoutRadial'
  | 'layoutLinear'
  | 'coachOpenLabel'
  | 'zoomFit'
  | 'zoomFitShort'
  | 'fileListLabel'
  | 'fitTooltip'
  | 'provExtracted'
  | 'provExtractedDesc'
  | 'provInferred'
  | 'provInferredDesc'
  | 'provUnresolved'
  | 'provUnresolvedDesc'
  | 'provMixed'
  | 'provMixedDesc'
  | 'budgetMeter'
  | 'search'
  | 'searchPlaceholder'
  | 'searchTooltip'
  | 'searchShort'
  | 'searchNone'
  | 'searchHint'
  | 'searchMore'
  | 'searchFooter'
  | 'searchClusters'
  | 'searchFiles'
  | 'searchSymbols'
  | 'crumbRoot'
  | 'provMixedCounts'
>

function linksMeter(
  onMap: (nodes: string) => string,
  oneLink: (edges: string) => string,
  manyLinks: (edges: string) => string
): ViewerMessages['budgetMeter'] {
  return (nodes, edges, edgeCount) =>
    `${onMap(nodes)} · ${edgeCount === 1 ? oneLink(edges) : manyLinks(edges)}`
}

export const viewerChromeMessages: Record<Exclude<WebLocale, 'en'>, ViewerChromeMessages> = {
  pt: {
    layoutLabel: 'Disposição',
    layoutRadial: 'Radial',
    layoutLinear: 'Linear',
    coachOpenLabel: 'Dicas',
    zoomFit: 'Ajustar à vista',
    zoomFitShort: 'Ajustar',
    fileListLabel: (count) => `Arquivos à vista (${count})`,
    fitTooltip: 'Ajustar o zoom para o gráfico caber na tela',
    provExtracted: 'Encontrado no código',
    provExtractedDesc: 'Visto diretamente no código',
    provInferred: 'Provável',
    provInferredDesc: 'Não comprovado no código-fonte',
    provUnresolved: 'Não foi possível confirmar',
    provUnresolvedDesc: 'Destino não encontrado',
    provMixed: 'Misto',
    provMixedDesc: 'O grupo contém mais de um tipo de certeza',
    budgetMeter: linksMeter(
      (nodes) => `${nodes} no mapa`,
      (edges) => `${edges} ligação`,
      (edges) => `${edges} ligações`
    ),
    search: 'Pesquisar arquivos, símbolos e camadas',
    searchPlaceholder: 'Pesquisar arquivos e símbolos',
    searchTooltip: 'Encontrar um arquivo ou símbolo pelo nome',
    searchShort: 'Pesquisar',
    searchNone: 'Nenhum resultado para “{q}”',
    searchHint: 'Tente um nome de arquivo ou id de camada',
    searchMore: '{n} resultados a mais. Continue digitando.',
    searchFooter: '↑↓ navegar · Enter ir (expande os pais) · Esc fechar',
    searchClusters: 'Agrupamentos',
    searchFiles: 'Arquivos',
    searchSymbols: 'Símbolos',
    crumbRoot: 'Tudo',
    provMixedCounts: (extracted, inferred) =>
      `${extracted} encontrado${extracted === 1 ? '' : 's'} no código · ${inferred} inferido${inferred === 1 ? '' : 's'} pelo contexto`
  },
  it: {
    layoutLabel: 'Disposizione',
    layoutRadial: 'Radiale',
    layoutLinear: 'Lineare',
    coachOpenLabel: 'Suggerimenti',
    zoomFit: 'Adatta alla vista',
    zoomFitShort: 'Adatta',
    fileListLabel: (count) => `File in vista (${count})`,
    fitTooltip: 'Regola lo zoom così il grafo sta nello schermo',
    provExtracted: 'Trovato nel codice',
    provExtractedDesc: 'Visto direttamente nel codice',
    provInferred: 'Probabile',
    provInferredDesc: 'Non dimostrato nel codice sorgente',
    provUnresolved: 'Impossibile confermare',
    provUnresolvedDesc: 'Destinazione non trovata',
    provMixed: 'Misto',
    provMixedDesc: 'Il gruppo contiene più di un tipo di certezza',
    budgetMeter: linksMeter(
      (nodes) => `${nodes} sulla mappa`,
      (edges) => `${edges} collegamento`,
      (edges) => `${edges} collegamenti`
    ),
    search: 'Cerca file, simboli e livelli',
    searchPlaceholder: 'Cerca file e simboli',
    searchTooltip: 'Trova un file o un simbolo per nome',
    searchShort: 'Cerca',
    searchNone: 'Nessun risultato per “{q}”',
    searchHint: 'Prova un nome di file o un id di livello',
    searchMore: '{n} altri risultati. Continua a scrivere.',
    searchFooter: '↑↓ scorri · Invio vai (espande i genitori) · Esc chiudi',
    searchClusters: 'Raggruppamenti',
    searchFiles: 'File',
    searchSymbols: 'Simboli',
    crumbRoot: 'Tutto',
    provMixedCounts: (extracted, inferred) =>
      `${extracted} trovat${extracted === 1 ? 'o' : 'i'} nel codice · ${inferred} ipotizzat${inferred === 1 ? 'o' : 'i'} dal contesto`
  },
  fr: {
    layoutLabel: 'Disposition',
    layoutRadial: 'Radial',
    layoutLinear: 'Linéaire',
    coachOpenLabel: 'Astuces',
    zoomFit: 'Ajuster à la vue',
    zoomFitShort: 'Ajuster',
    fileListLabel: (count) => `Fichiers visibles (${count})`,
    fitTooltip: 'Régler le zoom pour que le graphe tienne à l’écran',
    provExtracted: 'Trouvé dans le code',
    provExtractedDesc: 'Vu directement dans le code',
    provInferred: 'Probable',
    provInferredDesc: 'Non prouvé dans le code source',
    provUnresolved: 'Impossible à confirmer',
    provUnresolvedDesc: 'Cible introuvable',
    provMixed: 'Mixte',
    provMixedDesc: 'Le groupe contient plus d’un type de certitude',
    budgetMeter: linksMeter(
      (nodes) => `${nodes} sur la carte`,
      (edges) => `${edges} lien`,
      (edges) => `${edges} liens`
    ),
    search: 'Rechercher des fichiers, des symboles et des couches',
    searchPlaceholder: 'Rechercher des fichiers et des symboles',
    searchTooltip: 'Trouver un fichier ou un symbole par son nom',
    searchShort: 'Rechercher',
    searchNone: 'Aucun résultat pour « {q} »',
    searchHint: 'Essayez un nom de fichier ou un identifiant de couche',
    searchMore: '{n} autres résultats. Continuez à saisir.',
    searchFooter: '↑↓ parcourir · Entrée aller (ouvre les parents) · Échap fermer',
    searchClusters: 'Regroupements',
    searchFiles: 'Fichiers',
    searchSymbols: 'Symboles',
    crumbRoot: 'Tout',
    provMixedCounts: (extracted, inferred) =>
      `${extracted} trouvé${extracted === 1 ? '' : 's'} dans le code · ${inferred} déduit${inferred === 1 ? '' : 's'} du contexte`
  },
  nl: {
    layoutLabel: 'Indeling',
    layoutRadial: 'Radiaal',
    layoutLinear: 'Lineair',
    coachOpenLabel: 'Tips',
    zoomFit: 'Passend zoomen',
    zoomFitShort: 'Passend',
    fileListLabel: (count) => `Bestanden in beeld (${count})`,
    fitTooltip: 'Zoom zodat de hele grafiek op het scherm past',
    provExtracted: 'Gevonden in de code',
    provExtractedDesc: 'Rechtstreeks in de code gezien',
    provInferred: 'Waarschijnlijk',
    provInferredDesc: 'Niet bewezen in de broncode',
    provUnresolved: 'Kon niet bevestigen',
    provUnresolvedDesc: 'Doel niet gevonden',
    provMixed: 'Gemengd',
    provMixedDesc: 'De groep bevat meer dan één soort zekerheid',
    budgetMeter: linksMeter(
      (nodes) => `${nodes} op de kaart`,
      (edges) => `${edges} koppeling`,
      (edges) => `${edges} koppelingen`
    ),
    search: 'Zoek bestanden, symbolen en lagen',
    searchPlaceholder: 'Zoek bestanden en symbolen',
    searchTooltip: 'Zoek een bestand of symbool op naam',
    searchShort: 'Zoeken',
    searchNone: 'Geen resultaten voor “{q}”',
    searchHint: 'Probeer een bestandsnaam of een laag-id',
    searchMore: '{n} resultaten extra. Typ verder.',
    searchFooter: '↑↓ navigeren · Enter springen (klapt ouders uit) · Esc sluiten',
    searchClusters: 'Groepen',
    searchFiles: 'Bestanden',
    searchSymbols: 'Symbolen',
    crumbRoot: 'Alles',
    provMixedCounts: (extracted, inferred) =>
      `${extracted} gevonden in de bron · ${inferred} afgeleid uit de context`
  },
  es: {
    layoutLabel: 'Disposición',
    layoutRadial: 'Radial',
    layoutLinear: 'Lineal',
    coachOpenLabel: 'Consejos',
    zoomFit: 'Ajustar a la vista',
    zoomFitShort: 'Ajustar',
    fileListLabel: (count) => `Archivos a la vista (${count})`,
    fitTooltip: 'Ajusta el zoom para que el gráfico quepa en la pantalla',
    provExtracted: 'Encontrado en el código',
    provExtractedDesc: 'Visto directamente en el código',
    provInferred: 'Probable',
    provInferredDesc: 'No demostrado en el código fuente',
    provUnresolved: 'No se pudo confirmar',
    provUnresolvedDesc: 'Destino no encontrado',
    provMixed: 'Mixto',
    provMixedDesc: 'El grupo contiene más de un tipo de certeza',
    budgetMeter: linksMeter(
      (nodes) => `${nodes} en el mapa`,
      (edges) => `${edges} enlace`,
      (edges) => `${edges} enlaces`
    ),
    search: 'Buscar archivos, símbolos y capas',
    searchPlaceholder: 'Buscar archivos y símbolos',
    searchTooltip: 'Encuentra un archivo o un símbolo por su nombre',
    searchShort: 'Buscar',
    searchNone: 'No hay resultados para “{q}”',
    searchHint: 'Prueba un nombre de archivo o un id de capa',
    searchMore: '{n} resultados más. Sigue escribiendo.',
    searchFooter: '↑↓ recorrer · Intro ir (expande los padres) · Esc cerrar',
    searchClusters: 'Agrupaciones',
    searchFiles: 'Archivos',
    searchSymbols: 'Símbolos',
    crumbRoot: 'Todo',
    provMixedCounts: (extracted, inferred) =>
      `${extracted} encontrado${extracted === 1 ? '' : 's'} en el código · ${inferred} inferido${inferred === 1 ? '' : 's'} del contexto`
  },
  ja: {
    layoutLabel: 'レイアウト',
    layoutRadial: '放射',
    layoutLinear: '線形',
    coachOpenLabel: 'ヒント',
    zoomFit: '全体を表示',
    zoomFitShort: '全体',
    fileListLabel: (count) => `表示中のファイル（${count}）`,
    fitTooltip: 'グラフ全体が画面に収まるようにズームします',
    provExtracted: 'コード内で確認',
    provExtractedDesc: 'コードに直接書かれています',
    provInferred: 'おそらく',
    provInferredDesc: 'ソースコードでは証明されていません',
    provUnresolved: '確認できませんでした',
    provUnresolvedDesc: '行き先が見つかりません',
    provMixed: '混在',
    provMixedDesc: 'グループに複数の確度が混ざっています',
    budgetMeter: linksMeter(
      (nodes) => `マップ上 ${nodes}`,
      (edges) => `リンク ${edges}`,
      (edges) => `リンク ${edges}`
    ),
    search: 'ファイル、シンボル、レイヤーを検索',
    searchPlaceholder: 'ファイルとシンボルを検索',
    searchTooltip: '名前でファイルまたはシンボルを探す',
    searchShort: '検索',
    searchNone: '「{q}」に一致するものはありません',
    searchHint: 'ファイル名またはレイヤー ID を試してください',
    searchMore: 'さらに {n} 件。入力を続けてください。',
    searchFooter: '↑↓ 移動 · Enter でジャンプ（親を展開） · Esc で閉じる',
    searchClusters: 'クラスター',
    searchFiles: 'ファイル',
    searchSymbols: 'シンボル',
    crumbRoot: 'すべて',
    provMixedCounts: (extracted, inferred) =>
      `ソースで確認 ${extracted} · 文脈から推定 ${inferred}`
  },
  'zh-Hans': {
    layoutLabel: '布局',
    layoutRadial: '放射',
    layoutLinear: '线性',
    coachOpenLabel: '提示',
    zoomFit: '适应视图',
    zoomFitShort: '适应',
    fileListLabel: (count) => `当前可见文件（${count}）`,
    fitTooltip: '缩放使整张图适应屏幕',
    provExtracted: '在代码中找到',
    provExtractedDesc: '直接在代码中看到',
    provInferred: '可能',
    provInferredDesc: '未在源代码中证实',
    provUnresolved: '无法确认',
    provUnresolvedDesc: '未找到目标',
    provMixed: '混合',
    provMixedDesc: '该组包含不止一种确定程度',
    budgetMeter: linksMeter(
      (nodes) => `图上 ${nodes}`,
      (edges) => `${edges} 条链接`,
      (edges) => `${edges} 条链接`
    ),
    search: '搜索文件、符号和分层',
    searchPlaceholder: '搜索文件和符号',
    searchTooltip: '按名称查找文件或符号',
    searchShort: '搜索',
    searchNone: '没有与“{q}”匹配的结果',
    searchHint: '试试文件名或分层 ID',
    searchMore: '还有 {n} 条匹配。请继续输入。',
    searchFooter: '↑↓ 浏览 · Enter 跳转（展开上级） · Esc 关闭',
    searchClusters: '分组',
    searchFiles: '文件',
    searchSymbols: '符号',
    crumbRoot: '全部',
    provMixedCounts: (extracted, inferred) =>
      `源码中找到 ${extracted} · 根据上下文推测 ${inferred}`
  },
  hi: {
    layoutLabel: 'लेआउट',
    layoutRadial: 'रेडियल',
    layoutLinear: 'रैखिक',
    coachOpenLabel: 'सुझाव',
    zoomFit: 'पूरी तरह दिखाएँ',
    zoomFitShort: 'फिट',
    fileListLabel: (count) => `दिखाई देने वाली फ़ाइलें (${count})`,
    fitTooltip: 'ज़ूम करें ताकि पूरा ग्राफ़ स्क्रीन में आ जाए',
    provExtracted: 'कोड में मिला',
    provExtractedDesc: 'सीधे कोड में देखा गया',
    provInferred: 'संभावित',
    provInferredDesc: 'स्रोत कोड में सिद्ध नहीं',
    provUnresolved: 'पुष्टि नहीं हो सकी',
    provUnresolvedDesc: 'लक्ष्य नहीं मिला',
    provMixed: 'मिश्रित',
    provMixedDesc: 'समूह में एक से अधिक तरह की निश्चितता है',
    budgetMeter: linksMeter(
      (nodes) => `मानचित्र पर ${nodes}`,
      (edges) => `${edges} लिंक`,
      (edges) => `${edges} लिंक`
    ),
    search: 'फ़ाइलें, सिंबल और परतें खोजें',
    searchPlaceholder: 'फ़ाइलें और सिंबल खोजें',
    searchTooltip: 'नाम से कोई फ़ाइल या सिंबल ढूँढ़ें',
    searchShort: 'खोजें',
    searchNone: '“{q}” से कोई मेल नहीं',
    searchHint: 'फ़ाइल का नाम या परत आईडी आज़माएँ',
    searchMore: '{n} और मेल। लिखते रहें।',
    searchFooter: '↑↓ घूमें · Enter जाएँ (पैरेंट खुलते हैं) · Esc बंद करें',
    searchClusters: 'समूह',
    searchFiles: 'फ़ाइलें',
    searchSymbols: 'सिंबल',
    crumbRoot: 'सभी',
    provMixedCounts: (extracted, inferred) =>
      `स्रोत में ${extracted} मिले · संदर्भ से ${inferred} अनुमानित`
  },
  ur: {
    layoutLabel: 'لے آؤٹ',
    layoutRadial: 'ریڈیل',
    layoutLinear: 'لکیری',
    coachOpenLabel: 'تجاویز',
    zoomFit: 'منظر کے مطابق',
    zoomFitShort: 'فٹ',
    fileListLabel: (count) => `نظر آنے والی فائلیں (${count})`,
    fitTooltip: 'زوم کریں تاکہ پورا گراف اسکرین میں آ جائے۔',
    provExtracted: 'کوڈ میں ملا',
    provExtractedDesc: 'براہ راست کوڈ میں دیکھا گیا',
    provInferred: 'ممکنہ',
    provInferredDesc: 'سورس کوڈ میں ثابت نہیں',
    provUnresolved: 'تصدیق نہیں ہو سکی',
    provUnresolvedDesc: 'منزل نہیں ملی',
    provMixed: 'مخلوط',
    provMixedDesc: 'گروپ میں ایک سے زیادہ قسم کی یقین دہانی ہے',
    budgetMeter: linksMeter(
      (nodes) => `نقشے پر ${nodes}`,
      (edges) => `${edges} لنک`,
      (edges) => `${edges} لنکس`
    ),
    search: 'فائلیں، علامتیں اور تہیں تلاش کریں',
    searchPlaceholder: 'فائلیں اور علامتیں تلاش کریں',
    searchTooltip: 'نام سے فائل یا علامت ڈھونڈیں',
    searchShort: 'تلاش',
    searchNone: '“{q}” سے کوئی میل نہیں',
    searchHint: 'فائل کا نام یا تہہ آئی ڈی آزمائیں',
    searchMore: '{n} مزید نتائج۔ لکھتے رہیں۔',
    searchFooter: '↑↓ گھومیں · Enter جائیں (پیرنٹ کھلتے ہیں) · Esc بند کریں',
    searchClusters: 'گروپ',
    searchFiles: 'فائلیں',
    searchSymbols: 'علامات',
    crumbRoot: 'سب',
    provMixedCounts: (extracted, inferred) =>
      `سورس میں ${extracted} ملے · سیاق سے ${inferred} اندازہ`
  }
}
