# Semprini Francesca — Il Registro
## Manuale grafico e Design System — versione 1.1

**Data:** 8 ottobre 2026  
**Stato:** specifica progettuale aggiornata; non ancora implementata né validata integralmente sui file del repository.  
**Repository di riferimento:** `McAnt65/semprini-francesca`, ramo `main`.

## 1. Idea guida — ART-01 (APPROVATA)

**Il Registro è un libro illustrato: la copertina deve emozionare; la pagina interna deve invitare a scrivere.**

- **Copertine delle sezioni:** ricche, scenografiche, con acquerelli delicati, libri, motivi botanici, cartigli e titoli calligrafici. Sono il momento di impatto artistico.
- **Pagine interne:** principalmente pagine di diario, luminose e ordinate, con ampio spazio per leggere, registrare e modificare informazioni. Le illustrazioni rimangono piccole e marginali; non competono con i dati.
- Tutte le pagine appartengono allo stesso libro: identità cromatica, tratto illustrativo, tipografia e dettagli ornamentali coerenti.
- Evitare l'effetto «seconda copertina» sulle pagine operative.

## 2. Riferimenti visivi approvati

Gli **allegati condivisi nella conversazione dell'8 ottobre 2026** sono i riferimenti artistici approvati. Conservare gli originali e registrarne il percorso nel manifest degli asset prima dell'implementazione.

| Master | Riferimento approvato | Funzione |
|---|---|---|
| `MASTER-COVER` | Copertina «I miei studenti» con cartigli illustrati | Impatto artistico e composizione delle copertine |
| `MASTER-LIST` | Elenco «I miei studenti» con ricerca, filtri e righe | Ritmo, gerarchia dei dati, liste e ricerca |
| `MASTER-DETAIL` | Scheda studente | Dettagli, campi, contatti e operazioni |
| `MASTER-CALENDAR` | Composizione Mese / Settimana / Giorno | Griglie, navigazione temporale e overlay dinamici |

**Attenzione:** approvazione artistica dell'immagine e corrispondenza al file usato nel codice sono verifiche diverse. Nessuna variante è «master tecnico» solo perché denominata `approved` o `final`. Il confronto visivo tra allegati e asset effettivi è ancora necessario.

## 3. Colori — CLR-01 (APPROVATO NEL PRINCIPIO)

### Identità globale

- **Avorio caldo** come fondo permanente delle pagine.
- **Bordeaux** per il carattere identitario e per i titoli principali.
- **Seppia/marrone** per testi e contenuti.
- **Rame/oro antico** per filetti e dettagli non invadenti.
- Texture cartacea delicata, senza fondi cupi o campiture uniformi aggressive.

Nel CSS globale esaminato in precedenza risultavano: carta `#F4EDDF`, carta chiara `#FBF4E7`, bordeaux `#6F2638`, seppia `#4B3024`, seppia morbido `#6F5745`. **Sono valori tecnici provvisori:** devono essere verificati rispetto alle immagini master e al codice corrente prima del congelamento dei token.

### Accento per sezione

L'accento è sempre secondario rispetto all'avorio e al bordeaux: piccole velature, stato attivo, dettagli botanici, separatori o indicatori. Non ridipingere un'intera sezione di rosa, azzurro o verde.

| Sezione | Direzione cromatica | Stato |
|---|---|---|
| Studenti | **Verde salvia delicato** | **Approvato** |
| Lezioni | Pesca / terracotta chiara | Proposta, da approvare |
| Materie | Lavanda polverosa | Proposta, da approvare |
| Calendario | Azzurro polvere | Proposta, da approvare |
| Tariffe / Pagamenti | Ocra dorata delicata | Proposta, da approvare |

I fiori rosa già presenti nelle immagini approvate **non vanno cancellati**: il colore di sezione non limita i colori naturali delle illustrazioni. Eventuali accenti distinti per Matematica, Fisica e Chimica richiedono una scelta successiva.

## 4. Tipografia — TYPE-01

- **Titoli principali:** calligrafia elegante, prevalentemente bordeaux.
- **Intestazioni e nomi:** serif classico o corsivo sobrio, con gerarchia chiara.
- **Testi e campi operativi:** carattere ad alta leggibilità, prevalentemente seppia.
- Non usare caratteri calligrafici ornamentali per lunghi testi, date, prezzi, etichette tecniche o campi da compilare.
- Verificare il font realmente disponibile su Android; le famiglie CSS attuali sono da controllare rispetto ai master, non da sostituire arbitrariamente.

## 5. Pulsanti e campi — UI-01 (APPROVATA)

- **La maggioranza dei pulsanti delle pagine interne è testuale**, implementata come elemento HTML interattivo in un'area *visivamente trasparente* sopra lo sfondo grafico.
- Se nell'illustrazione esiste un cartiglio, **non sovrapporre un secondo pulsante disegnato**. Posizionare il testo e l'area interattiva in modo preciso.
- Dove non esiste un cartiglio, usare testo con un filetto delicato o uno sfondo avorio appena percettibile se serve per il contrasto.
- I pulsanti principali (per esempio SALVA) devono restare immediatamente riconoscibili; non sacrificare il feedback e l'accessibilità alla trasparenza.
- Campi di inserimento preferibilmente chiari e minimali, con eventuale leggero velo avorio per leggibilità; ogni campo può crescere e la pagina deve scorrere.
- Mantenere aree cliccabili adatte al tocco e stati focus/attivo accessibili anche con tastiera. Non ingrandire o spostare geometricamente i pulsanti all'hover.
- Evitare illustrazioni aggiuntive dentro schede e moduli: lo spazio principale appartiene ai dati.

