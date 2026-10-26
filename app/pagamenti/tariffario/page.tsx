"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createTariff, isTariffCodeAvailable, loadTariffs, nextTariffCode, saveTariffsResult, updateTariff } from "../../data/tariffario/tariff-storage";
import { deleteTariffResult, inspectTariffUsage, type TariffUsage } from "../../data/tariffario/tariff-deletion";
import type { LessonFormat, Tariff, TariffDraft } from "../../data/tariffario/tariff-types";
import type { LessonMode } from "../../data/calendario/calendar-types";
import { TEMPORARY_SAVE_WARNING } from "../../data/save-result";
import shared from "../payment-interior.module.css";
import { useDialogFocus } from "../use-dialog-focus";
import styles from "./tariffario.module.css";

const euro = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
const modes: Record<LessonMode, string> = { casa: "Casa / studio", domicilio: "A domicilio", online: "Online" };
const formats: Record<LessonFormat, string> = { singola: "Singola", gruppo: "Gruppo" };

function parseHourlyRate(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export default function TariffarioPage() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<TariffDraft | null>(null);
  const [rateText, setRateText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState<Tariff | null>(null);
  const [usage, setUsage] = useState<TariffUsage | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dialogRef = useDialogFocus(confirming || deleting !== null, () => { setConfirming(false); setDeleting(null); });
  const deletingRef = useRef(false);
  const workspaceRef = useRef<HTMLElement>(null);
  const listScroll = useRef(0);
  const draftOpen = draft !== null;

  useEffect(() => {
    queueMicrotask(() => { setTariffs(loadTariffs()); setLoaded(true); });
  }, []);
  useLayoutEffect(() => {
    if (workspaceRef.current) workspaceRef.current.scrollTop = draftOpen ? 0 : listScroll.current;
  }, [draftOpen]);

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("it-IT");
    return term ? tariffs.filter((item) =>
      [item.code, item.subject, item.schoolBand, modes[item.mode], formats[item.format]]
        .some((value) => value.toLocaleLowerCase("it-IT").includes(term))) : tariffs;
  }, [query, tariffs]);

  function open(item?: Tariff) {
    listScroll.current = workspaceRef.current?.scrollTop ?? 0;
    setEditingId(item?.id ?? null);
    setDraft(item ? {
      code: item.code, subject: item.subject, schoolBand: item.schoolBand,
      mode: item.mode, format: item.format, hourlyRateCents: item.hourlyRateCents, active: item.active,
    } : {
      code: nextTariffCode(tariffs), subject: "", schoolBand: "", mode: "casa",
      format: "singola", hourlyRateCents: 0, active: true,
    });
    setRateText(item ? (item.hourlyRateCents / 100).toFixed(2).replace(".", ",") : "");
    setError("");
    setConfirming(false);
  }

  function requestDelete(item: Tariff) {
    if (deletingRef.current) return;
    setNotice("");
    setUsage(inspectTariffUsage(item.id));
    setDeleting(item);
  }

  function confirmDelete() {
    if (!deleting || deletingRef.current) return;
    deletingRef.current = true;
    try {
      const result = deleteTariffResult(deleting.id);
      setUsage(result.usage);
      if (result.status === "blocked") {
        setNotice("Impossibile eliminare: la tariffa è ancora collegata a studenti o lezioni future, oppure un archivio non è leggibile.");
        return;
      }
      if (result.status === "failed") {
        setNotice("Eliminazione non riuscita. La tariffa resta nell'archivio.");
        return;
      }
      setDeleting(null);
      setTariffs(loadTariffs());
      setNotice(result.status === "saved" ? "Tariffa eliminata in modo persistente."
        : result.status === "temporary" ? `Tariffa eliminata temporaneamente. ${TEMPORARY_SAVE_WARNING}`
          : "La tariffa non è più presente nell'archivio.");
    } finally { deletingRef.current = false; }
  }

  function close() {
    setDraft(null);
    setConfirming(false);
    setError("");
  }

  function requestSave() {
    if (!draft) return;
    const code = draft.code.trim().toLocaleUpperCase("it-IT");
    if (!isTariffCodeAvailable(code, tariffs, editingId ?? undefined)) {
      setError("Scegli una sigla univoca di 1–12 lettere, numeri, _ o -.");
      return;
    }
    if (!draft.subject.trim() || !draft.schoolBand.trim() || parseHourlyRate(rateText) === null) {
      setError("Compila materia, fascia e importo orario positivo (massimo due decimali).");
      return;
    }
    setError("");
    setConfirming(true);
  }

  function confirmSave() {
    if (!draft) return;
    const cents = parseHourlyRate(rateText);
    if (cents === null) { setConfirming(false); setError("Controlla l'importo orario."); return; }
    const clean: TariffDraft = {
      ...draft, code: draft.code.trim().toLocaleUpperCase("it-IT"),
      subject: draft.subject.trim(), schoolBand: draft.schoolBand.trim(), hourlyRateCents: cents,
    };
    const next = editingId
      ? tariffs.map((item) => item.id === editingId ? updateTariff(item, clean) : item)
      : [...tariffs, createTariff(clean)];
    const result = saveTariffsResult(next);
    setConfirming(false);
    if (result.status === "failed") {
      setError("Salvataggio non riuscito. I dati restano nel modulo: correggi o riprova.");
      return;
    }
    setTariffs(loadTariffs());
    setQuery("");
    setNotice(result.status === "saved" ? "Tariffa salvata in modo persistente sul dispositivo."
      : `Tariffa salvata temporaneamente. ${TEMPORARY_SAVE_WARNING}`);
    close();
  }

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/SfondoTariffarioPagamenti.png" alt="" fill priority unoptimized
        sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Tariffario pagamenti</h1>
      <nav className={`${shared.navigation} ${styles.topLinks}`} aria-label="Navigazione principale">
        <Link href="/oggi">OGGI</Link>
        <Link href="/pagamenti">← PAGAMENTI</Link>
        <Link href="/menu">MENU</Link>
      </nav>

      <section ref={workspaceRef} className={styles.workspace} aria-label="Gestione tariffe">
        {notice && <p className={styles.notice} role="status">{notice}</p>}
        {draft ? <form className={styles.form} onSubmit={(event) => { event.preventDefault(); requestSave(); }}>
          <h2>{editingId ? `Modifica ${draft.code}` : "Nuova tariffa"}</h2>
          <label>Sigla
            <input required maxLength={12} autoComplete="off" value={draft.code}
              onChange={(event) => setDraft({ ...draft, code: event.target.value })} />
          </label>
          <label>Materia
            <input required value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
          </label>
          <label>Fascia scolastica
            <input required value={draft.schoolBand} onChange={(event) => setDraft({ ...draft, schoolBand: event.target.value })} />
          </label>
          <label>Modalità
            <select value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value as LessonMode })}>
              <option value="casa">Casa / studio</option>
              <option value="domicilio">A domicilio</option>
              <option value="online">Online</option>
            </select>
          </label>
          <label>Formato
            <select value={draft.format} onChange={(event) => setDraft({ ...draft, format: event.target.value as LessonFormat })}>
              <option value="singola">Singola</option>
              <option value="gruppo">Gruppo</option>
            </select>
          </label>
          <label>Importo orario (€)
            <input required type="text" inputMode="decimal" value={rateText} placeholder="0,00"
              onChange={(event) => setRateText(event.target.value)} />
          </label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.formActions}>
            <button type="button" onClick={close}>ANNULLA</button>
            <button type="submit">SALVA</button>
          </div>
        </form> : <div className={styles.list}>
          <div className={styles.listHeader}>
            <p>{loaded ? `${tariffs.length} ${tariffs.length === 1 ? "tariffa" : "tariffe"}` : "Caricamento…"}</p>
            <button type="button" onClick={() => open()}>Nuova tariffa</button>
          </div>
          {tariffs.length > 0 && <label className={styles.search}>Cerca per sigla, materia o fascia
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>}
          {!loaded ? null : tariffs.length === 0
            ? <p className={styles.empty}>Nessuna tariffa. Aggiungi la prima tariffa.</p>
            : visible.length === 0 ? <p className={styles.empty}>Nessuna tariffa trovata.</p>
              : visible.map((item) => <article key={item.id} className={styles.tariff}>
                <div className={styles.tariffHeading}>
                  <div><strong>{item.code}</strong><h2>{item.subject}</h2></div>
                  <strong className={styles.amount}>{euro(item.hourlyRateCents)}/h</strong>
                </div>
                <p>{item.schoolBand} · {modes[item.mode]} · {formats[item.format]}</p>
                <div className={styles.tariffFoot}>
                  <button type="button" onClick={() => open(item)} aria-label={`Modifica tariffa ${item.code}`}>Modifica</button>
                  <button type="button" className={styles.deleteButton} onClick={() => requestDelete(item)} aria-label={`Elimina tariffa ${item.code}`}>Elimina</button>
                </div>
              </article>)}
        </div>}
      </section>

      {confirming && draft && <div className={shared.dialogBackdrop}>
        <section ref={dialogRef} className={shared.dialog} role="dialog" aria-modal="true" aria-labelledby="confirm-tariff-title">
          <h2 id="confirm-tariff-title">Conferma tariffa</h2>
          <p>{editingId ? "Salvare le modifiche" : "Creare la tariffa"} <strong>{draft.code.trim().toLocaleUpperCase("it-IT")}</strong>?</p>
          <p>{draft.subject.trim()} · {euro(parseHourlyRate(rateText) ?? 0)}/h</p>
          <p>Le lezioni già registrate conserveranno il loro importo.</p>
          <div className={styles.formActions}>
            <button type="button" onClick={() => setConfirming(false)}>ANNULLA</button>
            <button type="button" onClick={confirmSave}>CONFERMA</button>
          </div>
        </section>
      </div>}
      {deleting && usage && <div className={shared.dialogBackdrop}>
        <section ref={dialogRef} className={shared.dialog} role="dialog" aria-modal="true" aria-labelledby="delete-tariff-title">
          <h2 id="delete-tariff-title">Elimina tariffa</h2>
          <p><strong>{deleting.code}</strong> · {deleting.subject} · {deleting.schoolBand}</p>
          <p>Importo orario: <strong>{euro(deleting.hourlyRateCents)}/h</strong></p>
          <p>Studenti collegati: {usage.students}. Lezioni registrate: {usage.historicalLessons + usage.futureLessons}.</p>
          {(usage.futureSeries > 0 || usage.futureRequests > 0) && <p>Ricorrenze future: {usage.futureSeries}. Proposte future: {usage.futureRequests}.</p>}
          {usage.unreadableArchive || usage.students || usage.futureLessons || usage.futureSeries || usage.futureRequests
            ? <p className={styles.error}>Eliminazione non disponibile: sono presenti collegamenti operativi o un archivio non è leggibile.</p>
            : <p>Le lezioni già registrate conserveranno importi, pagamenti e sigla storica.</p>}
          {notice && <p className={styles.error} role="alert">{notice}</p>}
          <div className={styles.formActions}>
            <button type="button" onClick={() => setDeleting(null)}>ANNULLA</button>
            <button type="button" disabled={Boolean(usage.unreadableArchive || usage.students || usage.futureLessons || usage.futureSeries || usage.futureRequests)} onClick={confirmDelete}>ELIMINA TARIFFA</button>
          </div>
        </section>
      </div>}
    </div>
  </main>;
}
