# Accesso riservato — prototipo isolato

Base: ramo `prototipo-accesso-20261030`, commit ufficiale `792d6b1`.
Il sito ufficiale resta Private e non va modificato o distribuito da questa copia.

## Implementazione

- `@netlify/identity` gestisce login Google, email/password, inviti, callback, logout e rinnovo della sessione.
- La funzione Edge `registro-access`, associata a `/*`, verifica l'utente sul server tramite `hydrateSession()` e `getUser()`. Solo l'ID configurato in `REGISTRO_OWNER_ID` può proseguire. Il valore deve essere l'ID Identity dell'unico account invitato, non l'email e non un valore inviato dal browser.
- Mancanza di configurazione: 503; account diverso: 403; nessuna sessione: reindirizzamento ad `/accesso` oppure 401 per API e richieste di modifica.
- `/api/auth/session` dà esito positivo solo attraverso il controllo Edge. Il corrispondente handler Next restituisce 503 se chiamato senza il controllo Netlify.
- La pagina iniziale, il manifest, le icone, i font e i bundle statici sono pubblici. Le rotte operative sono protette anche se il loro indirizzo termina in `.png` o `.js`.
- Le risposte operative hanno `Cache-Control: private, no-store` e `Netlify-CDN-Cache-Control: no-store`. Il ripristino di una pagina dalla cache di navigazione provoca una nuova richiesta.
- Non è presente un service worker e non si promette accesso offline. Il logout non cancella gli archivi locali e non li cifra.
- Nessuna modifica a studenti, calendario, pagamenti, fotografie, chiavi degli archivi o formato `.frbackup`.

## Configurazione dell'anteprima (da eseguire con accesso Netlify)

1. Creare un progetto Netlify separato, con origine distinta dal Registro e dalla harness diagnostica. Non collegare la cartella `.netlify` del progetto ufficiale e non usare un deploy di produzione del progetto ufficiale.
2. Distribuire questa copia con `netlify.toml`, Node 22 e supporto Next.js. Verificare che la funzione Edge `registro-access` sia effettivamente presente e associata a `/*`. Il solo `next start` non esegue la protezione Edge: non esporlo su Internet e non usarlo per valutare l'autenticazione.
3. Abilitare Identity nel solo progetto di prova. Impostare registrazione **Invite only**, abilitare Google e invitare un solo account di prova autorizzato. L'invio dell'invito deve essere esplicitamente concordato con il titolare; non invitare Francesca durante il suo lavoro.
4. Copiare l'ID dell'utente Identity nella variabile server `REGISTRO_OWNER_ID`, disponibile alle Edge Functions. Se l'ID manca, le sezioni operative restano chiuse.
5. Impostare Site URL e callback sulla sola origine dell'anteprima, mai sul Registro ufficiale.
6. Rendere pubblicamente raggiungibile soltanto il nuovo progetto, per le risorse PWA; il controllo applicativo deve essere distribuito e verificato prima. Non cambiare la visibilità del Registro ufficiale.

## Collaudo necessario prima di dichiarare pronto l'accesso

Le prove automatiche della policy non sostituiscono una verifica del deployment reale.

Eseguire `scripts/check-auth-preview.mjs` con `AUTH_PREVIEW_URL` impostato sull'origine dell'anteprima. Lo script esegue soltanto letture e rifiuta gli indirizzi del Registro e della harness diagnostica. Verifica anche cookie inventati e richieste di prefetch; un semplice sito Next privo della funzione Edge non supera il controllo.

- Da profilo nuovo e senza cookie: `/`, manifest e icone restituiscono le risorse corrette; `/oggi`, `/menu`, `/benvenuto`, `/studenti`, una scheda diretta e `/calendario/nuova` non mostrano contenuti operativi.
- Ripetere con query, richieste di navigazione Next, prefetch, cookie JWT inventato, token scaduto e account diverso. Verificare anche percorsi `/.netlify/functions/` e richieste dirette alle risorse del framework.
- Login Google e tramite invito: solo l'ID autorizzato entra. Un invito invalido o scaduto non concede accesso. Non creare registrazioni aperte per facilitare il test.
- Logout: sezioni dirette bloccate, nessun contenuto operativo riutilizzato da cache, altre schede riportate all'accesso. Gli archivi fittizi restano conservati.
- Chiudere e riaprire il browser e la PWA, riavviare il telefono, verificare rinnovo e scadenza sessione; non promettere durata o permanenza del login prima di questo test.
- Installare sul telefono del collaudatore. Il telefono operativo di Francesca resta fuori dai test intermedi.
- Verificare a 390×844 e 430×764: accesso leggibile, nessuno scorrimento orizzontale, campi e pulsanti raggiungibili. Copertina, OGGI e MENU restano graficamente invariati.

## Conservazione dei dati e consegna

