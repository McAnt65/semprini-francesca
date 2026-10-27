export type TourId = "primi-passi" | "studenti" | "materie" | "lezioni" | "pagamenti";

export { HELP_TOPICS, topicForPath } from "./manual-content";
export type { HelpTopic } from "./manual-content";

export type TourStep = { title: string; description: string; href: string; action: string };
export const TOURS: Record<TourId, { title: string; steps: TourStep[] }> = {
  "primi-passi": { title: "Primi passi", steps: [
    { title: "OGGI e MENU", description: "OGGI riassume le lezioni del giorno e di domani; dal MENU raggiungi tutte le sezioni. Il tour comincia dal MENU: potrai aprire OGGI quando vorrai consultare i tuoi impegni.", href: "/menu", action: "Apri MENU" },
    { title: "IMPOSTAZIONI", description: "Controlla la sede abituale e il margine di spostamento. Salvali soltanto quando vuoi impostare i tuoi dati.", href: "/impostazioni", action: "Apri IMPOSTAZIONI" },
    { title: "STUDENTI e materie", description: "Da STUDENTI → NUOVO STUDENTE crei il profilo e scegli Matematica, Fisica o Chimica; puoi aggiornare le materie nella scheda dello studente. Il tour resta sulla copertina: apri il modulo quando vorrai creare una scheda.", href: "/studenti", action: "Apri STUDENTI" },
    { title: "NUOVA LEZIONE", description: "Da LEZIONI → NUOVA LEZIONE scegli studente, materia, data, ora e durata. Il tour resta sulla copertina; apri il modulo quando vorrai programmare una lezione.", href: "/lezioni", action: "Apri LEZIONI" },
    { title: "CALENDARIO", description: "Nelle viste mese, settimana e giorno consulti gli appuntamenti salvati. Nessuna lezione di prova è necessaria per proseguire.", href: "/calendario/mese", action: "Apri CALENDARIO" },
    { title: "CONCLUDI LEZIONE", description: "Dopo una lezione effettivamente svolta, da OGGI apri la lezione e scegli SEGNA SVOLTA; argomento svolto e appunti sono facoltativi. Il pagamento si registra separatamente. Lo STORICO mostra le lezioni concluse.", href: "/lezioni/storico", action: "Apri STORICO" },
    { title: "PAGAMENTI", description: "Nel TARIFFARIO prepari i prezzi. Il RIEPILOGO distingue importi dovuti, saldi e incassi per data del versamento; PREVISIONI mostra lezioni future confermate. Non serve registrare un pagamento per preparare l'app.", href: "/pagamenti/tariffario", action: "Apri TARIFFARIO" },
  ] },
  studenti: { title: "Tour Studenti", steps: [
    { title: "Crea la scheda", description: "Da STUDENTI → NUOVO STUDENTE registri un profilo e associ le materie. La copertina non crea bozze.", href: "/studenti", action: "STUDENTI" },
    { title: "Consulta la scheda", description: "Da STUDENTI → I MIEI STUDENTI apri profilo, diario e modifica. Il tour resta sulla copertina; consulta l'elenco quando desideri aprire una scheda.", href: "/studenti", action: "STUDENTI" },
  ] },
  materie: { title: "Tour Materie", steps: [
    { title: "Esplora le materie", description: "Da MATERIE consulti Matematica, Fisica e Chimica. L'associazione allo studente si imposta nel suo profilo.", href: "/materie", action: "MATERIE" },
    { title: "Argomenti e programmi", description: "La sezione ARGOMENTI si consulta senza modifiche; i PROGRAMMI personali si preparano quando hai uno studente salvato.", href: "/materie/argomenti", action: "ARGOMENTI" },
  ] },
  lezioni: { title: "Tour Lezioni e calendario", steps: [
    { title: "Programma", description: "Da LEZIONI → NUOVA LEZIONE imposti studente, materia, data e ora. Apri il modulo quando vuoi programmare davvero una lezione.", href: "/lezioni", action: "LEZIONI" },
    { title: "Controlla l'agenda", description: "Passa tra mese, settimana e giorno per verificare gli impegni.", href: "/calendario/mese", action: "Calendario" },
    { title: "Segna svolta", description: "Da OGGI concludi una lezione avvenuta con SEGNA SVOLTA e, se vuoi, aggiungi appunti. Lo STORICO permette di consultarla; un eventuale incasso è separato.", href: "/lezioni/storico", action: "STORICO" },
  ] },
  pagamenti: { title: "Tour Pagamenti", steps: [
    { title: "Prepara le tariffe", description: "Crea una tariffa da usare nelle lezioni compatibili.", href: "/pagamenti/tariffario", action: "Tariffario" },
    { title: "Dovuto e incassi", description: "Il RIEPILOGO mostra dovuto e residuo delle lezioni svolte; gli incassi seguono la data del versamento. Una lezione programmata non è ancora attività svolta.", href: "/pagamenti/riepilogo", action: "RIEPILOGO" },
    { title: "Previsioni", description: "PREVISIONI considera lezioni future confermate e non annullate. Sono importi attesi, non incassi già ricevuti.", href: "/pagamenti/previsioni", action: "PREVISIONI" },
  ] },
};
