import type { WebLocale } from '../services/locale'
import type { ViewerMessages } from './messages'

export type HotspotViewerMessages = Pick<
  ViewerMessages,
  | 'showHotspotsLabel'
  | 'showHotspotsTooltip'
  | 'hotspotLegendTitle'
  | 'hotspotBandLabels'
  | 'riskToChangeLabel'
  | 'riskToChangeValue'
>

export const hotspotViewerMessages: Record<Exclude<WebLocale, 'en'>, HotspotViewerMessages> = {
  pt: {
    showHotspotsLabel: 'Mostrar pontos de risco',
    showHotspotsTooltip: 'Colorir os arquivos conforme o risco de alterá-los',
    hotspotLegendTitle: 'Risco ao alterar',
    hotspotBandLabels: { low: 'Baixo', medium: 'Médio', high: 'Alto' },
    riskToChangeLabel: 'Risco ao alterar',
    riskToChangeValue: '{score} ({band})'
  },
  it: {
    showHotspotsLabel: 'Mostra i punti a rischio',
    showHotspotsTooltip: 'Colora i file in base al rischio di modificarli',
    hotspotLegendTitle: 'Rischio di modifica',
    hotspotBandLabels: { low: 'Basso', medium: 'Medio', high: 'Alto' },
    riskToChangeLabel: 'Rischio di modifica',
    riskToChangeValue: '{score} ({band})'
  },
  fr: {
    showHotspotsLabel: 'Afficher les fichiers risqués',
    showHotspotsTooltip: 'Colorer les fichiers selon le risque à les modifier',
    hotspotLegendTitle: 'Risque de modification',
    hotspotBandLabels: { low: 'Faible', medium: 'Moyen', high: 'Élevé' },
    riskToChangeLabel: 'Risque de modification',
    riskToChangeValue: '{score} ({band})'
  },
  nl: {
    showHotspotsLabel: 'Hotspots tonen',
    showHotspotsTooltip: 'Kleur bestanden naar hoe riskant het is om ze te wijzigen',
    hotspotLegendTitle: 'Risico om te wijzigen',
    hotspotBandLabels: { low: 'Laag', medium: 'Gemiddeld', high: 'Hoog' },
    riskToChangeLabel: 'Risico om te wijzigen',
    riskToChangeValue: '{score} ({band})'
  },
  es: {
    showHotspotsLabel: 'Mostrar puntos de riesgo',
    showHotspotsTooltip: 'Colorea los archivos según el riesgo de cambiarlos',
    hotspotLegendTitle: 'Riesgo al cambiar',
    hotspotBandLabels: { low: 'Bajo', medium: 'Medio', high: 'Alto' },
    riskToChangeLabel: 'Riesgo al cambiar',
    riskToChangeValue: '{score} ({band})'
  },
  ja: {
    showHotspotsLabel: 'ホットスポットを表示',
    showHotspotsTooltip: '変更リスクの高さでファイルに色を付けます',
    hotspotLegendTitle: '変更のリスク',
    hotspotBandLabels: { low: '低', medium: '中', high: '高' },
    riskToChangeLabel: '変更のリスク',
    riskToChangeValue: '{score} ({band})'
  },
  'zh-Hans': {
    showHotspotsLabel: '显示热点',
    showHotspotsTooltip: '按更改风险给文件着色',
    hotspotLegendTitle: '更改风险',
    hotspotBandLabels: { low: '低', medium: '中', high: '高' },
    riskToChangeLabel: '更改风险',
    riskToChangeValue: '{score} ({band})'
  },
  hi: {
    showHotspotsLabel: 'हॉटस्पॉट दिखाएँ',
    showHotspotsTooltip: 'फ़ाइलों को इस हिसाब से रंगें कि उन्हें बदलना कितना जोखिम भरा है',
    hotspotLegendTitle: 'बदलने का जोखिम',
    hotspotBandLabels: { low: 'कम', medium: 'मध्यम', high: 'उच्च' },
    riskToChangeLabel: 'बदलने का जोखिम',
    riskToChangeValue: '{score} ({band})'
  },
  ur: {
    showHotspotsLabel: 'ہاٹ سپاٹس دکھائیں',
    showHotspotsTooltip: 'فائلوں کو اس حساب سے رنگیں کہ انہیں بدلنا کتنا خطرناک ہے',
    hotspotLegendTitle: 'تبدیل کرنے کا خطرہ',
    hotspotBandLabels: { low: 'کم', medium: 'درمیانہ', high: 'زیادہ' },
    riskToChangeLabel: 'تبدیل کرنے کا خطرہ',
    riskToChangeValue: '{score} ({band})'
  }
}
