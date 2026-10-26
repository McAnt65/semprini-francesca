# Inventario delle immagini usate dall'app — Fase BENVENUTO

Verifica del 26 ottobre 2026. Sono stati cercati i riferimenti a PNG, JPG e WebP nel codice di `app`, poi controllate le copie in `public` e le corrispondenze SHA-256 con i file del progetto esterni a `public` (esclusi `node_modules` e `.next`). Una corrispondenza indica file identici, non soltanto nomi simili.

Per ogni percorso `/nome` nella tabella, l'app usa `/nome` e la copia **presente** è `public/nome`. Nessuna delle immagini elencate manca in `public`. Non risultano duplicati identici fra queste copertine e questi sfondi in `public`. “Non rintracciato” indica che non esiste nel progetto una seconda copia identica fuori da `public`; il file pubblico funziona e non è stato sostituito.

| Percorso usato dall'app | Originale o copia identica verificata fuori da `public` |
| --- | --- |
| `/CoverBenvenuto.png` | `CopertineAppDef/CoverBenvenuto.png` |
| `/CoverCalendario.png` | `CopertineAppDef/CopertineSezioni/CoverCalendario.png` |
| `/CoverLezioni.png` | `CopertineAppDef/CopertineSezioni/CoverLezioni.png` |
| `/CoverMaterie.png` | `CopertineAppDef/CopertineSezioni/CoverMaterie.png` |
| `/CoverPagamenti.png` | `CopertineAppDef/CopertineSezioni/CoverPagamenti.png` |
| `/Homepage.png` | `COPERTINE/Homepage.png` |
| `/images/copertine/menu.png` | `CopertineAppDef/CopertineSezioni/CoverMenu.png` |
| `/images/copertine/oggi.png` | `CopertineAppDef/CopertineSezioni/CoverOggi.png` |
| `/images/copertine/studenti.png` | `CopertineAppDef/CopertineSezioni/CoverStudenti.png` |
| `/SfondoArchivioStudenti.png` | `CopertineAppDef/SfondiPagineInterne/SfondoArchivioStudenti.png` |
| `/SfondoArgomentiMaterie.png` | `CopertineAppDef/SfondiPagineInterne/SfondoArgomentiMaterie.png` |
| `/SfondoCardStudente.png` | `CopertineAppDef/SfondiPagineInterne/SfondoCardStudenti.png` |
| `/SfondoChimica.png` | `CopertineAppDef/SfondiPagineInterne/SfondoChimica.png` |
| `/SfondoDiarioLezioniLezioni.png` | `CopertineAppDef/SfondiPagineInterne/SfondoDiarioLezioniLezioni.png` |
| `/SfondoDiarioStudenti.png` | `CopertineAppDef/SfondiPagineInterne/SfondoDiarioStudenti.png` |
| `/SfondoFisica.png` | `CopertineAppDef/SfondiPagineInterne/SfondoFisica.png` |
| `/SfondoGiornoCalendario.png` | `CopertineAppDef/SfondiPagineInterne/SfondoGiornoCalendario.png` |
| `/SfondoInProgrammaLezioni.png` | `CopertineAppDef/SfondiPagineInterne/SfondoInProgrammaLezioni.png` |
| `/SfondoLeMieMaterieMaterie.png` | `CopertineAppDef/SfondiPagineInterne/SfondoLeMieMaterieMaterie.png` |
| `/SfondoMatematica.png` | `CopertineAppDef/SfondiPagineInterne/SfondoMatematica.png` |
| `/SfondoMeseCalendario.png` | `CopertineAppDef/SfondiPagineInterne/SfondoMeseCalendario.png` |
| `/SfondoMieiStudenti.png` | `CopertineAppDef/SfondiPagineInterne/SfondoMieiStudenti.png` |
| `/SfondoNuovaLezioneLezioni.png` | `CopertineAppDef/SfondiPagineInterne/SfondoNuovaLezioneLezioni.png` |
| `/SfondoNuovoStudente.png` | `CopertineAppDef/SfondiPagineInterne/Sfondo NuovoStudente.png` |
| `/SfondoPrevisioniPagamenti.png` | `CopertineAppDef/SfondiPagineInterne/SfondoPrevisioniPagamenti.png` |
| `/SfondoProgrammiMaterie.png` | `CopertineAppDef/SfondiPagineInterne/SfondoProgrammiMaterie.png` |
| `/SfondoRiepilogoPagamenti.png` | `CopertineAppDef/SfondiPagineInterne/SfondoRiepilogoPagamenti.png` |
| `/SfondoSettimanaCalendario.png` | `CopertineAppDef/SfondiPagineInterne/SfondoSettimanaCalendario.png` |
| `/SfondoStandard.png` | `CopertineAppDef/SfondiPagineInterne/SfondoStandard.png` |
| `/SfondoStatistichePagamenti.png` | `CopertineAppDef/SfondiPagineInterne/SfondoStatistichePagamenti.png` |
| `/SfondoStoricoLezioniLezioni.png` | `CopertineAppDef/SfondiPagineInterne/SfondoStoricoLezioniLezioni.png` |
| `/SfondoStudentiPerMateriaMaterie.png` | `CopertineAppDef/SfondiPagineInterne/SfondoStudentiPerMateriaMaterie.png` |
| `/SfondoTariffarioPagamenti.png` | `CopertineAppDef/SfondiPagineInterne/SfondoTariffarioPagamenti.png` |
| `/calendar-day-watercolor-approved.png` | Non rintracciato |
| `/calendar-month-watercolor-approved.png` | Non rintracciato |
| `/calendar-week-watercolor-approved.png` | Non rintracciato |
| `/lessons-diary-clean.png` | Non rintracciato |
| `/lessons-upcoming-clean.png` | Non rintracciato |
| `/materia-chimica-watercolor.png` | Non rintracciato |
| `/materia-fisica-watercolor.png` | Non rintracciato |
| `/materia-matematica-watercolor.png` | Non rintracciato |
| `/payments-due-clean.png` | Non rintracciato |
| `/payments-month-clean.png` | Non rintracciato |
| `/payments-paid-clean.png` | Non rintracciato |
| `/payments-students-clean.png` | Non rintracciato |
| `/student-diary-bg.png` | Non rintracciato |
| `/student-diary-new-lesson-bg.png` | Non rintracciato |
| `/student-profile-interior-master.png` | Non rintracciato |

Altre quattro immagini vengono importate direttamente dal codice e non richiedono una copia in `public`: `app/assets/today-diary-watercolor.webp`, `app/assets/student-card-watercolor.webp`, `app/assets/student-journey-watercolor.webp` e `design-approved-phase3/09-studenti-nuovo-final.png`. I rispettivi file sorgente sono presenti.

Le tre icone PNG richiamate da `app/manifest.ts` sono presenti in `public`; `registro-512.png` e `registro-maskable-512.png` sono duplicati identici. Nessuna icona o file del manifest è stato modificato.

La sola copia aggiunta in questa fase è `public/CoverBenvenuto.png`, identica a `CopertineAppDef/CoverBenvenuto.png` (SHA-256 `D244ADD004885CD3976F9FD1189DCBB056100DFF9733BDE6EE2AB1E2C0DAED94`).
