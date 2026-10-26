# Istruzioni permanenti per gli agenti — Semprini Francesca · Il Registro

**Versione:** 1.0 · 8 ottobre 2026  
**Ambito:** ogni attività su pagine, componenti, immagini, navigazione, interazioni, dati o layout nel repository `McAnt65/semprini-francesca`.  
**Collocazione prevista:** `AGENTS.md` nella radice del repository.  
**Stato:** direttive di progetto approvate; il file va inserito nel repository per essere disponibile agli agenti. Non sostituisce le verifiche sul codice corrente.

> **REGOLA DI INGRESSO (obbligatoria):** prima di creare o modificare una pagina o un'interazione, leggi integralmente questo file e `docs/design/DESIGN-SYSTEM.md`. Se il secondo documento manca o non coincide con la versione approvata, segnala il problema e NON inventare regole sostitutive. Consulta inoltre i riferimenti visivi pertinenti e il codice esistente. Se un agente non può accedere a questi materiali, deve dichiararlo e interrompere le modifiche grafiche, richiedendo il materiale mancante.

## 1. Gerarchia delle fonti

1. **Decisioni esplicite più recenti dell'utente** nel compito corrente e riferimenti grafici da lui approvati.
2. **Questo file** per i vincoli inderogabili del processo.
3. **`docs/design/DESIGN-SYSTEM.md`** per regole artistiche e tecniche consolidate.
4. **Master grafici originali verificati** (non mere copie chiamate `final`/`approved`).
5. **Codice corrente e comportamento reale dell'app**, da preservare finché non autorizzato a modificarli.

In caso di conflitto, **non decidere autonomamente quale variante estetica sia definitiva**: segnala il conflitto, mostra le alternative e attendi approvazione. Una schermata già approvata non va ridisegnata per uniformarla senza autorizzazione. La fonte più recente non prova da sola che un asset nel repository sia stato aggiornato.

## 2. Identità artistica vincolante

Il Registro è **un unico libro illustrato diviso in capitoli**. Le copertine sono ricche, romantiche, luminose, con illustrazioni ad acquerello e forte impatto. Le pagine interne sono **pagine di diario su cui scrivere**: carta avorio, grande respiro, calligrafia per i titoli, campi e testi leggibili, filetti sottili, pochi ornamenti marginali. **Non trasformare una pagina operativa in una seconda copertina.**

### Continuità all'interno di ciascuna sezione — ART-02

Tutte le sottopagine di una sezione devono sembrare **pagine consecutive dello stesso capitolo**, non schermate indipendenti. Mantieni invariate, salvo variazioni approvate: carta e texture, titoli e gerarchie tipografiche, tonalità dell'accento, margini, geometrie di header/footer, sistema di campi e pulsanti, illustrazioni della stessa famiglia e ordine delle icone inferiori. Le differenze sono funzionali, **non artistiche**. Verifica sempre la pagina contro *almeno un'altra sottopagina della medesima sezione*, oltre al suo master.

### Master visivi approvati dall'utente

- **MASTER-COVER:** copertina Studenti illustrata con quattro cartigli.
- **MASTER-LIST:** «I miei studenti» con ricerca, filtri e righe elenco.
- **MASTER-DETAIL:** Scheda studente con dati e collegamenti.
- **MASTER-CALENDAR:** composizione Calendario Mese / Settimana / Giorno.

Gli originali condivisi dall'utente l'8 ottobre 2026 hanno valore di riferimento artistico. **Percorsi effettivi nel repo e uguaglianza visiva ai file correnti sono ancora da verificare**; non inferirli dai nomi.

## 3. Colori e tipografia

