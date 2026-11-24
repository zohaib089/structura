import type { WebLocale } from './locale'
import type { ScanReportMessages } from './scan-report-messages'

export type ScanReportChromeMessages = Pick<
  ScanReportMessages,
  'treeExpandFolder' | 'treeCollapseFolder' | 'historyHotspotsHint' | 'historyChurnHint'
>

export const scanReportChromeMessages: Record<Exclude<WebLocale, 'en'>, ScanReportChromeMessages> = {
  pt: {
    treeExpandFolder: 'Expandir pasta',
    treeCollapseFolder: 'Recolher pasta',
    historyHotspotsHint: 'Ficheiros que mudam com frequência. É neles que os problemas costumam aparecer.',
    historyChurnHint: 'Quantas linhas foram adicionadas e removidas em cada ficheiro.'
  },
  it: {
    treeExpandFolder: 'Espandi cartella',
    treeCollapseFolder: 'Comprimi cartella',
    historyHotspotsHint: 'File che cambiano spesso. È lì che di solito compaiono i problemi.',
    historyChurnHint: 'Quante righe sono state aggiunte e rimosse in ciascun file.'
  },
  fr: {
    treeExpandFolder: 'Développer le dossier',
    treeCollapseFolder: 'Réduire le dossier',
    historyHotspotsHint: 'Fichiers qui changent souvent. C’est là que les problèmes ont tendance à apparaître.',
    historyChurnHint: 'Combien de lignes ont été ajoutées et retirées dans chaque fichier.'
  },
  nl: {
    treeExpandFolder: 'Map uitklappen',
    treeCollapseFolder: 'Map inklappen',
    historyHotspotsHint: 'Bestanden die vaak veranderen. Daar duiken problemen meestal op.',
    historyChurnHint: 'Hoeveel regels in elk bestand zijn toegevoegd en verwijderd.'
  },
  es: {
    treeExpandFolder: 'Expandir carpeta',
    treeCollapseFolder: 'Contraer carpeta',
    historyHotspotsHint: 'Archivos que cambian a menudo. Ahí suelen aparecer los problemas.',
    historyChurnHint: 'Cuántas líneas se añadieron y se quitaron en cada archivo.'
  },
  ja: {
    treeExpandFolder: 'フォルダーを展開',
    treeCollapseFolder: 'フォルダーを折りたたむ',
    historyHotspotsHint: 'よく変更されるファイルです。問題が出やすい場所です。',
    historyChurnHint: '各ファイルで追加・削除された行数です。'
  },
  'zh-Hans': {
    treeExpandFolder: '展开文件夹',
    treeCollapseFolder: '折叠文件夹',
    historyHotspotsHint: '经常改动的文件。问题往往出现在这里。',
    historyChurnHint: '每个文件中新增和删除了多少行。'
  },
  hi: {
    treeExpandFolder: 'फ़ोल्डर फैलाएँ',
    treeCollapseFolder: 'फ़ोल्डर सिकोड़ें',
    historyHotspotsHint: 'जो फ़ाइलें अक्सर बदलती हैं। समस्याएँ यहीं दिखने लगती हैं।',
    historyChurnHint: 'हर फ़ाइल में कितनी पंक्तियाँ जोड़ी और हटाई गईं।'
  },
  ur: {
    treeExpandFolder: 'فولڈر پھیلائیں',
    treeCollapseFolder: 'فولڈر سکیڑیں',
    historyHotspotsHint: 'وہ فائلیں جو اکثر بدلتی ہیں۔ مسائل عموماً یہیں نظر آتے ہیں۔',
    historyChurnHint: 'ہر فائل میں کتنی سطریں شامل کی گئیں اور ہٹائی گئیں۔'
  }
}
