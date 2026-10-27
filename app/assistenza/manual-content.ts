export type HelpTopic = {
  id: string;
  title: string;
  summary: string;
  details: string[];
  links: { label: string; href: string }[];
  keywords: string;
};

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "oggi", title: "OGGI e DOMANI", summary: "Consulta gli impegni vicini e apri le lezioni del giorno.",
    details: [
      "In OGGI scegli OGGI o DOMANI per vedere le lezioni previste nei due giorni. Tocca una lezione di oggi per aprirne il riepilogo.",
      "Quando la lezione è avvenuta, usa SEGNA SVOLTA. La vista DOMANI serve a prepararti: non conclude lezioni in anticipo.",
    ],
    links: [{ label: "Apri OGGI", href: "/oggi" }, { label: "Apri DOMANI", href: "/oggi?giorno=domani" }],
    keywords: "giornata domani oggi appuntamenti concludi",
  },
  {
    id: "studenti", title: "Studenti", summary: "Trova le schede e apri le informazioni di ciascuno studente.",
    details: [
      "Da STUDENTI apri I MIEI STUDENTI e scegli una scheda. La card mostra materie, prossima lezione e stato dei pagamenti.",
      "Dalla card raggiungi la SCHEDA NARRATA per rivedere i dati e il DIARIO STUDENTE per la storia delle lezioni.",
    ],
    links: [{ label: "Apri STUDENTI", href: "/studenti" }, { label: "I miei studenti", href: "/studenti/elenco" }],
    keywords: "elenco profilo card alunno scheda",
  },
  {
    id: "crea-studente", title: "Creare uno studente", summary: "Crea la scheda e associa le materie nel profilo.",
    details: [
      "Da STUDENTI apri NUOVO STUDENTE. Inserisci i dati richiesti e seleziona le materie che seguirai con lo studente.",
      "Controlla la scheda narrata e salva quando è pronta. Le informazioni facoltative si possono completare in seguito.",
    ],
    links: [{ label: "Nuovo studente", href: "/studenti/nuovo" }, { label: "Elenco studenti", href: "/studenti/elenco" }],
    keywords: "creazione nuovo profilo anagrafica materie",
  },
  {
    id: "modifica-studente", title: "Modificare uno studente", summary: "Aggiorna la scheda narrata e le materie associate.",
    details: [
      "Apri lo studente da I MIEI STUDENTI, poi scegli SCHEDA NARRATA. Usa MODIFICA per aggiornare i dati, comprese le materie.",
      "Salva la scheda al termine. Le associazioni aggiornate compaiono anche in STUDENTI PER MATERIA.",
    ],
    links: [{ label: "I miei studenti", href: "/studenti/elenco" }, { label: "Studenti per materia", href: "/materie/studenti" }],
    keywords: "modifica scheda narrata correggere materie",
  },
  {
    id: "archivio-studenti", title: "Archivio Studenti", summary: "Conserva le schede non più attive e recuperale quando servono.",
    details: [
      "Dalla card dello studente scegli ARCHIVIA STUDENTE e conferma. La scheda resta consultabile nell'ARCHIVIO, insieme alla storia delle lezioni.",
      "Nell'ARCHIVIO scegli RIPRISTINA STUDENTE per riportarlo tra gli studenti attivi.",
    ],
    links: [{ label: "Archivio Studenti", href: "/studenti/archivio" }, { label: "I miei studenti", href: "/studenti/elenco" }],
    keywords: "archiviazione ripristino inattivo storico",
  },
  {
    id: "diario-studenti", title: "Diario Studenti", summary: "Leggi la storia delle lezioni di un singolo studente.",
    details: [
      "Dal DIARIO STUDENTI scegli uno studente e consulta le sue lezioni in ordine cronologico.",
      "Apri una lezione per rivederne i dettagli. Dalla card dello studente puoi raggiungere direttamente il suo diario.",
    ],
    links: [{ label: "Diario Studenti", href: "/studenti/diario" }, { label: "I miei studenti", href: "/studenti/elenco" }],
    keywords: "diario alunno cronologia lezioni scheda",
  },
  {
    id: "materie", title: "Materie", summary: "Consulta Matematica, Fisica e Chimica e i relativi percorsi.",
    details: [
      "Le materie sono già presenti. Puoi esplorarle da MATERIE senza crearle di nuovo.",
      "Per associare una materia a uno studente, scegli la materia nella sua scheda; STUDENTI PER MATERIA mostra le associazioni salvate.",
    ],
    links: [{ label: "Le mie materie", href: "/materie/elenco" }, { label: "Studenti per materia", href: "/materie/studenti" }],
    keywords: "matematica fisica chimica associazioni",
  },
  {
    id: "argomenti", title: "Argomenti", summary: "Distingui il catalogo dagli argomenti affrontati nelle lezioni.",
    details: [
      "In ARGOMENTI scegli la materia e cerca un tema nel catalogo. Puoi aprire un argomento per leggere o scrivere appunti.",
      "La stessa pagina mostra separatamente gli argomenti registrati nelle lezioni SVOLTE. Questi derivano dalle lezioni: non occorre ricopiarli a mano nel catalogo.",
    ],
    links: [{ label: "Apri ARGOMENTI", href: "/materie/argomenti" }],
    keywords: "catalogo materia affrontato svolto note",
  },
  {
    id: "studenti-per-materia", title: "Studenti per materia", summary: "Ritrova gli studenti in base alle materie associate.",
    details: [
      "Apri STUDENTI PER MATERIA e scegli Matematica, Fisica o Chimica per consultare gli studenti collegati.",
      "Per cambiare un'associazione, modifica la scheda narrata dello studente: l'elenco per materia si aggiorna dai dati salvati.",
    ],
    links: [{ label: "Studenti per materia", href: "/materie/studenti" }, { label: "I miei studenti", href: "/studenti/elenco" }],
    keywords: "filtro associazione alunni matematica fisica chimica",
  },
  {
    id: "programmi", title: "Programmi personali e modello", summary: "Organizza ciò che prevedi di studiare, separatamente da ciò che hai svolto.",
    details: [
      "In PROGRAMMI MODELLO puoi preparare un percorso generale per una materia. In I MIEI PROGRAMMI puoi creare un programma per uno studente, anche partendo da un modello.",
      "Gli stati degli argomenti nel programma servono a pianificare il percorso. L'argomento effettivamente affrontato si registra nella lezione svolta e compare in ARGOMENTI.",
    ],
    links: [{ label: "Apri PROGRAMMI", href: "/materie/programmi" }, { label: "Argomenti svolti", href: "/materie/argomenti" }],
    keywords: "programma personale generale modello percorso previsto affrontato",
  },
  {
    id: "nuova-lezione", title: "Nuova lezione", summary: "Programma una lezione singola o ricorrente.",
    details: [
      "Da LEZIONI scegli NUOVA LEZIONE. Seleziona studente attivo, materia associata, data, ora, durata e modalità; controlla la disponibilità prima di salvare.",
      "Per ripeterla, attiva Ricorrenza settimanale, scegli l'intervallo e, se serve, una data finale. Dopo il salvataggio la trovi nel CALENDARIO.",
      "Una lezione programmata non è ancora SVOLTA e non registra un pagamento.",
    ],
    links: [{ label: "Nuova lezione", href: "/calendario/nuova" }, { label: "Calendario mese", href: "/calendario/mese" }],
    keywords: "crea lezione ricorrenza settimanale appuntamento durata bozza",
  },
  {
    id: "calendario", title: "Calendario", summary: "Consulta gli appuntamenti nelle viste mese, settimana e giorno.",
    details: [
      "Dopo aver salvato una lezione, apri CALENDARIO e scegli la vista mese, settimana o giorno per ritrovarla.",
      "Dalla vista giorno puoi scegliere una fascia oraria per iniziare una nuova lezione. Verifica sempre data e ora prima di salvarla.",
    ],
    links: [{ label: "Mese", href: "/calendario/mese" }, { label: "Settimana", href: "/calendario/settimana" }, { label: "Giorno", href: "/calendario/giorno" }],
    keywords: "agenda mese settimana giorno appuntamenti",
  },
  {
    id: "modifica-lezione", title: "Modificare una lezione", summary: "Rivedi i dettagli di un appuntamento già salvato.",
    details: [
      "Apri la lezione dal CALENDARIO, da IN PROGRAMMA o dallo STORICO. Nel dettaglio puoi correggere i campi disponibili e salvare.",
      "Controlla data, stato e importo prima di confermare le modifiche. Una lezione programmata resta distinta da una lezione SVOLTA.",
    ],
    links: [{ label: "Calendario", href: "/calendario/mese" }, { label: "In programma", href: "/lezioni/in-programma" }],
    keywords: "modifica appuntamento data durata stato",
  },
  {
    id: "in-programma", title: "Lezioni in programma", summary: "Consulta gli appuntamenti futuri e gli spostamenti.",
    details: [
      "IN PROGRAMMA raccoglie le lezioni previste; aprine una per vedere o modificare i dettagli.",
      "Per le lezioni in presenza puoi consultare sede e collegamenti al percorso quando gli indirizzi sono disponibili. La sede abituale si gestisce in IMPOSTAZIONI.",
    ],
    links: [{ label: "Apri IN PROGRAMMA", href: "/lezioni/in-programma" }, { label: "Impostazioni", href: "/impostazioni" }],
    keywords: "future spostamenti indirizzo percorso sede",
  },
  {
    id: "concludi-lezione", title: "Concludere una lezione", summary: "Segna SVOLTA una lezione avvenuta e aggiungi dettagli facoltativi.",
    details: [
      "In OGGI apri una lezione del giorno e scegli SEGNA SVOLTA dopo averla effettivamente tenuta. Lo stato didattico diventa SVOLTA.",
      "Argomento affrontato e appunti sono facoltativi. Puoi consultarli poi nel DIARIO e nello STORICO. Un eventuale versamento si registra separatamente.",
    ],
    links: [{ label: "Apri OGGI", href: "/oggi" }, { label: "Storico", href: "/lezioni/storico" }],
    keywords: "svolta conclusa argomento affrontato appunti pagamento separato",
  },
  {
    id: "diario", title: "Diario delle lezioni", summary: "Rileggi gli argomenti e le annotazioni delle lezioni svolte.",
    details: [
      "Il DIARIO mostra le lezioni svolte. Cerca per studente, materia o testo e scegli l'ordine di lettura.",
      "Qui puoi aggiungere o modificare le annotazioni. L'argomento affrontato già registrato nella lezione appare automaticamente.",
    ],
    links: [{ label: "Apri DIARIO", href: "/lezioni/diario" }],
    keywords: "annotazioni appunti ricerca svolte",
  },
  {
    id: "storico", title: "Storico delle lezioni", summary: "Consulta le lezioni concluse e aprine il dettaglio.",
    details: [
      "Lo STORICO raccoglie le lezioni con stato SVOLTA. Apri una lezione per rivedere data, materia e dettagli registrati.",
      "Per leggere o aggiornare le annotazioni usa anche il DIARIO. Le lezioni future restano tra quelle IN PROGRAMMA e nel CALENDARIO.",
    ],
    links: [{ label: "Apri STORICO", href: "/lezioni/storico" }, { label: "Diario", href: "/lezioni/diario" }],
    keywords: "lezioni concluse svolte diario passato",
  },
  {
    id: "tariffario", title: "Tariffario", summary: "Prepara i prezzi da usare per le lezioni compatibili.",
    details: [
      "Nel TARIFFARIO crea una tariffa scegliendo materia, fascia scolastica, modalità, formato e prezzo orario. Verifica che sia attiva.",
      "La tariffa serve a calcolare l'importo delle lezioni compatibili. Per registrare un versamento usa il RIEPILOGO, dopo la lezione svolta.",
    ],
    links: [{ label: "Apri TARIFFARIO", href: "/pagamenti/tariffario" }, { label: "Riepilogo", href: "/pagamenti/riepilogo" }],
    keywords: "prezzo orario fascia modalità formato attiva",
  },
  {
    id: "riepilogo", title: "Pagamenti e Riepilogo", summary: "Controlla dovuto, versato, residuo e incassi del mese.",
    details: [
      "Il RIEPILOGO mostra il valore delle lezioni SVOLTE, quanto è stato versato per esse e il residuo. Puoi registrare un saldo o un versamento parziale con la data effettiva.",
      "Gli incassi del mese seguono la data del versamento, anche quando la lezione appartiene a un altro mese. I saldi storici senza data non sono conteggiati come incassi datati.",
    ],
    links: [{ label: "Apri RIEPILOGO", href: "/pagamenti/riepilogo" }, { label: "Previsioni", href: "/pagamenti/previsioni" }],
    keywords: "pagamento saldo parziale dovuto residuo incasso ricevuta data",
  },
  {
    id: "previsioni", title: "Previsioni", summary: "Vedi gli importi attesi dalle lezioni future confermate.",
    details: [
      "PREVISIONI considera le lezioni future confermate e non annullate nell'intervallo scelto. Puoi leggere il valore previsto e gli eventuali importi già versati.",
      "Una previsione non equivale a un incasso né a una lezione già svolta. Il RIEPILOGO separa queste informazioni.",
    ],
    links: [{ label: "Apri PREVISIONI", href: "/pagamenti/previsioni" }, { label: "Riepilogo", href: "/pagamenti/riepilogo" }],
    keywords: "futuro confermata valore atteso previsione",
  },
  {
    id: "statistiche", title: "Statistiche", summary: "Esamina lezioni e valori per mese, anno e studente.",
    details: [
      "In STATISTICHE scegli mese o intero anno. Puoi leggere il numero di lezioni, il loro valore, il versato attribuito e il residuo dovuto.",
      "Seleziona uno studente per il dettaglio. Per gli incassi secondo la data del versamento usa il RIEPILOGO.",
    ],
    links: [{ label: "Apri STATISTICHE", href: "/pagamenti/statistiche" }, { label: "Riepilogo", href: "/pagamenti/riepilogo" }],
    keywords: "mese anno studente valore lezioni versato residuo",
  },
  {
    id: "impostazioni", title: "Impostazioni e sede", summary: "Controlla la sede abituale e il margine di spostamento.",
    details: [
      "In IMPOSTAZIONI verifica l'indirizzo proposto e salva la sede delle lezioni quando corrisponde a quella che usi. Puoi impostare anche il margine in minuti per gli spostamenti.",
      "La checklist indica se la sede è stata salvata; vedere un indirizzo iniziale sullo schermo non significa che sia già stato confermato.",
    ],
    links: [{ label: "Apri IMPOSTAZIONI", href: "/impostazioni" }],
    keywords: "indirizzo luogo casa margine configurazione",
  },
];

