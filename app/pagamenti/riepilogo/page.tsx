"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toLocalDate } from "../../data/calendario/calendar-dates";
import { correctUndatedPayment, inspectLessonPayment, readPaymentLedger, recordPartialLessonPayment,
  reverseLessonPayment, settleLessonPayment, settleStudentLessons, type PaymentOperationResult } from "../../data/calendario/calendar-payments";
import { loadCalendarAppointments, loadCalendarSeries } from "../../data/calendario/calendar-storage";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries, LocalDate, PaymentMovement } from "../../data/calendario/calendar-types";
import { TEMPORARY_SAVE_WARNING } from "../../data/save-result";
import { filterSummaryLessons, parseEuroCents, selectSummaryData, shiftSummaryMonth, type SummaryFilter } from "./summary-model";
import { calendarReadStatus } from "./calendar-read-status";
import shared from "../payment-interior.module.css";
import { useDialogFocus } from "../use-dialog-focus";
import styles from "./riepilogo.module.css";

const euro = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
const monthLabel = (date: LocalDate) => new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" })
  .format(new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, 1));
const lessonLabel = (lesson: CalendarOccurrence) =>
  `${lesson.studentNameSnapshot} · ${lesson.date.slice(8, 10)}/${lesson.date.slice(5, 7)} · ${lesson.subject}`;
const targetOf = (lesson: CalendarOccurrence) => ({ occurrenceId: lesson.occurrenceId, date: lesson.date });
const filters: Array<{ id: SummaryFilter; label: string }> = [
  { id: "tutti", label: "Tutti" }, { id: "dovuti", label: "Dovuti" },
  { id: "saldati", label: "Saldati" }, { id: "studente", label: "Per studente" },
];

type Pending =
  | { kind: "settle" | "partial" | "reverse" | "legacy"; lesson: CalendarOccurrence;
      amountCents: number; paymentDate?: LocalDate; movementId?: string; operationId: string }
  | { kind: "group"; lessons: CalendarOccurrence[]; studentId: string; amountCents: number;
      paymentDate: LocalDate; operationId: string };

function resultMessage(result: PaymentOperationResult): string {
  if (result.status === "saved") return "Pagamento registrato e verificato.";
  if (result.status === "temporary") return `Pagamento disponibile solo in questa sessione. ${TEMPORARY_SAVE_WARNING}`;
  if (result.status === "failed") return "Salvataggio non riuscito. Puoi riprovare senza creare un doppio pagamento.";
  if (result.status === "unchanged") return "Operazione già registrata: nessun nuovo versamento.";
  const reasons: Record<string, string> = {
    stale_target: "La lezione è cambiata. Ricarica i dati e riprova.",
    stale_or_other_student: "Le lezioni selezionate sono cambiate o appartengono a studenti diversi.",
    already_settled: "La lezione risulta già saldata.",
    not_payable: "Questa lezione non può essere saldata.",
    exceeds_outstanding: "L'importo supera il residuo.",
    allocation_required: "L'importo non coincide con i residui. Per un versamento inferiore occorre assegnare gli importi alle singole lezioni.",
    invalid_ledger: "Lo storico dei pagamenti richiede una verifica prima di registrare altri movimenti.",
    inconsistent_payment: "Lo stato economico della lezione richiede una verifica.",
    payment_not_found: "Il versamento da correggere non è più disponibile.",
    exceeds_legacy_balance: "La rettifica supera il saldo storico senza data.",
  };
  return "reason" in result ? reasons[result.reason] ?? "Operazione non eseguita. Rileggi i dati e riprova."
    : "Operazione non eseguita.";
}

