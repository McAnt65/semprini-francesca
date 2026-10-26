# Statistiche: chilometri e spese di trasferta (proposta futura)

La fase 2H mostra solo dati già registrati: modalità della lezione, numero delle lezioni a domicilio e `travelMinutes` quando presente. Quel campo è indicativo e non misura chilometri o tempo effettivo. Gli indirizzi degli studenti e le tratte costruite da LEZIONI servono ad aprire il percorso, ma non sono uno storico dei viaggi compiuti.

Per una fase successiva, registrare **segmenti di viaggio effettivi**, distinti dalle lezioni e dai percorsi suggeriti. Ogni segmento dovrebbe avere un ID stabile, data, origine, destinazione, tipo (`andata`, `tra_studenti`, `ritorno`), chilometri effettivi inseriti dall'utente e, facoltativamente, un costo indicativo per chilometro salvato come valore del momento. Un segmento fra due studenti deve esistere una sola volta, con collegamenti facoltativi alle due occorrenze; non va sommato a entrambe. I segmenti di andata e ritorno sono separati solo se realmente effettuati e registrati.

La spesa stimata di un segmento sarebbe `chilometri × costo/km`, arrotondata ai centesimi. Le statistiche sommerebbero solo segmenti distinti per ID e data. Se mancano chilometri o costo, il risultato deve restare «Non ancora registrato», non diventare zero. Non si devono derivare chilometri da minuti, indirizzi o link alle mappe.

Prima di aggiungere persistenza servono decisioni di Francesca: se registrare ogni tratta o un totale giornaliero, come gestire viaggi personali condivisi, se il costo/km è fisso o varia nel tempo e come correggere una tratta dopo il salvataggio. La fase 2H non crea nuovi campi o archivi.
