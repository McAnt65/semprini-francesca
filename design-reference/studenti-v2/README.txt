STUDENTI v2 - MOCKUP APPROVATI

Questi file costituiscono il riferimento grafico ufficiale per la nuova sezione STUDENTI.

REGOLE GENERALI
- Non usare mockup precedenti della sezione Studenti.
- Base avorio/pergamena chiara.
- Rosa cipria come accento della sezione.
- Bordeaux per titoli e dettagli, non dominante.
- Stile floreale/acquerello delicato.
- Copertina più illustrata; pagine operative più ordinate e leggibili.
- Mobile-first, circa 390-430 px.
- Parte centrale delle pagine elenco/diario/archivio scrollabile.
- Nessuna scrollbar visibile.
- I dati dinamici devono essere HTML/CSS reali, non stampati nello sfondo.

NAVIGAZIONE STUDENTI
- Barra inferiore STUDENTI identica in tutte le pagine:
  I miei studenti | Nuovo studente | Diario | Archivio
- Cambia soltanto la voce attiva.
- Header coerente con Oggi / Il diario di Francesca / Menu.

NUOVO STUDENTE / SCHEDA STUDENTE
- Foto studente solo in Nuovo studente e Scheda studente.
- La foto caricata deve essere resa automaticamente nello stile previsto; nessun pulsante Acquerello dedicato.
- Nuovo studente e Scheda studente usano due viste:
  Profilo | Lezioni e note
- Le due viste condividono la stessa identità dello studente e gli stessi dati.
- La parte identità con foto, Nome/Cognome e azioni rapide resta coerente fra le due viste.

PAGINE APPROVATE
00-studenti-home-cover-approved.png
01-studenti-lista-approved.png
02-studenti-nuovo-profilo-approved.png
03-studenti-nuovo-lezioni-note-approved.png
04-studente-scheda-profilo-approved.png
05-studente-scheda-lezioni-note-approved.png
06-studenti-diario-approved.png
07-studenti-archivio-approved.png

RIFERIMENTI DI SUPPORTO
- 00-studenti-v2-style-reference.png: riferimento atmosfera/palette/stile generale.
- 01-studente-v2-layout-reference.png: riferimento architettura operativa Nuovo studente/Scheda studente.

REGOLE DI IMPLEMENTAZIONE
- I mockup approvati sono riferimenti visivi vincolanti.
- Work non deve reinterpretare liberamente lo stile.
- Le pagine operative devono essere costruite con vera UI HTML/CSS responsive.
- Evitare sovrapposizioni fragili di testi o input sopra campi disegnati nello sfondo.
- Preservare la logica dati, gli ID studenti, lo storage esistente, calendario, pagamenti, archivio/ripristino e le altre funzioni già presenti.
- Implementare una pagina alla volta.
- Dopo ogni pagina: controllo visivo mobile, npm run lint, npm run build.
- Non fare push finché la pagina non è approvata visivamente.

METODO DI LAVORO
1. Mockup approvato.
2. Implementazione singola pagina.
3. Screenshot reale su mobile/viewport 390-430 px.
4. Revisione visiva.
5. Lint/build.
6. Approvazione.
7. Pagina successiva.

Questa cartella rappresenta la fonte ufficiale della fase STUDENTI v2.