## 6. Navigazione — NAV-01 / NAV-02 (APPROVATE)

### Globale

- **OGGI** sempre in alto a sinistra, collegato a `/oggi`.
- **MENU** sempre in alto a destra, accesso alle sezioni principali.
- La posizione e il comportamento di questi due comandi restano coerenti nei quattro tipi di pagina; possono essere graficamente inseriti nei cartigli dello sfondo.

### Interna alla sezione

- **Nessun pulsante INDIETRO dedicato** è previsto nell'interfaccia.
- La barra inferiore presenta **esclusivamente le sottopagine della sezione corrente**; le icone e le etichette possono cambiare per sezione, lo stile e il posizionamento devono restare coerenti.
- Nella sezione Studenti, le destinazioni previste sono: elenco, nuovo studente, diario, archivio.
- Evidenziare la sottopagina corrente senza creare un secondo apparato decorativo.

### Contestuale e funzionale

- Nomi, schede, lezioni, appuntamenti, riferimenti di pagamento e altri elementi dinamici possono collegare tra loro sezioni differenti quando il contesto lo richiede.
- Nel Calendario, le frecce per spostarsi tra mesi/settimane/giorni sono **controlli temporali**, non pulsanti INDIETRO.
- Ogni pagina deve offrire un percorso chiaro tramite OGGI, MENU, navigazione interna e collegamenti pertinenti.

**Nota sulle eccezioni:** eventuali esigenze particolari (ad esempio operazioni non salvate o modali) richiedono una soluzione contestuale esplicita, senza introdurre automaticamente un pulsante INDIETRO globale.

## 7. Sfondo illustrato e livello dinamico — LAYER-01

Tre livelli concettuali:

1. **Illustrazione:** carta, texture, piccole decorazioni, eventuali cornici e cartigli statici.
2. **Struttura:** aree per titolo, ricerca, griglie, elenco, form e navigazione; realizzate con immagine, CSS o combinazione coerente.
3. **Dati e interazioni:** nomi, contatti, lezioni, date, importi, campi e comandi reali in HTML/CSS/JavaScript.

Non incorporare nell'immagine dati destinati a cambiare. Evitare duplicazioni tra scritte stampate nel PNG e testi HTML. Gli hotspot devono coincidere geometricamente con il disegno.

## 8. Layout, scroll e mobile — MOB-01

- **Mobile first**, verifica iniziale a `390×844` e `430×764` px, con larghezza massima indicativa di `430px` per il contenuto del Registro.
- Pagina operativa: atmosfera di diario, grande area centrale utile, testo e campi leggibili, scroll verticale naturale; non mostrare scrollbar se non necessarie ma preservare lo scorrimento.
- Barra inferiore sempre accessibile quando il layout della pagina lo prevede; gestire safe area e tastiera mobile.
- Nessuno scroll orizzontale, nessun ritaglio di dati o controlli. Nessuna deformazione degli sfondi per adattarli agli schermi.
- Le copertine possono usare composizioni più decorative e un comportamento di scroll differente, purché OGGI e MENU siano accessibili.

## 9. Componenti condivisi — ARCH-01

Definire, dopo inventario del codice, elementi riusabili per:

- pulsanti testuali e hotspot;
- intestazione OGGI / titolo / MENU;
- navigazione inferiore per sezione;
- campi, etichette, tab, elenchi e indicatori;
- cornici leggere e superfici avorio;
- layout `Cover`, `List`, `Detail`, `Calendar`.

Centralizzare token cromatici, font, spaziature, larghezze e stati. Non creare un secondo componente equivalente senza documentarne la necessità.

## 10. Procedura vincolante per ogni agente — QA-01

1. Identificare il master visivo e la route coinvolta.
2. Verificare sfondo effettivamente usato, varianti e vincoli approvati.
3. Distinguere elementi illustrati da dati dinamici e azioni.
4. Riutilizzare token e componenti comuni, senza reinterpretare lo stile.
5. Modificare soltanto il perimetro autorizzato; non cambiare gli altri mockup.
6. Confrontare il rendering a `390×844` e `430×764` contro il master, inclusi header, footer, scorrimento, contrasto e interazioni.
7. Distinguere chiaramente **approvazione estetica**, **presenza nel codice** e **funzionamento verificato**.
8. Richiedere approvazione prima di estendere un cambiamento ad altre sezioni.

## 11. Stato e prossimi passi

**Approvati oggi come specifiche progettuali:** quattro master artistici, differenza copertine/diario interno, avorio costante e bordeaux identitario, verde salvia per Studenti, pulsanti prevalentemente testuali/trasparenti nelle pagine operative, OGGI a sinistra, MENU a destra, nessun INDIETRO, barre inferiori solo interne alla sezione e collegamenti contestuali trasversali.

**Da verificare o approvare:** percorso e confronto visuale degli asset master, token esatti, font esatto, colori delle altre sezioni, geometrie standard, componenti reali e QA mobile. Nessun file del repository deve essere modificato solo per il fatto che questo manuale è stato aggiornato.

**Sequenza:** inventario tecnico completo → validazione master/asset → token e componenti condivisi → **pilota Studenti** (copertina, elenco, scheda) → estensione controllata alle altre sezioni.