export default function PaymentSummaryPage() {
  const [today, setToday] = useState<LocalDate>("");
  const [month, setMonth] = useState<LocalDate>("");
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<SummaryFilter>("tutti");
  const [studentId, setStudentId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupDate, setGroupDate] = useState<LocalDate>("");
  const [groupAmount, setGroupAmount] = useState("");
  const [groupError, setGroupError] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const dialogRef = useDialogFocus(pending !== null, () => { if (!busy) setPending(null); });

  function refresh() {
    const sources: Array<Pick<Storage, "getItem">> = [];
    for (const name of ["localStorage", "sessionStorage"] as const) {
      try { sources.push(window[name]); } catch { /* The other source may be readable. */ }
    }
    const status = calendarReadStatus(sources);
    setLoadError(status === "unavailable" ? "Impossibile accedere ai dati del Calendario su questo dispositivo."
      : status === "invalid" ? "I dati del Calendario non sono leggibili. Verifica l'archivio prima di usare il riepilogo."
        : "");
    setAppointments(loadCalendarAppointments());
    setSeries(loadCalendarSeries());
  }
  useEffect(() => {
    queueMicrotask(() => {
      const localToday = toLocalDate(new Date());
      setToday(localToday);
      setMonth(localToday);
      setGroupDate(localToday);
      refresh();
      setLoaded(true);
    });
  }, []);

  const summary = useMemo(() => month && today
    ? selectSummaryData(appointments, series, month, today) : null, [appointments, series, month, today]);
  const visible = useMemo(() => filterSummaryLessons(summary?.completed ?? [], filter, studentId),
    [summary, filter, studentId]);
  const students = useMemo(() => {
    const names = new Map<string, string>();
    for (const lesson of summary?.completed ?? []) names.set(lesson.studentId, lesson.studentNameSnapshot);
    return [...names].sort((a, b) => a[1].localeCompare(b[1], "it"));
  }, [summary]);
  const selected = (summary?.completed ?? []).filter((lesson) =>
    selectedIds.includes(lesson.occurrenceId) && inspectLessonPayment(lesson).outstandingCents > 0);
  const selectedStudent = selected[0]?.studentId;
  const selectedTotal = selected.reduce((sum, lesson) => sum + inspectLessonPayment(lesson).outstandingCents, 0);

  function changeMonth(offset: number) {
    setMonth((current) => shiftSummaryMonth(current, offset));
    setSelectedIds([]);
    setPending(null);
    setMessage("");
  }
  function toggleSelected(lesson: CalendarOccurrence) {
    setGroupError("");
    setGroupAmount("");
    setSelectedIds((current) => current.includes(lesson.occurrenceId)
      ? current.filter((id) => id !== lesson.occurrenceId)
      : selectedStudent && selectedStudent !== lesson.studentId ? current : [...current, lesson.occurrenceId]);
  }
  function proposeSingle(kind: "settle" | "partial" | "reverse" | "legacy",
    lesson: CalendarOccurrence, amountCents: number, paymentDate?: LocalDate, movementId?: string) {
    setMessage("");
    setPending({ kind, lesson, amountCents, paymentDate, movementId, operationId: crypto.randomUUID() });
  }
  function proposeGroup() {
    const entered = groupAmount.trim() ? parseEuroCents(groupAmount) : selectedTotal;
    if (selected.length < 2 || !selectedStudent || !groupDate || !entered || entered !== selectedTotal) {
      setGroupError(entered !== null && entered < selectedTotal
        ? "L'importo è inferiore al totale: assegna i versamenti alle singole lezioni. Nessuna ripartizione automatica."
        : "Seleziona almeno due lezioni dello stesso studente e verifica importo e data.");
      return;
    }
    setGroupError("");
    setMessage("");
    setPending({ kind: "group", lessons: selected, studentId: selectedStudent, amountCents: entered,
      paymentDate: groupDate, operationId: crypto.randomUUID() });
  }
  function confirmPending() {
    if (!pending || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    let result: PaymentOperationResult;
    try {
      if (pending.kind === "group") result = settleStudentLessons({
        targets: pending.lessons.map(targetOf), studentId: pending.studentId,
        receivedAmountCents: pending.amountCents, paymentDate: pending.paymentDate, operationId: pending.operationId,
      });
      else if (pending.kind === "settle") result = settleLessonPayment({
        target: targetOf(pending.lesson), paymentDate: pending.paymentDate!, operationId: pending.operationId,
      });
      else if (pending.kind === "partial") result = recordPartialLessonPayment({
        target: targetOf(pending.lesson), amountCents: pending.amountCents,
        paymentDate: pending.paymentDate!, operationId: pending.operationId,
      });
      else if (pending.kind === "reverse") result = reverseLessonPayment({
        target: targetOf(pending.lesson), movementId: pending.movementId!, operationId: pending.operationId,
      });
      else result = correctUndatedPayment({
        target: targetOf(pending.lesson), amountCents: pending.amountCents, operationId: pending.operationId,
      });
      refresh();
      setMessage(resultMessage(result));
      if (result.status === "saved" || result.status === "temporary" || result.status === "unchanged") {
        setPending(null);
        setSelectedIds([]);
        setGroupAmount("");
      }
    } catch {
      refresh();
      setMessage("Operazione non completata. Rileggi i dati e riprova.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <main className={styles.page}><div className={styles.sheet}>
    <Image src="/SfondoRiepilogoPagamenti.png" alt="" fill priority unoptimized
      sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
    <h1 className="sr-only">Riepilogo pagamenti</h1>
    <nav className={`${shared.navigation} ${styles.topLinks}`} aria-label="Navigazione principale">
      <Link href="/oggi">OGGI</Link>
      <Link href="/pagamenti">← PAGAMENTI</Link>
      <Link href="/menu">MENU</Link>
    </nav>
    <div className={styles.workspace}>
    <header className={styles.header}>
      <div className={styles.monthControl}>
        <button type="button" onClick={() => changeMonth(-1)} disabled={!month} aria-label="Mese precedente">‹</button>
        <h2 aria-live="polite">{month ? monthLabel(month) : "Caricamento"}</h2>
        <button type="button" onClick={() => changeMonth(1)} disabled={!month} aria-label="Mese successivo">›</button>
      </div>
      <button type="button" className={styles.currentMonth} disabled={!today}
        onClick={() => { setMonth(today); setSelectedIds([]); setPending(null); }}>Mese corrente</button>
    </header>

    {!loaded ? <p className={styles.notice}>Caricamento delle lezioni…</p> : loadError
      ? <p className={styles.notice} role="alert">{loadError}</p> : <>
    <section className={styles.totals} aria-label="Totali delle lezioni svolte">
      <p><span>Lezioni svolte</span><strong>{summary?.monthly.completed.lessonCount ?? 0}</strong></p>
      <p><span>Valore svolte</span><strong>{euro(summary?.monthly.completed.valueCents ?? 0)}</strong></p>
      <p><span>Versato per queste lezioni</span><strong>{euro(summary?.monthly.completed.paidAttributedCents ?? 0)}</strong></p>
      <p><span>Residuo svolte</span><strong>{euro(summary?.monthly.completed.outstandingCents ?? 0)}</strong></p>
      <p className={styles.receipts}><span>Incassi ricevuti nel mese</span><strong>{euro(summary?.receipts.receivedCents ?? 0)}</strong></p>
    </section>

    <section className={styles.operational} aria-label="Dettaglio pagamenti">
      {message && <p className={styles.notice} role="status">{message}</p>}
      {summary?.receipts.invalidLedgerIds.length ? <p className={styles.notice} role="alert">
        Alcuni storici richiedono verifica: gli incassi mostrati potrebbero essere incompleti.</p> : null}
      <p className={styles.explanation}>Gli incassi seguono la data del versamento. I saldi storici senza data sono esclusi.</p>
      <nav className={styles.filters} aria-label="Filtri riepilogo">
        {filters.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id}
          onClick={() => setFilter(item.id)}>{item.label}</button>)}
      </nav>
      {filter === "studente" && <label className={styles.studentPicker}>Studente
        <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
          <option value="">Tutti gli studenti</option>
          {students.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>}
      {selected.length > 0 && <div className={styles.group}>
        <p>{selected.length} lezioni di {selected[0].studentNameSnapshot} · residuo {euro(selectedTotal)}</p>
        <label>Data versamento <input type="date" value={groupDate} onChange={(event) => setGroupDate(event.target.value)} /></label>
        <label>Importo ricevuto (€) <input type="text" inputMode="decimal" value={groupAmount}
          placeholder={(selectedTotal / 100).toFixed(2)} onChange={(event) => setGroupAmount(event.target.value)} /></label>
        <button type="button" disabled={selected.length < 2} onClick={proposeGroup}>Salda lezioni selezionate</button>
        {groupError && <p role="alert">{groupError}</p>}
      </div>}
      {summary?.completed.length === 0
        ? <p className={styles.empty}>Nessuna lezione svolta registrata in questo mese.</p>
        : visible.length === 0
        ? <p className={styles.empty}>Nessuna lezione corrisponde al filtro selezionato.</p>
        : filter === "studente"
          ? students.filter(([id]) => !studentId || id === studentId).map(([id, name]) => {
            const lessons = visible.filter((lesson) => lesson.studentId === id);
            if (!lessons.length) return null;
            const due = lessons.reduce((sum, lesson) => sum + inspectLessonPayment(lesson).dueCents, 0);
            const paid = lessons.reduce((sum, lesson) => sum + inspectLessonPayment(lesson).allocatedPaidCents, 0);
            return <section key={id} className={styles.studentGroup}>
              <h3>{name}</h3><p>{lessons.length} lezioni · dovuto {euro(due)} · versato {euro(paid)} · residuo {euro(due - paid)}</p>
              {lessons.map((lesson) => <LessonRow key={lesson.occurrenceId} lesson={lesson} today={today}
                selected={selectedIds.includes(lesson.occurrenceId)} selectionLocked={Boolean(selectedStudent && selectedStudent !== lesson.studentId)}
                onToggle={() => toggleSelected(lesson)} onPropose={proposeSingle} />)}
            </section>;
          })
          : visible.map((lesson) => <LessonRow key={lesson.occurrenceId} lesson={lesson} today={today}
            selected={selectedIds.includes(lesson.occurrenceId)} selectionLocked={Boolean(selectedStudent && selectedStudent !== lesson.studentId)}
            onToggle={() => toggleSelected(lesson)} onPropose={proposeSingle} />)}
    </section>
    </>}

    </div>

    {pending && <div className={shared.dialogBackdrop}><section ref={dialogRef} className={shared.dialog} role="dialog" aria-modal="true"
      aria-labelledby="confirm-payment-title">
      <h2 id="confirm-payment-title">Conferma operazione</h2>
      <p>{pending.kind === "group" ? `${pending.lessons.length} lezioni di ${pending.lessons[0].studentNameSnapshot}`
        : lessonLabel(pending.lesson)}</p>
      <p>{pending.kind === "reverse" ? "Rettifica del versamento" :
        pending.kind === "legacy" ? "Rettifica del saldo storico senza data" :
        pending.kind === "partial" ? "Versamento parziale" : "Saldo del residuo"}: <strong>{euro(pending.amountCents)}</strong></p>
      {"paymentDate" in pending && pending.paymentDate && <p>Data effettiva: <strong>{pending.paymentDate}</strong></p>}
      <p>{pending.kind === "reverse" || pending.kind === "legacy"
        ? "La registrazione originale resterà nello storico."
        : "Il versamento sarà registrato per le lezioni indicate."}</p>
      <div className={styles.dialogActions}>
        <button type="button" disabled={busy} onClick={() => setPending(null)}>Annulla</button>
        <button type="button" disabled={busy} onClick={confirmPending}>{busy ? "Salvataggio…" : "Conferma"}</button>
      </div>
      {message && <p role="alert">{message}</p>}
    </section></div>}
  </div></main>;
}

function LessonRow({ lesson, today, selected, selectionLocked, onToggle, onPropose }: {
  lesson: CalendarOccurrence; today: LocalDate; selected: boolean; selectionLocked: boolean;
  onToggle: () => void;
  onPropose: (kind: "settle" | "partial" | "reverse" | "legacy", lesson: CalendarOccurrence,
    amountCents: number, paymentDate?: LocalDate, movementId?: string) => void;
}) {
  const payment = inspectLessonPayment(lesson);
  const ledger = readPaymentLedger(lesson);
  const [date, setDate] = useState<LocalDate>(today);
  const [partial, setPartial] = useState("");
  const [legacyCorrection, setLegacyCorrection] = useState("");
  const [error, setError] = useState("");
  const reversed = new Set(ledger?.movements.filter((movement) => movement.kind === "reversal")
    .map((movement) => movement.kind === "reversal" ? movement.originalMovementId : "") ?? []);
  const activePayments = ledger?.movements.filter((movement): movement is Extract<PaymentMovement, { kind: "payment" }> =>
    movement.kind === "payment" && !reversed.has(movement.id)) ?? [];
  const legacyBalance = (ledger?.opening ?? 0) + (ledger?.movements
    .filter((movement) => movement.kind === "legacy_adjustment")
    .reduce((sum, movement) => sum + movement.amountCents, 0) ?? 0);
  function proposePartial() {
    const cents = parseEuroCents(partial);
    if (!date || !cents || cents >= payment.outstandingCents) {
      setError("Indica una data e un importo positivo inferiore al residuo. Per il saldo completo usa il comando dedicato.");
      return;
    }
    setError("");
    onPropose("partial", lesson, cents, date);
  }
  function proposeLegacyCorrection() {
    const cents = parseEuroCents(legacyCorrection);
    if (!cents || cents > legacyBalance) { setError("Indica un importo valido, non superiore al saldo storico."); return; }
    setError("");
    onPropose("legacy", lesson, cents);
  }
  return <article className={`${styles.lesson} ${payment.dueCents > 0 && payment.outstandingCents === 0 ? styles.settled : ""}`}>
    <div className={styles.lessonHeading}>
      <div><h3>{lesson.studentNameSnapshot}</h3><p>{lesson.date.slice(8, 10)}/{lesson.date.slice(5, 7)} · {lesson.startTime} · {lesson.subject}</p></div>
      {payment.outstandingCents > 0 && payment.validLedger && <label className={styles.selectLesson}>
        <input type="checkbox" checked={selected} disabled={selectionLocked} onChange={onToggle}
          aria-label={`Seleziona ${lessonLabel(lesson)} per il saldo di gruppo`} /> Seleziona
      </label>}
    </div>
    <p>Valore {euro(lesson.lessonAmountCents)} · versato {euro(payment.paidAmountCents)}
      {payment.dueCents > 0 ? ` · residuo ${euro(payment.outstandingCents)}` : " · non dovuta"}</p>
    {!payment.validLedger && <p className={styles.warning}>Storico da verificare prima di registrare pagamenti.</p>}
    {payment.excessCents > 0 && <p className={styles.warning}>Eccedenza registrata: {euro(payment.excessCents)}.</p>}
    {payment.validLedger && payment.outstandingCents > 0 && <div className={styles.actions}>
      <label>Data versamento <input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <button type="button" onClick={() => date ? onPropose("settle", lesson, payment.outstandingCents, date)
        : setError("Indica la data effettiva del versamento.")}>
        {payment.paidAmountCents > 0 ? "Salda residuo" : "Segna saldata"}
      </button>
      <label>Versamento parziale (€) <input type="text" inputMode="decimal" value={partial}
        onChange={(event) => setPartial(event.target.value)} placeholder="0,00" /></label>
      <button type="button" onClick={proposePartial}>Registra parziale</button>
    </div>}
    {(activePayments.length > 0 || legacyBalance > 0) && <details className={styles.corrections}>
      <summary>Storico e correzioni</summary>
      {activePayments.map((movement) => <div key={movement.id} className={styles.movement}>
        <span>{movement.paymentDate} · {euro(movement.amountCents)}</span>
        <button type="button" onClick={() => onPropose("reverse", lesson, movement.amountCents,
          undefined, movement.id)}>Rettifica</button>
      </div>)}
      {legacyBalance > 0 && <div className={styles.legacy}>
        <p>Saldo precedente senza data: {euro(legacyBalance)}.</p>
        <label>Importo da correggere (€) <input type="text" inputMode="decimal" value={legacyCorrection}
          onChange={(event) => setLegacyCorrection(event.target.value)} /></label>
        <button type="button" onClick={proposeLegacyCorrection}>Rettifica saldo storico</button>
      </div>}
    </details>}
    {error && <p className={styles.warning} role="alert">{error}</p>}
  </article>;
}
