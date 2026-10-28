# Backup del Registro: formato 1

Il file `.frbackup` è JSON UTF-8 cifrato, creato e letto interamente nel browser. Non contiene la password e non viene inviato a un server.

## Cifratura

L'oggetto esterno contiene `header` e `ciphertext`. L'header dichiara `registro-francesca-encrypted-backup`, versione `1`, PBKDF2 con SHA-256 e 310.000 iterazioni, salt casuale di 16 byte, AES-GCM con chiave di 256 bit e nonce casuale di 12 byte. Il digest SHA-256 del testo in chiaro è incluso nell'header. L'intero header, serializzato come JSON, è usato come dato autenticato aggiuntivo di AES-GCM. Salt, nonce, digest e testo cifrato sono codificati in base64. La decifratura controlla il tag AES-GCM e poi il digest prima di interpretare gli archivi. Una password persa non può essere recuperata dall'app.

## Contenuto decifrato

L'oggetto contiene `format: "registro-francesca-browser-archives"`, `version: 1`, `createdAt` in UTC, `appVersion` e `archives`. In `archives`, `local` e `session` contengono coppie chiave/valore grezze delle chiavi applicative riconosciute. `unknownLocal` e `unknownSession` conservano altre chiavi con prefisso `semprini:` senza interpretarle. `legacyPhotos` contiene gli eventuali record del vecchio database IndexedDB `semprini:student-photos`, con i byte dei Blob in base64. Le due copie Web Storage rimangono distinte nel file. I pagamenti sono parte delle lezioni, i programmi includono i marcatori di eliminazione e le note delle materie hanno chiavi dinamiche.

Il formato non dipende da `localStorage` per descrivere studenti, lezioni, tariffe o programmi: un futuro importatore può leggere i valori dal file e trasferirli a un database condiviso conservando ID, `updatedAt`, movimenti dei pagamenti e marcatori di eliminazione. Le chiavi sconosciute restano disponibili nel file, ma il ripristino corrente non le scrive automaticamente.

## Ripristino e recupero

Il file viene decifrato, verificato e riepilogato senza scrivere dati. Gli archivi riconosciuti vengono validati; una versione sconosciuta o un archivio operativo non leggibile blocca il ripristino. L'utente deve prima scaricare una copia cifrata dello stato corrente, confermare di averla conservata e confermare la sostituzione. Se gli archivi correnti cambiano dopo quella copia, serve una nuova copia di sicurezza.

Le copie operative temporanee vengono risolte secondo la precedenza applicativa e rese persistenti sul dispositivo di destinazione; le copie grezze restano intatte nel file. Le fotografie legacy vengono aggiunte solo se non esistono già e non vengono mai cancellate. Per Web Storage, il ripristino scrive e rilegge i nuovi valori prima di rimuovere le vecchie chiavi riconosciute assenti dal file. Se una scrittura fallisce, tenta di ripristinare e verificare lo stato precedente. Web Storage e IndexedDB non offrono una transazione atomica comune: in caso di spazio insufficiente anche il recupero può fallire. In tal caso il file di sicurezza è la fonte per il recupero manuale. Eventuali Blob legacy aggiunti prima di un errore restano conservati e possono risultare non collegati a uno studente.

Il browser deve offrire Web Crypto e `indexedDB.databases()`. In pratica è necessario HTTPS o localhost; un indirizzo LAN HTTP su Android può non offrire la cifratura. File e password vanno conservati separatamente in luoghi privati: il backup può contenere dati personali di minori e famiglie.
