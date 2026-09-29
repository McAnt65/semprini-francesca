# Oggi — riferimento e criteri di implementazione

Riferimento visivo confermato da Mauro il 29 settembre: [oggi-riferimento-approvato.webp](./oggi-riferimento-approvato.webp). La grafia di «Oggi», «Le lezioni di oggi» e «Domani» e i cinque simboli illustrati sono parte della scelta.
I nomi, gli orari e gli indirizzi nell'immagine sono esempi. La pagina di produzione usa solo dati del registro.

## Struttura

- Dopo «Entra nel registro» si apre `/oggi`; il Menù resta raggiungibile in alto.
- Titolo «Oggi» calligrafico, data e comandi in una testata fissa. I tre titoli decorativi sono risorse trasparenti separate; data, contenuti e comandi restano HTML dinamico e accessibile.
- Sotto la testata scorre **un unico foglio**: lezioni di oggi, poi «Domani» e le sue lezioni. «Domani» non è ancorato allo schermo e si sposta verso il basso se oggi ci sono più voci.
- I cinque collegamenti principali — Studenti, Lezioni, Tariffe e pagamenti, Materie, Calendario — sono disegnati sul foglio dopo «Domani», senza barra con fondo o bordi separata. I simboli ad acquerello sono risorse separate dai testi e dai dati.
- Sfondo decorativo pulito: `app/assets/today-diary-watercolor.webp`. Non inserire dati dimostrativi nello sfondo.

## Dati di una lezione

| Elemento | Fonte e comportamento |
| --- | --- |
| Ora, durata, materia, stato | Occorrenza del calendario, incluse serie ricorrenti ed eccezioni; escluse le annullate. |
| Nome | Nome corrente dello studente, con ripiego sul nome salvato nell'appuntamento; apre il profilo. |
| Telefono | Dati dello studente; se assente, non mostrare un numero fittizio. Tocco per chiamare. |
| Argomento | Campo `topic` della lezione; se vuoto, omettere il dettaglio. |
| Domicilio e Maps | Solo quando la modalità è «A domicilio» e l'indirizzo è disponibile nel profilo. |
| Tempo di spostamento | Campo facoltativo `travelMinutes`, inseribile nella modifica della lezione; non calcolarlo automaticamente. |

«Domani» mostra ora, studente, materia ed eventuale argomento da preparare. La data e la selezione degli appuntamenti seguono il giorno locale del dispositivo; aggiornare la pagina quando l'app torna in primo piano.

## Stato e lavoro visivo restante

La route `app/oggi/page.tsx`, la navigazione da copertina, i dati del calendario, il foglio scorrevole e il tempo di spostamento facoltativo sono già nel codice. Le lezioni sono righe del diario; i titoli decorativi e le cinque icone ad acquerello sono risorse separate e i collegamenti sono integrati nel foglio. L'anteprima non è una cattura dell'app: restano da confrontare su telefono dimensioni, interlinea, separatori e posizionamento dei collegamenti.

## Verifica prima della chiusura

1. Nessuna lezione, una lezione, molte lezioni: la testata resta visibile; «Domani» e le cinque icone seguono il contenuto di oggi nello stesso foglio scorrevole.
2. Lezione a domicilio con e senza indirizzo o durata spostamento; telefono presente e assente.
3. Occorrenza ricorrente modificata, lezione svolta e annullata, passaggio di giorno a mezzanotte o riapertura dell'app.
4. Su telefono: testo leggibile senza sovrapposizioni, titolo coerente con le altre pagine, icone e aree di tocco sufficienti, scroll confinato al foglio.