- **Base di tutte le sezioni:** carta avorio calda, bordeaux identitario, testi seppia; dettagli rame/oro antico discreti.
- **STUDENTI:** accento **verde salvia delicato**, approvato come direzione. Non eliminare i fiori rosa già approvati.
- **LEZIONI, MATERIE, CALENDARIO, TARIFFE/PAGAMENTI:** accenti specifici **ancora proposti, non approvati**; non applicarli in produzione senza decisione esplicita.
- Accenti di sezione **solo in piccole velature, dettagli o stati**, non come tinta piena dell'intera pagina.
- Valori storici CSS da **verificare**, non imporre indiscriminatamente: avorio `#F4EDDF`, crema `#FBF4E7`, bordeaux `#6F2638`, seppia `#4B3024`, seppia tenue `#6F5745`.
- Font calligrafico per titoli; testo dei dati immediatamente leggibile. Non sostituire un font approvato con un fallback diverso senza test visivo e autorizzazione.

## 4. Navigazione — obbligatoria

- **OGGI** sempre in alto a **sinistra**, collegamento diretto a `/oggi`.
- **MENU** sempre in alto a **destra**, accesso alla navigazione generale.
- **Nessun pulsante INDIETRO** nella UI delle pagine.
- **Barra inferiore:** esclusivamente le sottopagine della **sezione corrente**, con icone/etichette/ordine coerenti su tutte le sue pagine. Non inserire una barra globale al suo posto.
- **Collegamenti contestuali dinamici** (studente, lezione, pagamento, materia, ecc.) possono condurre ad altre sezioni quando pertinente.
- Le frecce del Calendario che spostano mese/settimana/giorno sono navigazione temporale, **non** pulsanti INDIETRO.
- Modali, flussi non salvati e casi speciali vanno progettati esplicitamente e non giustificano l'introduzione automatica del pulsante INDIETRO.

## 5. Pulsanti, dati e immagini

- Nelle pagine interne la **maggioranza dei pulsanti è testuale**, sovrapposta allo sfondo in **aree visivamente trasparenti**; evita un secondo pulsante disegnato sopra cartigli già illustrati.
- Pulsanti HTML veri, utilizzabili con touch e tastiera, con stato di focus e feedback; non affidarti soltanto a coordinate decorative o timer per la navigazione.
- Le aree di input restano leggibili e possono avere un velo avorio leggero. Nessuna decorazione deve impedire inserimento/consultazione dei dati.
- Separa **livello illustrato** (texture, decori, cornici), **struttura** (griglie, contenitori) e **livello dinamico** (nomi, date, orari, importi, campi, azioni).
- Non incorporare dati modificabili nelle immagini e non duplicare scritte già presenti nel PNG.
- Non rigenerare, ridisegnare, sostituire, schiarire o tagliare immagini approvate senza consenso.

## 6. Mobile, geometria e comportamento

- Progetto **mobile-first**. Controlli minimi a **390×844** e **430×764** px; larghezza del Registro indicativamente massima **430 px**, salvo diversa regola verificata.
- Niente scroll orizzontale. Campi adeguati al tocco, accessibili e leggibili. Gestire tastiera e safe area.
- Nelle pagine interne mantenere le aree previste per lo scorrimento; evitare scrollbar visibili quando il design lo richiede, **senza inibire lo scroll**.
- Header e navigazione inferiore devono rimanere raggiungibili; sfondo, contenuti e hotspot non devono disallinearsi al cambio viewport.
- Conservare funzionalità e dati esistenti: l'intervento grafico non è autorizzazione a modificare regole di business o persistenza.

## 7. Procedura obbligatoria PRIMA di ogni intervento (GATE A)

**Non scrivere codice né generare nuove immagini prima di aver completato e presentato questi punti:**

