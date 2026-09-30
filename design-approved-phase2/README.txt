DESIGN APPROVED — PHASE 2
Progetto: Semprini Francesca – Il Registro
Sezione: STUDENTI

Questa cartella integra il pacchetto design-approved-phase1.
Le immagini qui presenti sono le versioni grafiche APPROVATE nella conversazione e devono avere priorità rispetto a mockup precedenti o file simili presenti nel repository.

FILE

11-studenti-diario-da-pulire.png
- Dimensioni: 941 x 1672 px (rapporto circa 9:16)
- Stato: APPROVATA come riferimento grafico; DA PULIRE dai dati dinamici prima dell'uso come sfondo/base definitiva.
- Pagina prevista: Diario studenti.
- Mantieni: atmosfera, titolo, ricerca, filtri, struttura delle card, gerarchia visiva, barra inferiore STUDENTI.
- Dati da rendere dinamici: nomi studenti, materie, date, ultima lezione, note sintetiche, prossimo obiettivo, eventuali conteggi/testi specifici.
- Barra inferiore obbligatoria e uniforme alla sezione STUDENTI: I miei studenti / Nuovo studente / Diario / Archivio, con Diario attivo.
- MENU resta la navigazione globale.

12-studenti-archivio-da-pulire.png
- Dimensioni: 941 x 1672 px (rapporto circa 9:16)
- Stato: APPROVATA come riferimento grafico; DA PULIRE dai dati dinamici prima dell'uso come sfondo/base definitiva.
- Pagina prevista: Scheda archivio studente.
- Mantieni: campo Cerca studente, fotografia, struttura del riepilogo, ultime lezioni, note finali, pulsante RIPRISTINA IN STUDENTI, atmosfera grafica e barra inferiore STUDENTI.
- Rimuovere/evitare come funzione: ESPORTA SCHEDA.
- Dati da rendere dinamici: studente, foto, materia/classe/stato, date, quantità lezioni, riepilogo percorso, ultime lezioni, note finali.
- Barra inferiore obbligatoria e uniforme alla sezione STUDENTI: I miei studenti / Nuovo studente / Diario / Archivio, con Archivio attivo.
- MENU resta la navigazione globale.

REGOLE VINCOLANTI
1. Non rigenerare queste immagini e non sostituirle con versioni precedenti.
2. Non usare i testi di esempio come dati statici dell'app.
3. I dati reali devono essere sovrapposti/gestiti dal codice e dallo storage esistente.
4. Le pagine operative devono restare scrollabili, leggibili e mobile-first.
5. Non introdurre una seconda banca dati per diario o archivio: riutilizzare i dati e gli ID esistenti.
6. Archivio non significa eliminazione: uno studente archiviato deve conservare ID, lezioni, pagamenti e storico ed essere ripristinabile.
7. Il Diario studenti è una vista trasversale dei dati didattici già esistenti, non un archivio lezioni duplicato.
8. Non modificare OGGI come parte di questo pacchetto.

NOTA ROUTE
- Conservare /studenti come route operativa dell'elenco I miei studenti.
- Usare /studenti/home per la copertina STUDENTI.
- Definire le nuove route di Diario e Archivio senza rompere i collegamenti già esistenti.