export function topicForPath(path: string): HelpTopic | undefined {
  let id: string | undefined;
  if (path === "/oggi") id = "oggi";
  else if (path.startsWith("/studenti/nuovo")) id = "crea-studente";
  else if (path === "/studenti/archivio") id = "archivio-studenti";
  else if (path === "/studenti/diario" || /^\/studenti\/[^/]+\/lezioni$/.test(path)) id = "diario-studenti";
  else if (/^\/studenti\/[^/]+\/modifica(?:\/|$)/.test(path)) id = "modifica-studente";
  else if (path.startsWith("/studenti")) id = "studenti";
  else if (path === "/materie/programmi") id = "programmi";
  else if (path === "/materie/argomenti" || /^\/materie\/[^/]+\/argomento$/.test(path)) id = "argomenti";
  else if (path === "/materie/studenti" || /^\/materie\/[^/]+\/studenti$/.test(path)) id = "studenti-per-materia";
  else if (path.startsWith("/materie")) id = "materie";
  else if (path === "/calendario/nuova") id = "nuova-lezione";
  else if (/^\/calendario\/[^/]+\/modifica$/.test(path)) id = "modifica-lezione";
  else if (path.startsWith("/calendario")) id = "calendario";
  else if (path === "/lezioni/diario") id = "diario";
  else if (path === "/lezioni/storico") id = "storico";
  else if (path === "/lezioni/in-programma") id = "in-programma";
  else if (path.startsWith("/lezioni")) id = "nuova-lezione";
  else if (path === "/pagamenti/tariffario") id = "tariffario";
  else if (path === "/pagamenti/riepilogo") id = "riepilogo";
  else if (path === "/pagamenti/previsioni") id = "previsioni";
  else if (path === "/pagamenti/statistiche") id = "statistiche";
  else if (path.startsWith("/pagamenti")) id = "riepilogo";
  else if (path.startsWith("/impostazioni")) id = "impostazioni";
  return HELP_TOPICS.find((topic) => topic.id === id);
}