1. **Perimetro:** route e file presumibilmente interessati; che cosa è richiesto e che cosa resta intoccabile.
2. **Riferimento:** master della famiglia (Cover/List/Detail/Calendar), sotto-pagine della stessa sezione e relativa approvazione.
3. **Stato reale:** asset richiamato dalla route, CSS, componenti, comportamento dei dati e navigazione; distinguere il repository remoto dalla copia locale, che potrebbe avere modifiche non pubblicate.
4. **Scostamenti:** differenze tra master approvato e schermata corrente; indicare se derivano da **immagine**, **CSS**, **componenti**, **dati** o se **non verificabili**.
5. **Coerenza di capitolo:** stessa carta, accento, tipografia, stile di campi/pulsanti, header, footer, ordine icone delle altre sottopagine.
6. **Impatto:** file da toccare, rischi di regressione, eventuali elementi dinamici e collegamenti incrociati.
7. **Piano minimo e verifiche:** soluzione proposta, schermate mobile di prova, interazioni da testare.
8. **Richiesta di via libera:** attendere approvazione prima dell'implementazione **quando l'incarico è di analisi/proposta o quando occorre una nuova decisione estetica**. Se l'utente ha già autorizzato esplicitamente l'implementazione precisa, procedere entro quel perimetro senza richiedere inutili conferme.

**Formato della scheda pre-intervento (obbligatorio nel resoconto):**

| Campo | Da compilare |
|---|---|
| Sezione / pagina / route | ... |
| Master e altre sottopagine confrontate | ... |
| Decisioni approvate applicabili | ... |
| Asset richiamato nel codice | ... / non verificato |
| Elementi dinamici e collegamenti | ... |
| Discrepanze immagine / CSS / componenti | ... |
| Modifiche consentite e file coinvolti | ... |
| Rischi e verifiche previste | ... |
| Approvazione richiesta? | sì/no e perché |

## 8. Procedura obbligatoria DOPO ogni intervento (GATE B)

1. Elencare **tutti i file modificati** e il motivo per ciascuno; non introdurre modifiche fuori perimetro.
2. Eseguire `npm run lint` e `npm run build` quando l'ambiente lo consente, indicando l'esito reale; non dichiarare test superati senza averli eseguiti.
3. Verificare navigazione OGGI/MENU, barra interna, interazioni dinamiche, modifica/salvataggio e assenza di regressioni ove pertinenti.
4. Confrontare screenshot reali a **390×844 e 430×764** con master e almeno una pagina sorella. Controllare sfondi, posizioni, crop, calligrafia, colori, scroll, tastiera, footer, aree cliccabili. Se non possibile, indicare **NON VERIFICATO**.
5. Mostrare prima/dopo o descrivere con precisione le differenze, separando **grafica approvata**, **codice presente** e **funzione testata**.
6. **Nessun commit, push o deploy** salvo autorizzazione esplicita per il compito specifico.
7. Fermarsi e chiedere conferma prima di generalizzare un cambiamento a un'intera sezione o alle altre sezioni.

## 9. Condizioni di STOP

Fermarsi, esplicitare il problema e chiedere istruzioni se:
- non è accessibile il master pertinente o l'immagine in uso;
- due versioni risultano in conflitto e manca un'approvazione certa;
- la soluzione richiede cambiare un elemento approvato non compreso nel compito;
- un componente comune comporta modifiche impreviste ad altre pagine;
- i dati dinamici, la navigazione o le funzionalità rischiano di essere persi;
- l'accesso al repository, alla copia locale o ai test necessari è assente e non consente una verifica attendibile.

**Non indovinare. Non reinterpretare. Non dichiarare verificato ciò che non è stato testato.**

## 10. Sequenza di sviluppo raccomandata

1. Completare la mappatura tra master approvati, asset e route attuali.
2. Validare i token e i componenti condivisi senza alterare le immagini approvate.
3. Applicare il metodo a **STUDENTI** come sezione pilota: Copertina → Elenco → Scheda → Nuovo studente → Diario → Archivio; confrontare ogni pagina con le altre.
4. Estendere alle sezioni successive **una per volta**, con autorizzazione e verifiche visive.

---

**Clausola d'uso:** il fatto di collocare questo file nella radice del repository facilita la lettura da parte di molti agenti di sviluppo, ma **non garantisce che qualsiasi strumento lo legga automaticamente**. In ogni incarico a Work o ad altri agenti specificare: «Leggi e applica prima `AGENTS.md` e `docs/design/DESIGN-SYSTEM.md`; mostra la scheda GATE A prima di modificare».

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
