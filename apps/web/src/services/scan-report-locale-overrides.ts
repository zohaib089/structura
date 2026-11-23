import type { ScanReportMessages } from './scan-report-messages'
import type { WebLocale } from './locale'

/** Translations for the new report screens (riskiest files, quality, duplicates, ask). */
export type ScanReportNewScreenMessages = Pick<
  ScanReportMessages,
  | 'riskiestFilesTitle'
  | 'riskiestFilesHint'
  | 'riskiestFilesOpen'
  | 'hotspotBandLabel'
  | 'riskiestFilesScore'
  | 'qualityTitle'
  | 'qualityHint'
  | 'qualityScoreLabel'
  | 'qualityGradeLabel'
  | 'qualityOutOf'
  | 'qualityBreakdownTitle'
  | 'qualityCategoryTitle'
  | 'qualityPointsOff'
  | 'qualityTipsTitle'
  | 'qualityTipGain'
  | 'qualityFoldersTitle'
  | 'qualityFoldersHint'
  | 'qualityFoldersShowing'
  | 'qualityFoldersOpen'
  | 'qualityFolderSummaryNone'
  | 'duplicatesTitle'
  | 'duplicatesHint'
  | 'duplicatesGroupsValueLabel'
  | 'duplicatesLinesValueLabel'
  | 'duplicatesPercentValue'
  | 'duplicatesGroupsCaption'
  | 'duplicatesLinesCaption'
  | 'duplicatesPercentCaption'
  | 'duplicatesSummaryLabel'
  | 'duplicatesGroupLines'
  | 'duplicatesGroupPlaces'
  | 'duplicatesLineRange'
  | 'duplicatesOpen'
  | 'duplicatesShowing'
  | 'askTitle'
  | 'askHint'
  | 'askInputLabel'
  | 'askPlaceholder'
  | 'askButton'
  | 'askThinking'
  | 'askStarters'
  | 'askCitationsTitle'
  | 'askFollowUpsTitle'
  | 'askOpen'
  | 'askCharCount'
  | 'askTooLong'
  | 'askSessionExpired'
  | 'askScanRunning'
  | 'askScanUnavailable'
  | 'askRateLimited'
  | 'askTypeFirst'
  | 'askUnreachable'
  | 'askGenericError'
  | 'askCitationFolder'
  | 'askCitationIn'
  | 'askLine'
  | 'askLines'
>