1. Francesca continua sullo stesso indirizzo ufficiale, browser e dispositivo; il nuovo ambiente usa solo dati fittizi.
2. Conservare backup `.frbackup` periodici fuori dal telefono e passphrase separata. Non trasferire backup reali nel prototipo.
3. Prima della consegna: esportazione aggiornata dal browser operativo e verifica del file senza ripristino. Non cancellare dati del sito, disinstallare o cambiare origine per tentativi.
4. Provare il ripristino con dati fittizi completi, comprese foto IndexedDB, movimenti di pagamento, lezioni ricorrenti, note, impostazioni e bozze. Confrontare ID e collegamenti prima/dopo, non soltanto i conteggi.
5. Preferire aggiornamento sullo stesso indirizzo e origine, conservando i nomi degli archivi. Un login nuovo non è una migrazione e non sincronizza dispositivi.
6. Un eventuale cambio origine richiede esportazione e importazione esplicite. Il file di sicurezza originale resta intatto; non sovrascriverlo con il backup di un archivio vuoto.
7. Un solo passaggio finale concordato; controllare i dati prima di riprendere gli inserimenti. In caso di problemi tornare al deployment precedente sullo stesso indirizzo e conservare il backup. Il rollback del codice non ricrea eventuali archivi cancellati.

## File interessati

- `package.json`, `package-lock.json`: librerie Identity/Edge e aggiornamento del motore per le segnalazioni di sicurezza.
- `netlify.toml`: compilazione e associazione del controllo Edge a tutti i percorsi.
- `netlify/auth-policy.ts`: politica di accesso e risposte senza cache.
- `netlify/edge-functions/registro-access.ts`: verifica reale attraverso il runtime Netlify.
- `app/accesso/page.tsx`: accesso, accettazione inviti, recupero e uscita; riutilizza il CSS esistente delle impostazioni.
- `app/api/auth/session/route.ts`: risposta negativa quando la protezione Netlify non è attiva.
- `app/components/IdentityCallback.tsx`, `app/page.tsx`: gestione del rientro OAuth/invito senza modificare la copertina.
- `app/components/IdentitySession.tsx`, `app/layout.tsx`: ripresa sessione, uscita fra schede e cache di navigazione.
- `tsconfig.json`: import TypeScript espliciti usati dalla funzione Edge.
- `tests/auth-policy.test.mjs`: test della protezione, inclusi indirizzi diretti e casi di errore.
- Questo documento: configurazione, limiti, collaudo e conservazione dati.

Fonti: [Identity nelle funzioni](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/use-identity-in-functions/), [inviti e Google](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/registration-login/).

## Stato dei controlli locali — 31 ottobre 2026

- Suite completa: 226 casi, 225 superati, nessun fallimento, uno saltato.
- ESLint e TypeScript: superati.
- Build di produzione: superata con Next 16.4.3 e `npm run build -- --webpack`.
- `npm audit --omit=dev`: zero vulnerabilità note nelle dipendenze di produzione al momento del controllo.
- Schermata di accesso osservata nel browser a 390×844; campi disposti successivamente su un'unica colonna per aumentarne la leggibilità. Verifica visiva finale a entrambe le dimensioni: ancora da completare.
- Verifica online del controllo Edge, login Google, invito, logout e installazione Android: NON ANCORA ESEGUITA. Nessuna prova locale viene presentata come collaudo del runtime Netlify.
- Nessuna modifica al sito ufficiale o ai dati operativi. Pubblicazione autorizzata esclusivamente per il ramo separato del prototipo.

### Primo collaudo online

Origine separata: `https://registro-francesca-prova-accesso.netlify.app/`.
Il controllo `check-auth-preview.mjs` ha superato copertina, manifest, icone e 34 richieste anonime, incluse richieste con cookie inventato e prefetch.
Le impostazioni pubbliche Identity confermano Google abilitato, registrazione libera disabilitata e conferma email richiesta; `/api/auth/session` senza sessione risponde 401.
L'accettazione del primo invito ha mostrato un errore generico nel browser del collaudatore: causa non ancora determinata. Il feedback viene distinto per fase e stato HTTP senza esporre messaggi del servizio, token, email o password. Un invito accettato viene rimosso dallo stato del modulo prima della verifica successiva per impedirne la ripetizione involontaria. Login reale e logout restano da completare.

Il collaudatore ha successivamente completato l'accesso Google ed è arrivato a `/benvenuto`; chiudere e riaprire la scheda non ha richiesto un nuovo login. Questo verifica soltanto la riapertura immediata su quel browser, non la durata della sessione o Android. Per rendere raggiungibile l'uscita senza reindirizzamento automatico usare `/accesso?azione=esci`: la pagina resta aperta e richiede il clic esplicito su “Esci dall’account”. La query non esegue il logout da sola. Collaudo logout ancora da completare.
