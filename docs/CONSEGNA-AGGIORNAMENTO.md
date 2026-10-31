# Consegna dell'aggiornamento — stato e procedura

Aggiornato al 31 ottobre 2026. Questo documento non autorizza né esegue modifiche alla produzione.

## Registro operativo e prototipo

Il Registro operativo resta su `https://il-registro-di-francesca.netlify.app/`, privato, ramo `assistenza-completa-20261026`, commit di riferimento `792d6b16b6c50dc9ed451272dcd6fe741216eefc`.
Francesca continua a lavorare sullo stesso browser, dispositivo e indirizzo. Non cancellare archivi o disinstallare per tentativi.

Il prototipo è `https://registro-francesca-prova-accesso.netlify.app/`, ramo `prototipo-accesso-20261030`. L'account del collaudatore è separato dall'account finale di Francesca. Non caricare dati o backup reali in questo progetto.

## Evidenze raccolte

- Controllo online: copertina, manifest e icone pubblici; 34 richieste anonime respinte, incluse richieste con cookie inventato e prefetch.
- Desktop, riferito dal collaudatore: accesso Google fino a Benvenuto, OGGI accessibile, riapertura immediata senza nuovo login; dopo logout, il collegamento diretto a OGGI torna all'accesso.
- Android del collaudatore, riferito dal collaudatore: installazione riuscita, accesso Google, apertura di Benvenuto e OGGI, chiusura e riapertura dall'icona senza nuovo login.
- Conservazione dati: suite esistente del backup e test aggiuntivi con `fake-indexeddb` (archivio simulato, non telefono reale). Esportazione, cifratura, decifratura e ripristino su archivio separato mantengono i byte del Blob fotografico, ID e collegamenti di studente/lezione/pagamento. Una collisione fotografica blocca la sostituzione degli archivi operativi. L'origine simulata resta intatta; reimportare la stessa foto è idempotente.
- Il backup conserva nel file anche chiavi `semprini:` sconosciute. Il ripristino attuale non le importa automaticamente: eventuali chiavi nuove della versione finale vanno inventariate prima del passaggio.

## Verifiche ancora necessarie

- Riapertura della PWA dopo diverse ore e dopo riavvio; non promettere login permanente in base alla riapertura immediata.
- Logout dalla PWA Android e blocco degli indirizzi diretti dopo l'uscita; il caso desktop è verificato tramite il collaudatore.
- Accettazione dell'invito con password: il primo tentativo ha fallito e la causa non è accertata. Google funziona; il flusso password/invito non va dichiarato collaudato o offerto come percorso principale finché non è risolto.
- Accesso negato a un secondo account autenticato nel runtime reale: la policy è testata automaticamente, ma manca il collaudo online con secondo account. Non aprire le registrazioni per facilitare questa verifica.
- Backup e ripristino attraverso l'interfaccia di un browser reale, comprese foto; i nuovi test simulati non sostituiscono questa prova.
- Conferma del formato e delle chiavi della versione da consegnare rispetto al commit operativo. Copertina, OGGI, MENU e chiavi degli archivi non devono cambiare accidentalmente.

## Preparazione senza interrompere Francesca

1. Completare le verifiche restanti sul prototipo, con dati fittizi e telefono del collaudatore.
2. Preparare una copia di rilascio derivata dal commit operativo verificato. Trasferire solo le modifiche di accesso e gli aggiornamenti di sicurezza necessari, mai l'intera cartella locale principale che contiene altro lavoro.
3. Documentare i file e i valori di configurazione da trasferire, mantenendo distinta l'identità del collaudatore da quella di Francesca. Non inserire l'ID del collaudatore nel progetto ufficiale.
4. Conservare l'indirizzo ufficiale: cambiare origine non è necessario per rendere installabile la PWA. Una PWA sul nuovo indirizzo di prova non contiene i dati del Registro operativo.
5. Preparare il deployment precedente come riferimento per il ritorno alla versione precedente. Il ritorno del codice non ricrea dati eventualmente cancellati.
6. Presentare il risultato concreto e i limiti residui prima di richiedere il via libera alla modifica del Registro ufficiale. La visibilità ufficiale non cambia durante questi preparativi.

## Un solo passaggio finale concordato

1. Alla fine di una sessione di lavoro di Francesca, interrompere brevemente i nuovi inserimenti.
2. Dal browser che contiene i dati reali, esportare un `.frbackup` aggiornato. Conservarlo anche fuori dal telefono e custodire la password separatamente. Verificare il contenuto del file dall'interfaccia senza ripristinarlo e confrontare il riepilogo con il Registro.
3. Se il backup non è leggibile o incompleto, fermare la consegna. Non cancellare o sostituire gli archivi per sbloccare il passaggio.
4. Con autorizzazione del titolare, predisporre l'account di Francesca e il controllo server sul progetto ufficiale. Verificare il blocco delle rotte senza autenticazione prima di dichiararlo pronto. Nessun dato reale viene copiato nel prototipo.
5. Aggiornare sullo stesso indirizzo senza modificare le chiavi degli archivi. La conservazione attesa sullo stesso browser non elimina la necessità del backup.
6. Accedere con Francesca, confrontare studenti, calendario, pagamenti e fotografie con il riepilogo precedente. Installare la PWA e verificare nuovamente i dati: la condivisione dello storage tra browser e modalità installata deve essere osservata sul suo telefono, non presunta.
7. Se l'app installata non mostra i dati, tornare al browser operativo senza cancellare nulla. Un eventuale ripristino deve essere esplicito, preceduto da copia dello stato di destinazione e confronto dei contenuti; non sovrascrivere un archivio aggiornato con una copia vecchia.
8. Riprendere gli inserimenti solo dopo il confronto. Se il passaggio fallisce, mantenere l'accesso alla versione precedente e il backup intatto.

## Limite della protezione

L'accesso server protegge le sezioni applicative; non cifra gli archivi già conservati nel browser. I dati locali non diventano un database remoto e non si sincronizzano automaticamente tra dispositivi. Il logout conserva gli archivi locali. Il file `.frbackup` è invece cifrato.