export const scanReportNewScreenMessages: Record<Exclude<WebLocale, 'en'>, ScanReportNewScreenMessages> = {
  pt: {
    riskiestFilesTitle: 'Arquivos mais arriscados',
    riskiestFilesHint: 'Estes arquivos são os mais propensos a causar problemas se você os alterar. Abra um para vê-lo no gráfico.',
    riskiestFilesOpen: 'Mostrar no gráfico',
    hotspotBandLabel(band) {
        return ({ low: 'Baixo', medium: 'Médio', high: 'Alto' } as const)[band]
      },
    riskiestFilesScore(score, band) {
        return `${score} · ${band}`
      },
    qualityTitle: 'Qualidade do projeto',
    qualityHint: 'Uma pontuação de 0 a 100 para o projeto inteiro, com base em regras de estrutura, importações circulares, arquivos arriscados, importações e tamanho.',
    qualityScoreLabel(score, grade) {
        return `${score} de 100, nota ${grade}`
      },
    qualityGradeLabel(grade) {
        return `Nota ${grade}`
      },
    qualityOutOf: 'de 100',
    qualityBreakdownTitle: 'O que compõe esta pontuação',
    qualityCategoryTitle(category) {
        return (
          {
            architecture: 'Regras de estrutura',
            cycles: 'Importações circulares',
            hotspots: 'Arquivos mais arriscados',
            imports: 'Importações',
            size: 'Tamanho de arquivos e funções'
          } as const
        )[category]
      },
    qualityPointsOff(penalty) {
        if (penalty <= 0) return 'Nenhum ponto descontado'
        return penalty === 1 ? '1 ponto a menos' : `${penalty} pontos a menos`
      },
    qualityTipsTitle: 'Como aumentar esta pontuação',
    qualityTipGain(gain) {
        return gain === 1 ? 'Cerca de +1 ponto' : `Cerca de +${gain} pontos`
      },
    qualityFoldersTitle: 'Pontuações das pastas',
    qualityFoldersHint: 'Pastas com as pontuações mais baixas primeiro. Abra uma para vê-la no gráfico.',
    qualityFoldersShowing(shown, total) {
        return `Mostrando as ${shown} pastas com as pontuações mais baixas, de ${total}. Abra uma para vê-la no gráfico.`
      },
    qualityFoldersOpen: 'Mostrar no gráfico',
    qualityFolderSummaryNone: 'Nenhum problema nesta pasta.',
    duplicatesTitle: 'Código duplicado',
    duplicatesHint: 'Estes são trechos em que o mesmo bloco de código aparece mais de uma vez. Abra um arquivo para vê-lo no gráfico.',
    duplicatesGroupsValueLabel(count) {
        return count === 1 ? '1 bloco repetido' : `${count.toLocaleString('pt')} blocos repetidos`
      },
    duplicatesLinesValueLabel(count) {
        return count === 1 ? '1 linha repetida' : `${count.toLocaleString('pt')} linhas repetidas`
      },
    duplicatesPercentValue(percent) {
        return `${percent}%`
      },
    duplicatesGroupsCaption(count) {
        return count === 1 ? 'bloco repetido' : 'blocos repetidos'
      },
    duplicatesLinesCaption(count) {
        return count === 1 ? 'linha repetida' : 'linhas repetidas'
      },
    duplicatesPercentCaption: 'do código analisado está repetido',
    duplicatesSummaryLabel(groups, lines, percent) {
        const blocks = groups === 1 ? '1 bloco repetido' : `${groups.toLocaleString('pt')} blocos repetidos`
        const repeated = lines === 1 ? '1 linha repetida' : `${lines.toLocaleString('pt')} linhas repetidas`
        return `${blocks}. ${repeated}. ${percent}% do código analisado está repetido`
      },
    duplicatesGroupLines(count) {
        return count === 1 ? '1 linha' : `${count.toLocaleString('pt')} linhas`
      },
    duplicatesGroupPlaces(count) {
        return count === 1 ? '1 lugar' : `${count.toLocaleString('pt')} lugares`
      },
    duplicatesLineRange(startLine, endLine) {
        if (startLine === endLine) return `linha ${startLine}`
        return `linhas ${startLine}–${endLine}`
      },
    duplicatesOpen: 'Mostrar no gráfico',
    duplicatesShowing(shown, total) {
        return `Mostrando os ${shown} maiores blocos repetidos, de ${total}. Abra um arquivo para vê-lo no gráfico.`
      },
    askTitle: 'Pergunte sobre este projeto',
    askHint: 'Faça uma pergunta curta sobre esta análise. As respostas vêm dos resultados da análise, não de um chatbot.',
    askInputLabel: 'Sua pergunta',
    askPlaceholder: 'Por exemplo, quais são os arquivos mais arriscados?',
    askButton: 'Perguntar',
    askThinking: 'Pensando…',
    askStarters: [
          'Quais são os arquivos mais arriscados?',
          'Como está a saúde deste projeto?',
          'Onde o código está duplicado?',
          'Há importações circulares?'
        ],
    askCitationsTitle: 'Trechos mencionados',
    askFollowUpsTitle: 'Perguntar a seguir',
    askOpen: 'Mostrar no gráfico',
    askCharCount(used, max) {
        return `${used} de ${max} caracteres`
      },
    askTooLong: 'Mantenha a pergunta em 500 caracteres ou menos.',
    askSessionExpired: 'Sua sessão expirou. Entre novamente.',
    askScanRunning: 'Esta análise ainda está em andamento. Tente de novo quando ela terminar.',
    askScanUnavailable: 'Esta análise não está disponível para perguntas.',
    askRateLimited: 'Espere um momento antes de fazer outra pergunta.',
    askTypeFirst: 'Digite uma pergunta primeiro.',
    askUnreachable: 'Não foi possível alcançar o servidor. Verifique a conexão e tente de novo.',
    askGenericError: 'Não foi possível responder agora. Tente de novo.',
    askCitationFolder: 'pasta',
    askCitationIn(path) {
        return `em ${path}`
      },
    askLine(line) {
        return `linha ${line}`
      },
    askLines(startLine, endLine) {
        if (startLine === endLine) return `linha ${startLine}`
        return `linhas ${startLine}–${endLine}`
      }
  },
  it: {
    riskiestFilesTitle: 'File più a rischio',
    riskiestFilesHint: 'Questi file sono i più propensi a causare problemi se li modifichi. Aprine uno per vederlo nel grafo.',
    riskiestFilesOpen: 'Mostra nel grafo',
    hotspotBandLabel(band) {
        return ({ low: 'Basso', medium: 'Medio', high: 'Alto' } as const)[band]
      },
    riskiestFilesScore(score, band) {
        return `${score} · ${band}`
      },
    qualityTitle: 'Qualità del progetto',
    qualityHint: 'Un punteggio su 100 per l’intero progetto, basato su regole di struttura, import ciclici, file a rischio, import e dimensione.',
    qualityScoreLabel(score, grade) {
        return `${score} su 100, voto ${grade}`
      },
    qualityGradeLabel(grade) {
        return `Voto ${grade}`
      },
    qualityOutOf: 'su 100',
    qualityBreakdownTitle: 'Di che cosa è fatto questo punteggio',
    qualityCategoryTitle(category) {
        return (
          {
            architecture: 'Regole di struttura',
            cycles: 'Import ciclici',
            hotspots: 'File più a rischio',
            imports: 'Import',
            size: 'Dimensione di file e funzioni'
          } as const
        )[category]
      },
    qualityPointsOff(penalty) {
        if (penalty <= 0) return 'Nessun punto in meno'
        return penalty === 1 ? '1 punto in meno' : `${penalty} punti in meno`
      },
    qualityTipsTitle: 'Come alzare questo punteggio',
    qualityTipGain(gain) {
        return gain === 1 ? 'Circa +1 punto' : `Circa +${gain} punti`
      },
    qualityFoldersTitle: 'Punteggi delle cartelle',
    qualityFoldersHint: 'Prima le cartelle con i punteggi più bassi. Aprine una per vederla nel grafo.',
    qualityFoldersShowing(shown, total) {
        return `Le ${shown} cartelle con i punteggi più bassi, su ${total}. Aprine una per vederla nel grafo.`
      },
    qualityFoldersOpen: 'Mostra nel grafo',
    qualityFolderSummaryNone: 'Nessun problema in questa cartella.',
    duplicatesTitle: 'Codice duplicato',
    duplicatesHint: 'Questi sono punti in cui lo stesso blocco di codice compare più di una volta. Apri un file per vederlo nel grafo.',
    duplicatesGroupsValueLabel(count) {
        return count === 1 ? '1 blocco ripetuto' : `${count.toLocaleString('it')} blocchi ripetuti`
      },
    duplicatesLinesValueLabel(count) {
        return count === 1 ? '1 riga ripetuta' : `${count.toLocaleString('it')} righe ripetute`
      },
    duplicatesPercentValue(percent) {
        return `${percent}%`
      },
    duplicatesGroupsCaption(count) {
        return count === 1 ? 'blocco ripetuto' : 'blocchi ripetuti'
      },
    duplicatesLinesCaption(count) {
        return count === 1 ? 'riga ripetuta' : 'righe ripetute'
      },
    duplicatesPercentCaption: 'del codice analizzato è ripetuto',
    duplicatesSummaryLabel(groups, lines, percent) {
        const blocks = groups === 1 ? '1 blocco ripetuto' : `${groups.toLocaleString('it')} blocchi ripetuti`
        const repeated = lines === 1 ? '1 riga ripetuta' : `${lines.toLocaleString('it')} righe ripetute`
        return `${blocks}. ${repeated}. ${percent}% del codice analizzato è ripetuto`
      },
    duplicatesGroupLines(count) {
        return count === 1 ? '1 riga' : `${count.toLocaleString('it')} righe`
      },
    duplicatesGroupPlaces(count) {
        return count === 1 ? '1 punto' : `${count.toLocaleString('it')} punti`
      },
    duplicatesLineRange(startLine, endLine) {
        if (startLine === endLine) return `riga ${startLine}`
        return `righe ${startLine}–${endLine}`
      },
    duplicatesOpen: 'Mostra nel grafo',
    duplicatesShowing(shown, total) {
        return `I ${shown} blocchi ripetuti più grandi, su ${total}. Apri un file per vederlo nel grafo.`
      },
    askTitle: 'Chiedi di questo progetto',
    askHint: 'Fai una domanda breve su questa analisi. Le risposte arrivano dai risultati dell’analisi, non da un chatbot.',
    askInputLabel: 'La tua domanda',
    askPlaceholder: 'Per esempio, quali sono i file più a rischio?',
    askButton: 'Chiedi',
    askThinking: 'Sto pensando…',
    askStarters: [
          'Quali sono i file più a rischio?',
          'Quanto è in salute questo progetto?',
          'Dove è duplicato il codice?',
          'Ci sono import ciclici?'
        ],
    askCitationsTitle: 'Punti citati',
    askFollowUpsTitle: 'Chiedi ancora',
    askOpen: 'Mostra nel grafo',
    askCharCount(used, max) {
        return `${used} di ${max} caratteri`
      },
    askTooLong: 'Tieni la domanda entro 500 caratteri.',
    askSessionExpired: 'La sessione è scaduta. Accedi di nuovo.',
    askScanRunning: 'Questa analisi è ancora in corso. Riprova quando è terminata.',
    askScanUnavailable: 'Questa analisi non è disponibile per le domande.',
    askRateLimited: 'Aspetta un momento prima di fare un’altra domanda.',
    askTypeFirst: 'Scrivi prima una domanda.',
    askUnreachable: 'Non è stato possibile raggiungere il server. Controlla la connessione e riprova.',
    askGenericError: 'Non è stato possibile rispondere adesso. Riprova.',
    askCitationFolder: 'cartella',
    askCitationIn(path) {
        return `in ${path}`
      },
    askLine(line) {
        return `riga ${line}`
      },
    askLines(startLine, endLine) {
        if (startLine === endLine) return `riga ${startLine}`
        return `righe ${startLine}–${endLine}`
      }
  },
  fr: {
    riskiestFilesTitle: 'Fichiers les plus risqués',
    riskiestFilesHint: 'Ces fichiers sont les plus susceptibles de poser problème si vous les modifiez. Ouvrez-en un pour le voir dans le graphe.',
    riskiestFilesOpen: 'Afficher dans le graphe',
    hotspotBandLabel(band) {
        return ({ low: 'Faible', medium: 'Moyen', high: 'Élevé' } as const)[band]
      },
    riskiestFilesScore(score, band) {
        return `${score} · ${band}`
      },
    qualityTitle: 'Qualité du projet',
    qualityHint: 'Une note sur 100 pour l’ensemble du projet, d’après les règles de structure, les imports circulaires, les fichiers risqués, les imports et la taille.',
    qualityScoreLabel(score, grade) {
        return `${score} sur 100, mention ${grade}`
      },
    qualityGradeLabel(grade) {
        return `Mention ${grade}`
      },
    qualityOutOf: 'sur 100',
    qualityBreakdownTitle: 'Ce qui compose cette note',
    qualityCategoryTitle(category) {
        return (
          {
            architecture: 'Règles de structure',
            cycles: 'Imports circulaires',
            hotspots: 'Fichiers les plus risqués',
            imports: 'Imports',
            size: 'Taille des fichiers et des fonctions'
          } as const
        )[category]
      },
    qualityPointsOff(penalty) {
        if (penalty <= 0) return 'Aucun point en moins'
        return penalty === 1 ? '1 point en moins' : `${penalty} points en moins`
      },
    qualityTipsTitle: 'Comment améliorer cette note',
    qualityTipGain(gain) {
        return gain === 1 ? 'Environ +1 point' : `Environ +${gain} points`
      },
    qualityFoldersTitle: 'Notes des dossiers',
    qualityFoldersHint: 'Les dossiers avec les notes les plus basses d’abord. Ouvrez-en un pour le voir dans le graphe.',
    qualityFoldersShowing(shown, total) {
        return `Les ${shown} dossiers avec les notes les plus basses, sur ${total}. Ouvrez-en un pour le voir dans le graphe.`
      },
    qualityFoldersOpen: 'Afficher dans le graphe',
    qualityFolderSummaryNone: 'Aucun problème dans ce dossier.',
    duplicatesTitle: 'Code dupliqué',
    duplicatesHint: 'Voici les endroits où le même bloc de code apparaît plus d’une fois. Ouvrez un fichier pour le voir dans le graphe.',
    duplicatesGroupsValueLabel(count) {
        return count === 1 ? '1 bloc répété' : `${count.toLocaleString('fr')} blocs répétés`
      },
    duplicatesLinesValueLabel(count) {
        return count === 1 ? '1 ligne répétée' : `${count.toLocaleString('fr')} lignes répétées`
      },
    duplicatesPercentValue(percent) {
        return `${percent} %`
      },
    duplicatesGroupsCaption(count) {
        return count === 1 ? 'bloc répété' : 'blocs répétés'
      },
    duplicatesLinesCaption(count) {
        return count === 1 ? 'ligne répétée' : 'lignes répétées'
      },
    duplicatesPercentCaption: 'du code analysé est répété',
    duplicatesSummaryLabel(groups, lines, percent) {
        const blocks = groups === 1 ? '1 bloc répété' : `${groups.toLocaleString('fr')} blocs répétés`
        const repeated = lines === 1 ? '1 ligne répétée' : `${lines.toLocaleString('fr')} lignes répétées`
        return `${blocks}. ${repeated}. ${percent} % du code analysé est répété`
      },
    duplicatesGroupLines(count) {
        return count === 1 ? '1 ligne' : `${count.toLocaleString('fr')} lignes`
      },
    duplicatesGroupPlaces(count) {
        return count === 1 ? '1 endroit' : `${count.toLocaleString('fr')} endroits`
      },
    duplicatesLineRange(startLine, endLine) {
        if (startLine === endLine) return `ligne ${startLine}`
        return `lignes ${startLine}–${endLine}`
      },
    duplicatesOpen: 'Afficher dans le graphe',
    duplicatesShowing(shown, total) {
        return `Les ${shown} plus grands blocs répétés, sur ${total}. Ouvrez un fichier pour le voir dans le graphe.`
      },
    askTitle: 'Posez une question sur ce projet',
    askHint: 'Posez une courte question sur cette analyse. Les réponses viennent des résultats de l’analyse, pas d’un chatbot.',
    askInputLabel: 'Votre question',
    askPlaceholder: 'Par exemple, quels sont les fichiers les plus risqués ?',
    askButton: 'Demander',
    askThinking: 'Réflexion…',
    askStarters: [
          'Quels sont les fichiers les plus risqués ?',
          'Quelle est la santé de ce projet ?',
          'Où le code est-il dupliqué ?',
          'Y a-t-il des imports circulaires ?'
        ],
    askCitationsTitle: 'Endroits mentionnés',
    askFollowUpsTitle: 'Demander ensuite',
    askOpen: 'Afficher dans le graphe',
    askCharCount(used, max) {
        return `${used} caractères sur ${max}`
      },
    askTooLong: 'Limitez votre question à 500 caractères ou moins.',
    askSessionExpired: 'Votre session a expiré. Veuillez vous reconnecter.',
    askScanRunning: 'Cette analyse est encore en cours. Réessayez lorsqu’elle est terminée.',
    askScanUnavailable: 'Cette analyse n’est pas disponible pour les questions.',
    askRateLimited: 'Attendez un instant avant de poser une autre question.',
    askTypeFirst: 'Saisissez d’abord une question.',
    askUnreachable: 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.',
    askGenericError: 'Nous n’avons pas pu répondre pour le moment. Réessayez.',
    askCitationFolder: 'dossier',
    askCitationIn(path) {
        return `dans ${path}`
      },
    askLine(line) {
        return `ligne ${line}`
      },
    askLines(startLine, endLine) {
        if (startLine === endLine) return `ligne ${startLine}`
        return `lignes ${startLine}–${endLine}`
      }
  },
  nl: {
    riskiestFilesTitle: 'Riskantste bestanden',
    riskiestFilesHint: 'Deze bestanden geven het vaakst problemen als je ze wijzigt. Open er een om het in de graaf te zien.',
    riskiestFilesOpen: 'Tonen in de graaf',
    hotspotBandLabel(band) {
        return ({ low: 'Laag', medium: 'Gemiddeld', high: 'Hoog' } as const)[band]
      },
    riskiestFilesScore(score, band) {
        return `${score} · ${band}`
      },
    qualityTitle: 'Projectkwaliteit',
    qualityHint: 'Een score van 0 tot 100 voor het hele project, op basis van structureregels, circulaire imports, riskante bestanden, imports en omvang.',
    qualityScoreLabel(score, grade) {
        return `${score} van de 100, cijfer ${grade}`
      },
    qualityGradeLabel(grade) {
        return `Cijfer ${grade}`
      },
    qualityOutOf: 'van de 100',
    qualityBreakdownTitle: 'Waaruit deze score bestaat',
    qualityCategoryTitle(category) {
        return (
          {
            architecture: 'Structureregels',
            cycles: 'Circulaire imports',
            hotspots: 'Riskantste bestanden',
            imports: 'Imports',
            size: 'Omvang van bestanden en functies'
          } as const
        )[category]
      },
    qualityPointsOff(penalty) {
        if (penalty <= 0) return 'Geen punten aftrek'
        return penalty === 1 ? '1 punt aftrek' : `${penalty} punten aftrek`
      },
    qualityTipsTitle: 'Hoe je deze score kunt verhogen',
    qualityTipGain(gain) {
        return gain === 1 ? 'Ongeveer +1 punt' : `Ongeveer +${gain} punten`
      },
    qualityFoldersTitle: 'Mapscores',
    qualityFoldersHint: 'Mappen met de laagste scores eerst. Open er een om die in de graaf te zien.',
    qualityFoldersShowing(shown, total) {
        return `De ${shown} mappen met de laagste scores, van ${total}. Open er een om die in de graaf te zien.`
      },
    qualityFoldersOpen: 'Tonen in de graaf',
    qualityFolderSummaryNone: 'Geen problemen in deze map.',
    duplicatesTitle: 'Dubbele code',
    duplicatesHint: 'Dit zijn plekken waar hetzelfde codeblok vaker voorkomt. Open een bestand om het in de graaf te zien.',
    duplicatesGroupsValueLabel(count) {
        return count === 1 ? '1 herhaald blok' : `${count.toLocaleString('nl')} herhaalde blokken`
      },
    duplicatesLinesValueLabel(count) {
        return count === 1 ? '1 herhaalde regel' : `${count.toLocaleString('nl')} herhaalde regels`
      },
    duplicatesPercentValue(percent) {
        return `${percent}%`
      },
    duplicatesGroupsCaption(count) {
        return count === 1 ? 'herhaald blok' : 'herhaalde blokken'
      },
    duplicatesLinesCaption(count) {
        return count === 1 ? 'herhaalde regel' : 'herhaalde regels'
      },
    duplicatesPercentCaption: 'van de gescande code is herhaald',
    duplicatesSummaryLabel(groups, lines, percent) {
        const blocks = groups === 1 ? '1 herhaald blok' : `${groups.toLocaleString('nl')} herhaalde blokken`
        const repeated = lines === 1 ? '1 herhaalde regel' : `${lines.toLocaleString('nl')} herhaalde regels`
        return `${blocks}. ${repeated}. ${percent}% van de gescande code is herhaald`
      },
    duplicatesGroupLines(count) {
        return count === 1 ? '1 regel' : `${count.toLocaleString('nl')} regels`
      },
    duplicatesGroupPlaces(count) {
        return count === 1 ? '1 plek' : `${count.toLocaleString('nl')} plekken`
      },
    duplicatesLineRange(startLine, endLine) {
        if (startLine === endLine) return `regel ${startLine}`
        return `regels ${startLine}–${endLine}`
      },
    duplicatesOpen: 'Tonen in de graaf',
    duplicatesShowing(shown, total) {
        return `De ${shown} grootste herhaalde blokken, van ${total}. Open een bestand om het in de graaf te zien.`
      },
    askTitle: 'Vraag iets over dit project',
    askHint: 'Stel een korte vraag over deze scan. Antwoorden komen uit de scanresultaten, niet van een chatbot.',
    askInputLabel: 'Je vraag',
    askPlaceholder: 'Bijvoorbeeld, wat zijn de riskantste bestanden?',
    askButton: 'Vragen',
    askThinking: 'Even nadenken…',
    askStarters: [
          'Wat zijn de riskantste bestanden?',
          'Hoe gezond is dit project?',
          'Waar is code herhaald?',
          'Zijn er circulaire imports?'
        ],
    askCitationsTitle: 'Genoemde plekken',
    askFollowUpsTitle: 'Volgende vraag',
    askOpen: 'Tonen in de graaf',
    askCharCount(used, max) {
        return `${used} van ${max} tekens`
      },
    askTooLong: 'Houd je vraag op 500 tekens of minder.',
    askSessionExpired: 'Je sessie is verlopen. Log opnieuw in.',
    askScanRunning: 'Deze scan loopt nog. Probeer het opnieuw wanneer die klaar is.',
    askScanUnavailable: 'Over deze scan kun je geen vragen stellen.',
    askRateLimited: 'Wacht even voordat je een volgende vraag stelt.',
    askTypeFirst: 'Typ eerst een vraag.',
    askUnreachable: 'De server was niet bereikbaar. Controleer je verbinding en probeer het opnieuw.',
    askGenericError: 'We konden dat nu niet beantwoorden. Probeer het opnieuw.',
    askCitationFolder: 'map',
    askCitationIn(path) {
        return `in ${path}`
      },
    askLine(line) {
        return `regel ${line}`
      },
    askLines(startLine, endLine) {
        if (startLine === endLine) return `regel ${startLine}`
        return `regels ${startLine}–${endLine}`
      }
  },
  es: {
    riskiestFilesTitle: 'Archivos más arriesgados',
    riskiestFilesHint: 'Estos archivos son los que más problemas pueden causar si los cambias. Abre uno para verlo en el gráfico.',
    riskiestFilesOpen: 'Mostrar en el gráfico',
    hotspotBandLabel(band) {
        return ({ low: 'Bajo', medium: 'Medio', high: 'Alto' } as const)[band]
      },
    riskiestFilesScore(score, band) {
        return `${score} · ${band}`
      },
    qualityTitle: 'Calidad del proyecto',
    qualityHint: 'Una puntuación sobre 100 para todo el proyecto, según las reglas de estructura, las importaciones circulares, los archivos arriesgados, las importaciones y el tamaño.',
    qualityScoreLabel(score, grade) {
        return `${score} de 100, nota ${grade}`
      },
    qualityGradeLabel(grade) {
        return `Nota ${grade}`
      },
    qualityOutOf: 'de 100',
    qualityBreakdownTitle: 'De qué está hecha esta puntuación',
    qualityCategoryTitle(category) {
        return (
          {
            architecture: 'Reglas de estructura',
            cycles: 'Importaciones circulares',
            hotspots: 'Archivos más arriesgados',
            imports: 'Importaciones',
            size: 'Tamaño de archivos y funciones'
          } as const
        )[category]
      },
    qualityPointsOff(penalty) {
        if (penalty <= 0) return 'Ningún punto menos'
        return penalty === 1 ? '1 punto menos' : `${penalty} puntos menos`
      },
    qualityTipsTitle: 'Cómo subir esta puntuación',
    qualityTipGain(gain) {
        return gain === 1 ? 'Unos +1 punto' : `Unos +${gain} puntos`
      },
    qualityFoldersTitle: 'Puntuaciones de las carpetas',
    qualityFoldersHint: 'Primero las carpetas con las puntuaciones más bajas. Abre una para verla en el gráfico.',
    qualityFoldersShowing(shown, total) {
        return `Las ${shown} carpetas con las puntuaciones más bajas, de ${total}. Abre una para verla en el gráfico.`
      },
    qualityFoldersOpen: 'Mostrar en el gráfico',
    qualityFolderSummaryNone: 'No hay problemas en esta carpeta.',
    duplicatesTitle: 'Código duplicado',
    duplicatesHint: 'Estos son sitios donde el mismo bloque de código aparece más de una vez. Abre un archivo para verlo en el gráfico.',
    duplicatesGroupsValueLabel(count) {
        return count === 1 ? '1 bloque repetido' : `${count.toLocaleString('es')} bloques repetidos`
      },
    duplicatesLinesValueLabel(count) {
        return count === 1 ? '1 línea repetida' : `${count.toLocaleString('es')} líneas repetidas`
      },
    duplicatesPercentValue(percent) {
        return `${percent}%`
      },
    duplicatesGroupsCaption(count) {
        return count === 1 ? 'bloque repetido' : 'bloques repetidos'
      },
    duplicatesLinesCaption(count) {
        return count === 1 ? 'línea repetida' : 'líneas repetidas'
      },
    duplicatesPercentCaption: 'del código analizado está repetido',
    duplicatesSummaryLabel(groups, lines, percent) {
        const blocks = groups === 1 ? '1 bloque repetido' : `${groups.toLocaleString('es')} bloques repetidos`
        const repeated = lines === 1 ? '1 línea repetida' : `${lines.toLocaleString('es')} líneas repetidas`
        return `${blocks}. ${repeated}. ${percent}% del código analizado está repetido`
      },
    duplicatesGroupLines(count) {
        return count === 1 ? '1 línea' : `${count.toLocaleString('es')} líneas`
      },
    duplicatesGroupPlaces(count) {
        return count === 1 ? '1 lugar' : `${count.toLocaleString('es')} lugares`
      },
    duplicatesLineRange(startLine, endLine) {
        if (startLine === endLine) return `línea ${startLine}`
        return `líneas ${startLine}–${endLine}`
      },
    duplicatesOpen: 'Mostrar en el gráfico',
    duplicatesShowing(shown, total) {
        return `Los ${shown} bloques repetidos más grandes, de ${total}. Abre un archivo para verlo en el gráfico.`
      },
    askTitle: 'Pregunta sobre este proyecto',
    askHint: 'Haz una pregunta breve sobre este análisis. Las respuestas salen de los resultados del análisis, no de un chatbot.',
    askInputLabel: 'Tu pregunta',
    askPlaceholder: 'Por ejemplo, ¿cuáles son los archivos más arriesgados?',
    askButton: 'Preguntar',
    askThinking: 'Pensando…',
    askStarters: [
          '¿Cuáles son los archivos más arriesgados?',
          '¿Qué tan sano está este proyecto?',
          '¿Dónde está duplicado el código?',
          '¿Hay importaciones circulares?'
        ],
    askCitationsTitle: 'Sitios mencionados',
    askFollowUpsTitle: 'Preguntar después',
    askOpen: 'Mostrar en el gráfico',
    askCharCount(used, max) {
        return `${used} de ${max} caracteres`
      },
    askTooLong: 'Deja la pregunta en 500 caracteres o menos.',
    askSessionExpired: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
    askScanRunning: 'Este análisis sigue en curso. Inténtalo de nuevo cuando termine.',
    askScanUnavailable: 'Este análisis no está disponible para preguntas.',
    askRateLimited: 'Espera un momento antes de hacer otra pregunta.',
    askTypeFirst: 'Escribe primero una pregunta.',
    askUnreachable: 'No se pudo contactar con el servidor. Comprueba la conexión e inténtalo de nuevo.',
    askGenericError: 'No pudimos responder ahora. Inténtalo de nuevo.',
    askCitationFolder: 'carpeta',
    askCitationIn(path) {
        return `en ${path}`
      },
    askLine(line) {
        return `línea ${line}`
      },
    askLines(startLine, endLine) {
        if (startLine === endLine) return `línea ${startLine}`
        return `líneas ${startLine}–${endLine}`
      }
  },
  ja: {
    riskiestFilesTitle: 'リスクの高いファイル',
    riskiestFilesHint: 'これらのファイルは、変更すると問題が起きやすいものです。開くとグラフで確認できます。',
    riskiestFilesOpen: 'グラフで表示',
    hotspotBandLabel(band) {
        return ({ low: '低', medium: '中', high: '高' } as const)[band]
      },
    riskiestFilesScore(score, band) {
        return `${score} · ${band}`
      },
    qualityTitle: 'プロジェクトの品質',
    qualityHint: '構造のルール、循環インポート、リスクの高いファイル、インポート、サイズに基づく、プロジェクト全体の100点満点のスコアです。',
    qualityScoreLabel(score, grade) {
        return `${score} / 100、評価 ${grade}`
      },
    qualityGradeLabel(grade) {
        return `評価 ${grade}`
      },
    qualityOutOf: '/ 100',
    qualityBreakdownTitle: 'このスコアの内訳',
    qualityCategoryTitle(category) {
        return (
          {
            architecture: '構造のルール',
            cycles: '循環インポート',
            hotspots: 'リスクの高いファイル',
            imports: 'インポート',
            size: 'ファイルと関数のサイズ'
          } as const
        )[category]
      },
    qualityPointsOff(penalty) {
        if (penalty <= 0) return '減点なし'
        return penalty === 1 ? '1点減点' : `${penalty}点減点`
      },
    qualityTipsTitle: 'スコアを上げるには',
    qualityTipGain(gain) {
        return gain === 1 ? '約 +1点' : `約 +${gain}点`
      },
    qualityFoldersTitle: 'フォルダーのスコア',
    qualityFoldersHint: 'スコアが低いフォルダーから表示します。開くとグラフで確認できます。',
    qualityFoldersShowing(shown, total) {
        return `スコアが低い${shown}件のフォルダーを表示しています（全${total}件）。開くとグラフで確認できます。`
      },
    qualityFoldersOpen: 'グラフで表示',
    qualityFolderSummaryNone: 'このフォルダーに問題はありません。',
    duplicatesTitle: '重複したコード',
    duplicatesHint: '同じコードの塊が複数箇所に現れている場所です。ファイルを開くとグラフで確認できます。',
    duplicatesGroupsValueLabel(count) {
        return count === 1 ? '1件の繰り返しブロック' : `${count.toLocaleString('ja')} 件の繰り返しブロック`
      },
    duplicatesLinesValueLabel(count) {
        return count === 1 ? '1行の繰り返し' : `${count.toLocaleString('ja')} 行の繰り返し`
      },
    duplicatesPercentValue(percent) {
        return `${percent}%`
      },
    duplicatesGroupsCaption(count) {
        return count === 1 ? '繰り返しブロック' : '繰り返しブロック'
      },
    duplicatesLinesCaption(count) {
        return count === 1 ? '繰り返し行' : '繰り返し行'
      },
    duplicatesPercentCaption: 'がスキャンしたコードの繰り返しです',
    duplicatesSummaryLabel(groups, lines, percent) {
        const blocks = groups === 1 ? '1件の繰り返しブロック' : `${groups.toLocaleString('ja')} 件の繰り返しブロック`
        const repeated = lines === 1 ? '1行の繰り返し' : `${lines.toLocaleString('ja')} 行の繰り返し`
        return `${blocks}. ${repeated}. ${percent}% がスキャンしたコードの繰り返しです`
      },
    duplicatesGroupLines(count) {
        return count === 1 ? '1行' : `${count.toLocaleString('ja')} 行`
      },
    duplicatesGroupPlaces(count) {
        return count === 1 ? '1か所' : `${count.toLocaleString('ja')} か所`
      },
    duplicatesLineRange(startLine, endLine) {
        if (startLine === endLine) return `${startLine}行目`
        return `${startLine}–${endLine}行目`
      },
    duplicatesOpen: 'グラフで表示',
    duplicatesShowing(shown, total) {
        return `大きい順に${shown}件の繰り返しブロックを表示しています（全${total}件）。ファイルを開くとグラフで確認できます。`
      },
    askTitle: 'このプロジェクトについて質問する',
    askHint: 'このスキャンについて短い質問ができます。回答はスキャン結果から導き出され、チャットボットではありません。',
    askInputLabel: '質問',
    askPlaceholder: '例: リスクの高いファイルはどれですか？',
    askButton: '質問する',
    askThinking: '考えています…',
    askStarters: [
          'リスクの高いファイルはどれですか？',
          'このプロジェクトの健全性はどうですか？',
          'コードの重複はどこにありますか？',
          '循環インポートはありますか？'
        ],
    askCitationsTitle: '言及された場所',
    askFollowUpsTitle: '次に聞く',
    askOpen: 'グラフで表示',
    askCharCount(used, max) {
        return `${used} / ${max} 文字`
      },
    askTooLong: '質問は500文字以内にしてください。',
    askSessionExpired: 'セッションの期限が切れました。もう一度サインインしてください。',
    askScanRunning: 'このスキャンはまだ実行中です。完了してからもう一度お試しください。',
    askScanUnavailable: 'このスキャンには質問できません。',
    askRateLimited: '次の質問まで、少し待ってください。',
    askTypeFirst: '先に質問を入力してください。',
    askUnreachable: 'サーバーに接続できませんでした。接続を確認してもう一度お試しください。',
    askGenericError: '今は回答できませんでした。もう一度お試しください。',
    askCitationFolder: 'フォルダー',
    askCitationIn(path) {
        return `${path}内`
      },
    askLine(line) {
        return `${line}行目`
      },
    askLines(startLine, endLine) {
        if (startLine === endLine) return `${startLine}行目`
        return `${startLine}–${endLine}行目`
      }
  },
  'zh-Hans': {
    riskiestFilesTitle: '风险最高的文件',
    riskiestFilesHint: '这些文件在改动时最容易出问题。打开其中一个，即可在关系图中查看。',
    riskiestFilesOpen: '在图中显示',
    hotspotBandLabel(band) {
        return ({ low: '低', medium: '中', high: '高' } as const)[band]
      },
    riskiestFilesScore(score, band) {
        return `${score} · ${band}`
      },
    qualityTitle: '项目质量',
    qualityHint: '整个项目的百分制评分，依据结构规则、循环导入、高风险文件、导入情况和体积得出。',
    qualityScoreLabel(score, grade) {
        return `${score} / 100，等级 ${grade}`
      },
    qualityGradeLabel(grade) {
        return `等级 ${grade}`
      },
    qualityOutOf: '/ 100',
    qualityBreakdownTitle: '这项分数的构成',
    qualityCategoryTitle(category) {
        return (
          {
            architecture: '结构规则',
            cycles: '循环导入',
            hotspots: '风险最高的文件',
            imports: '导入',
            size: '文件和函数大小'
          } as const
        )[category]
      },
    qualityPointsOff(penalty) {
        if (penalty <= 0) return '没有扣分'
        return penalty === 1 ? '扣 1 分' : `扣 ${penalty} 分`
      },
    qualityTipsTitle: '如何提高这项分数',
    qualityTipGain(gain) {
        return gain === 1 ? '大约 +1 分' : `大约 +${gain} 分`
      },
    qualityFoldersTitle: '文件夹分数',
    qualityFoldersHint: '分数最低的文件夹排在前面。打开即可在关系图中查看。',
    qualityFoldersShowing(shown, total) {
        return `正在显示分数最低的 ${shown} 个文件夹，共 ${total} 个。打开即可在关系图中查看。`
      },
    qualityFoldersOpen: '在图中显示',
    qualityFolderSummaryNone: '此文件夹没有问题。',
    duplicatesTitle: '重复的代码',
    duplicatesHint: '这些是同一段代码出现多次的位置。打开文件即可在关系图中查看。',
    duplicatesGroupsValueLabel(count) {
        return count === 1 ? '1 个重复块' : `${count.toLocaleString('zh-Hans')} 个重复块`
      },
    duplicatesLinesValueLabel(count) {
        return count === 1 ? '1 行重复代码' : `${count.toLocaleString('zh-Hans')} 行重复代码`
      },
    duplicatesPercentValue(percent) {
        return `${percent}%`
      },
    duplicatesGroupsCaption(count) {
        return count === 1 ? '个重复块' : '个重复块'
      },
    duplicatesLinesCaption(count) {
        return count === 1 ? '行重复代码' : '行重复代码'
      },
    duplicatesPercentCaption: '的已扫描代码是重复的',
    duplicatesSummaryLabel(groups, lines, percent) {
        const blocks = groups === 1 ? '1 个重复块' : `${groups.toLocaleString('zh-Hans')} 个重复块`
        const repeated = lines === 1 ? '1 行重复代码' : `${lines.toLocaleString('zh-Hans')} 行重复代码`
        return `${blocks}. ${repeated}. ${percent}% 的已扫描代码是重复的`
      },
    duplicatesGroupLines(count) {
        return count === 1 ? '1 行' : `${count.toLocaleString('zh-Hans')} 行`
      },
    duplicatesGroupPlaces(count) {
        return count === 1 ? '1 处' : `${count.toLocaleString('zh-Hans')} 处`
      },
    duplicatesLineRange(startLine, endLine) {
        if (startLine === endLine) return `第 ${startLine} 行`
        return `第 ${startLine}–${endLine} 行`
      },
    duplicatesOpen: '在图中显示',
    duplicatesShowing(shown, total) {
        return `正在显示最大的 ${shown} 个重复块，共 ${total} 个。打开文件即可在关系图中查看。`
      },
    askTitle: '询问此项目',
    askHint: '就此扫描提一个简短问题。答案来自扫描结果，而不是聊天机器人。',
    askInputLabel: '你的问题',
    askPlaceholder: '例如，哪些文件风险最高？',
    askButton: '提问',
    askThinking: '正在思考…',
    askStarters: [
          '哪些文件风险最高？',
          '这个项目的健康状况如何？',
          '代码在哪里重复了？',
          '有循环导入吗？'
        ],
    askCitationsTitle: '提到的位置',
    askFollowUpsTitle: '接着问',
    askOpen: '在图中显示',
    askCharCount(used, max) {
        return `${used} / ${max} 个字符`
      },
    askTooLong: '请将问题控制在 500 个字符以内。',
    askSessionExpired: '你的登录已过期。请重新登录。',
    askScanRunning: '此扫描仍在进行。完成后请再试。',
    askScanUnavailable: '目前无法就此扫描提问。',
    askRateLimited: '请稍等片刻再提下一个问题。',
    askTypeFirst: '请先输入一个问题。',
    askUnreachable: '无法连接到服务器。请检查网络后重试。',
    askGenericError: '暂时无法回答。请再试一次。',
    askCitationFolder: '文件夹',
    askCitationIn(path) {
        return `位于 ${path}`
      },
    askLine(line) {
        return `第 ${line} 行`
      },
    askLines(startLine, endLine) {
        if (startLine === endLine) return `第 ${startLine} 行`
        return `第 ${startLine}–${endLine} 行`
      }
  },
  hi: {
    riskiestFilesTitle: 'सबसे जोखिम भरी फ़ाइलें',
    riskiestFilesHint: 'इन फ़ाइलों को बदलने पर समस्या होने की सबसे अधिक संभावना है। ग्राफ में देखने के लिए एक फ़ाइल खोलें।',
    riskiestFilesOpen: 'ग्राफ में दिखाएँ',
    hotspotBandLabel(band) {
        return ({ low: 'कम', medium: 'मध्यम', high: 'उच्च' } as const)[band]
      },
    riskiestFilesScore(score, band) {
        return `${score} · ${band}`
      },
    qualityTitle: 'प्रोजेक्ट की गुणवत्ता',
    qualityHint: 'पूरे प्रोजेक्ट के लिए 100 में से एक अंक, जो संरचना नियमों, चक्रीय इंपोर्ट, जोखिम भरी फ़ाइलों, इंपोर्ट और आकार पर आधारित है।',
    qualityScoreLabel(score, grade) {
        return `${score} / 100, ग्रेड ${grade}`
      },
    qualityGradeLabel(grade) {
        return `ग्रेड ${grade}`
      },
    qualityOutOf: '/ 100',
    qualityBreakdownTitle: 'इस अंक में क्या शामिल है',
    qualityCategoryTitle(category) {
        return (
          {
            architecture: 'संरचना नियम',
            cycles: 'चक्रीय इंपोर्ट',
            hotspots: 'सबसे जोखिम भरी फ़ाइलें',
            imports: 'इंपोर्ट',
            size: 'फ़ाइल और फ़ंक्शन का आकार'
          } as const
        )[category]
      },
    qualityPointsOff(penalty) {
        if (penalty <= 0) return 'कोई अंक नहीं कटे'
        return penalty === 1 ? '1 अंक कटा' : `${penalty} अंक कटे`
      },
    qualityTipsTitle: 'इस अंक को कैसे बढ़ाएँ',
    qualityTipGain(gain) {
        return gain === 1 ? 'लगभग +1 अंक' : `लगभग +${gain} अंक`
      },
    qualityFoldersTitle: 'फ़ोल्डर के अंक',
    qualityFoldersHint: 'सबसे कम अंक वाले फ़ोल्डर पहले। ग्राफ में देखने के लिए एक फ़ोल्डर खोलें।',
    qualityFoldersShowing(shown, total) {
        return `सबसे कम अंक वाले ${shown} फ़ोल्डर दिखा रहे हैं, कुल ${total} में से। ग्राफ में देखने के लिए एक फ़ोल्डर खोलें।`
      },
    qualityFoldersOpen: 'ग्राफ में दिखाएँ',
    qualityFolderSummaryNone: 'इस फ़ोल्डर में कोई समस्या नहीं है।',
    duplicatesTitle: 'दोहराया गया कोड',
    duplicatesHint: 'ये वे जगहें हैं जहाँ कोड का एक ही खंड एक से अधिक बार आता है। ग्राफ में देखने के लिए एक फ़ाइल खोलें।',
    duplicatesGroupsValueLabel(count) {
        return count === 1 ? '1 दोहराया खंड' : `${count.toLocaleString('hi')} दोहराए गए खंड`
      },
    duplicatesLinesValueLabel(count) {
        return count === 1 ? '1 दोहराई गई पंक्ति' : `${count.toLocaleString('hi')} दोहराई गई पंक्तियाँ`
      },
    duplicatesPercentValue(percent) {
        return `${percent}%`
      },
    duplicatesGroupsCaption(count) {
        return count === 1 ? 'दोहराया खंड' : 'दोहराए गए खंड'
      },
    duplicatesLinesCaption(count) {
        return count === 1 ? 'दोहराई गई पंक्ति' : 'दोहराई गई पंक्तियाँ'
      },
    duplicatesPercentCaption: 'स्कैन किए गए कोड का हिस्सा दोहराया गया है',
    duplicatesSummaryLabel(groups, lines, percent) {
        const blocks = groups === 1 ? '1 दोहराया खंड' : `${groups.toLocaleString('hi')} दोहराए गए खंड`
        const repeated = lines === 1 ? '1 दोहराई गई पंक्ति' : `${lines.toLocaleString('hi')} दोहराई गई पंक्तियाँ`
        return `${blocks}. ${repeated}. ${percent}% स्कैन किए गए कोड का हिस्सा दोहराया गया है`
      },
    duplicatesGroupLines(count) {
        return count === 1 ? '1 पंक्ति' : `${count.toLocaleString('hi')} पंक्तियाँ`
      },
    duplicatesGroupPlaces(count) {
        return count === 1 ? '1 जगह' : `${count.toLocaleString('hi')} जगहें`
      },
    duplicatesLineRange(startLine, endLine) {
        if (startLine === endLine) return `पंक्ति ${startLine}`
        return `पंक्तियाँ ${startLine}–${endLine}`
      },
    duplicatesOpen: 'ग्राफ में दिखाएँ',
    duplicatesShowing(shown, total) {
        return `सबसे बड़े ${shown} दोहराए गए खंड दिखा रहे हैं, कुल ${total} में से। ग्राफ में देखने के लिए एक फ़ाइल खोलें।`
      },
    askTitle: 'इस प्रोजेक्ट के बारे में पूछें',
    askHint: 'इस स्कैन के बारे में एक छोटा प्रश्न पूछें। जवाब स्कैन के परिणामों से आते हैं, किसी चैटबॉट से नहीं।',
    askInputLabel: 'आपका प्रश्न',
    askPlaceholder: 'उदाहरण के लिए, सबसे जोखिम भरी फ़ाइलें कौन सी हैं?',
    askButton: 'पूछें',
    askThinking: 'सोच रहे हैं…',
    askStarters: [
          'सबसे जोखिम भरी फ़ाइलें कौन सी हैं?',
          'यह प्रोजेक्ट कितना स्वस्थ है?',
          'कोड कहाँ दोहराया गया है?',
          'क्या चक्रीय इंपोर्ट हैं?'
        ],
    askCitationsTitle: 'उल्लिखित जगहें',
    askFollowUpsTitle: 'अगला प्रश्न',
    askOpen: 'ग्राफ में दिखाएँ',
    askCharCount(used, max) {
        return `${used} / ${max} अक्षर`
      },
    askTooLong: 'कृपया अपना प्रश्न 500 अक्षर या उससे कम रखें।',
    askSessionExpired: 'आपका सत्र समाप्त हो गया है। कृपया फिर से साइन इन करें।',
    askScanRunning: 'यह स्कैन अभी चल रहा है। समाप्त होने पर फिर कोशिश करें।',
    askScanUnavailable: 'इस स्कैन के बारे में पूछना उपलब्ध नहीं है।',
    askRateLimited: 'दूसरा प्रश्न पूछने से पहले थोड़ी देर प्रतीक्षा करें।',
    askTypeFirst: 'पहले एक प्रश्न लिखें।',
    askUnreachable: 'सर्वर तक नहीं पहुँच सके। कनेक्शन जाँचें और फिर कोशिश करें।',
    askGenericError: 'अभी उत्तर नहीं दे सके। कृपया फिर कोशिश करें।',
    askCitationFolder: 'फ़ोल्डर',
    askCitationIn(path) {
        return `${path} में`
      },
    askLine(line) {
        return `पंक्ति ${line}`
      },
    askLines(startLine, endLine) {
        if (startLine === endLine) return `पंक्ति ${startLine}`
        return `पंक्तियाँ ${startLine}–${endLine}`
      }
  },
  ur: {
    riskiestFilesTitle: 'سب سے زیادہ خطرناک فائلیں',
    riskiestFilesHint: 'ان فائلوں کو تبدیل کرنے پر مسئلہ ہونے کا سب سے زیادہ امکان ہے۔ گراف میں دیکھنے کے لیے ایک فائل کھولیں۔',
    riskiestFilesOpen: 'گراف میں دکھائیں',
    hotspotBandLabel(band) {
        return ({ low: 'کم', medium: 'درمیانہ', high: 'زیادہ' } as const)[band]
      },
    riskiestFilesScore(score, band) {
        return `${score} · ${band}`
      },
    qualityTitle: 'پروجیکٹ کا معیار',
    qualityHint: 'پورے پروجیکٹ کے لیے 100 میں سے ایک اسکور، جو ساخت کے قواعد، سرکلر امپورٹس، خطرناک فائلوں، امپورٹس اور سائز پر مبنی ہے۔',
    qualityScoreLabel(score, grade) {
        return `${score} / 100، گریڈ ${grade}`
      },
    qualityGradeLabel(grade) {
        return `گریڈ ${grade}`
      },
    qualityOutOf: '/ 100',
    qualityBreakdownTitle: 'اس اسکور میں کیا شامل ہے',
    qualityCategoryTitle(category) {
        return (
          {
            architecture: 'ساخت کے قواعد',
            cycles: 'سرکلر امپورٹس',
            hotspots: 'سب سے زیادہ خطرناک فائلیں',
            imports: 'امپورٹس',
            size: 'فائل اور فنکشن کا سائز'
          } as const
        )[category]
      },
    qualityPointsOff(penalty) {
        if (penalty <= 0) return 'کوئی پوائنٹ نہیں کٹے'
        return penalty === 1 ? '1 پوائنٹ کٹا' : `${penalty} پوائنٹس کٹے`
      },
    qualityTipsTitle: 'اس اسکور کو کیسے بڑھائیں',
    qualityTipGain(gain) {
        return gain === 1 ? 'تقریباً +1 پوائنٹ' : `تقریباً +${gain} پوائنٹس`
      },
    qualityFoldersTitle: 'فولڈرز کے اسکور',
    qualityFoldersHint: 'سب سے کم اسکور والے فولڈر پہلے। گراف میں دیکھنے کے لیے ایک فولڈر کھولیں۔',
    qualityFoldersShowing(shown, total) {
        return `سب سے کم اسکور والے ${shown} فولڈر دکھا رہے ہیں، کل ${total} میں سے۔ گراف میں دیکھنے کے لیے ایک فولڈر کھولیں۔`
      },
    qualityFoldersOpen: 'گراف میں دکھائیں',
    qualityFolderSummaryNone: 'اس فولڈر میں کوئی مسئلہ نہیں۔',
    duplicatesTitle: 'دوہرا کوڈ',
    duplicatesHint: 'یہ وہ جگہیں ہیں جہاں کوڈ کا ایک ہی بلاک ایک سے زیادہ بار آتا ہے۔ گراف میں دیکھنے کے لیے ایک فائل کھولیں۔',
    duplicatesGroupsValueLabel(count) {
        return count === 1 ? '1 دہرایا ہوا بلاک' : `${count.toLocaleString('ur')} دہرائے ہوئے بلاکس`
      },
    duplicatesLinesValueLabel(count) {
        return count === 1 ? '1 دہرائی ہوئی لائن' : `${count.toLocaleString('ur')} دہرائی ہوئی لائنیں`
      },
    duplicatesPercentValue(percent) {
        return `${percent}%`
      },
    duplicatesGroupsCaption(count) {
        return count === 1 ? 'دہرایا ہوا بلاک' : 'دہرائے ہوئے بلاکس'
      },
    duplicatesLinesCaption(count) {
        return count === 1 ? 'دہرائی ہوئی لائن' : 'دہرائی ہوئی لائنیں'
      },
    duplicatesPercentCaption: 'اسکین شدہ کوڈ دہرایا گیا ہے',
    duplicatesSummaryLabel(groups, lines, percent) {
        const blocks = groups === 1 ? '1 دہرایا ہوا بلاک' : `${groups.toLocaleString('ur')} دہرائے ہوئے بلاکس`
        const repeated = lines === 1 ? '1 دہرائی ہوئی لائن' : `${lines.toLocaleString('ur')} دہرائی ہوئی لائنیں`
        return `${blocks}. ${repeated}. ${percent}% اسکین شدہ کوڈ دہرایا گیا ہے`
      },
    duplicatesGroupLines(count) {
        return count === 1 ? '1 لائن' : `${count.toLocaleString('ur')} لائنیں`
      },
    duplicatesGroupPlaces(count) {
        return count === 1 ? '1 جگہ' : `${count.toLocaleString('ur')} جگہیں`
      },
    duplicatesLineRange(startLine, endLine) {
        if (startLine === endLine) return `لائن ${startLine}`
        return `لائنیں ${startLine}–${endLine}`
      },
    duplicatesOpen: 'گراف میں دکھائیں',
    duplicatesShowing(shown, total) {
        return `سب سے بڑے ${shown} دہرائے ہوئے بلاکس دکھا رہے ہیں، کل ${total} میں سے۔ گراف میں دیکھنے کے لیے ایک فائل کھولیں۔`
      },
    askTitle: 'اس پروجیکٹ کے بارے میں پوچھیں',
    askHint: 'اس اسکین کے بارے میں ایک مختصر سوال پوچھیں۔ جوابات اسکین کے نتائج سے آتے ہیں، چیٹ بوٹ سے نہیں۔',
    askInputLabel: 'آپ کا سوال',
    askPlaceholder: 'مثال کے طور پر، سب سے زیادہ خطرناک فائلیں کون سی ہیں؟',
    askButton: 'پوچھیں',
    askThinking: 'سوچ رہے ہیں…',
    askStarters: [
          'سب سے زیادہ خطرناک فائلیں کون سی ہیں؟',
          'اس پروجیکٹ کی حالت کیسی ہے؟',
          'کوڈ کہاں دہرایا گیا ہے؟',
          'کیا سرکلر امپورٹس ہیں؟'
        ],
    askCitationsTitle: 'ذکر شدہ جگہیں',
    askFollowUpsTitle: 'اگلا سوال',
    askOpen: 'گراف میں دکھائیں',
    askCharCount(used, max) {
        return `${used} / ${max} حروف`
      },
    askTooLong: 'براہ کرم اپنا سوال 500 حروف یا اس سے کم رکھیں۔',
    askSessionExpired: 'آپ کا سیشن ختم ہو گیا ہے۔ براہ کرم دوبارہ سائن ان کریں۔',
    askScanRunning: 'یہ اسکین ابھی چل رہا ہے۔ ختم ہونے پر دوبارہ کوشش کریں۔',
    askScanUnavailable: 'اس اسکین کے بارے میں سوال نہیں پوچھا جا سکتا۔',
    askRateLimited: 'اگلا سوال پوچھنے سے پہلے تھوڑی دیر انتظار کریں۔',
    askTypeFirst: 'پہلے ایک سوال لکھیں۔',
    askUnreachable: 'سرور تک نہیں پہنچ سکے۔ کنکشن چیک کریں اور دوبارہ کوشش کریں۔',
    askGenericError: 'ابھی جواب نہیں دے سکے۔ براہ کرم دوبارہ کوشش کریں۔',
    askCitationFolder: 'فولڈر',
    askCitationIn(path) {
        return `${path} میں`
      },
    askLine(line) {
        return `لائن ${line}`
      },
    askLines(startLine, endLine) {
        if (startLine === endLine) return `لائن ${startLine}`
        return `لائنیں ${startLine}–${endLine}`
      }
  }
}
