# Oggi — riferimento e criteri di implementazione

Riferimento visivo scelto da Mauro: [oggi-riferimento-approvato.webp](./oggi-riferimento-approvato.webp).
I nomi, gli orari e gli indirizzi nell'immagine sono esempi. La pagina di produzione usa solo dati del registro.

## Struttura

- Dopo «Entra nel registro» si apre `/oggi`; il Menù resta raggiungibile in alto.
- Titolo «Oggi» calligrafico, data e comandi in una testata fissa. Conservare la grafia della prima anteprima, con lo stesso equilibrio della famiglia di pagine dell'app.
- Sotto la testata scorre **un unico foglio**: lezioni di oggi, poi «Domani» e le sue lezioni. «Domani» non è ancorato allo schermo e si sposta verso il basso se oggi ci sono più voci.
- In basso restano accessibili le cinque sezioni principali: Studenti, Lezioni, Tariffe e pagamenti, Materie, Calendario. I simboli ad acquerello della tavola sono riferimento grafico: realizzarli come elementi separati dai testi e dai dati.
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

La route `app/oggi/page.tsx`, la navigazione da copertina, i dati del calendario, il foglio scorrevole e il tempo di spostamento facoltativo sono già nel codice. L'anteprima non è una cattura dell'app: la pagina attuale usa ancora voci con bordo e riquadri e pulsanti di navigazione testuali. Per raggiungere il riferimento bisogna rifinire tipografia, interlinea, separatori manoscritti, illustrazioni delle cinque icone e resa dei collegamenti su telefono.

## Verifica prima della chiusura

1. Nessuna lezione, una lezione, molte lezioni: la testata e la navigazione restano visibili; «Domani» segue il contenuto di oggi.
2. Lezione a domicilio con e senza indirizzo o durata spostamento; telefono presente e assente.
3. Occorrenza ricorrente modificata, lezione svolta e annullata, passaggio di giorno a mezzanotte o riapertura dell'app.
4. Su telefono: testo leggibile senza sovrapposizioni, titolo coerente con le altre pagine, icone e aree di tocco sufficienti, scroll confinato al foglio.
