"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { checkLessonAvailability } from "../../../data/calendario/calendar-availability";
import { isLocalDate, isLocalTime, toLocalDate } from "../../../data/calendario/calendar-dates";
import { selectDayOccurrences } from "../../../data/calendario/calendar-selectors";
import { createSingleOccurrenceException } from "../../../data/calendario/calendar-recurrence";
import { loadCalendarAppointments, loadCalendarSeries, upsertCalendarAppointmentResult } from "../../../data/calendario/calendar-storage";
import { TEMPORARY_SAVE_WARNING } from "../../../data/save-result";
import type { CalendarAppointment, CalendarSeries, LessonMode, LessonStatus } from "../../../data/calendario/calendar-types";
import { calendarSelectionHref, clearNewLessonDraft, formatItalianLessonDate, loadNewLessonDraft, saveNewLessonDraft, validSelectionToken, type NewLessonDraft } from "../../nuova/lesson-selection";
import { lessonReturnHref, lessonSaveDestination } from "../../lesson-navigation";
import styles from "../../nuova/nuova.module.css";

export default function EditPage() {
  return <Suspense fallback={<main className={styles.page} />}><Edit /></Suspense>;
}

function Edit() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const id = decodeURIComponent(String(params.id));
  const requested = search.get("data");
  const originalDate = isLocalDate(requested) ? requested : toLocalDate(new Date());
  const origin = search.get("origine");
  const requestedToken = search.get("bozza");
  const selectedDate = search.get("sceltaData");
  const selectedTime = search.get("sceltaOra");
  const [item, setItem] = useState<CalendarAppointment | null>(null);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const back = lessonReturnHref(search.get("ritorno") ?? (origin === "oggi" ? "/oggi" : null), originalDate);

  useEffect(() => {
    queueMicrotask(() => {
      const currentAppointments = loadCalendarAppointments();
      const currentSeries = loadCalendarSeries();
      const match = selectDayOccurrences(currentAppointments, currentSeries, originalDate)
        .find((lesson) => lesson.occurrenceId === id || lesson.appointmentId === id);
      setAppointments(currentAppointments);
      setSeries(currentSeries);
      setLoaded(true);
      if (!match) { setError("Lezione non trovata in questa data."); return; }
      const existing = currentAppointments.find((lesson) => lesson.id === match.appointmentId);
      const source = currentSeries.find((lesson) => lesson.id === match.seriesId);
      const initial = existing ?? (source
        ? createSingleOccurrenceException(source, match.originalOccurrenceDate ?? match.date, crypto.randomUUID(), {})
        : null);
      if (!initial) { setError("Lezione non trovata."); return; }
      const restored = validSelectionToken(requestedToken) ? loadNewLessonDraft(requestedToken) : null;
      const editing = restored?.editing;
      const sameLesson = editing?.originalDate === originalDate &&
        editing.record.studentId === match.studentId &&
        (existing ? editing.record.id === existing.id : editing.record.seriesId === match.seriesId);
      const record = sameLesson ? editing.record : initial;
      const pickedDate = sameLesson && isLocalDate(selectedDate) ? selectedDate! : record.date;
      const pickedTime = sameLesson && isLocalTime(selectedTime) ? selectedTime! : record.startTime;
      setItem({ ...record, date: pickedDate, startTime: pickedTime });
      setToken(validSelectionToken(requestedToken) ? requestedToken : crypto.randomUUID());
    });
  }, [id, originalDate, requestedToken, selectedDate, selectedTime]);

  const exclude = item ? { appointmentId: item.id, seriesId: item.seriesId, originalOccurrenceDate: item.originalOccurrenceDate } : undefined;
  const availability = item && loaded ? checkLessonAvailability(
    { date: item.date, startTime: item.startTime, durationMinutes: item.durationMinutes },
    appointments, series, exclude,
  ) : null;

  function openCalendar() {
    if (!item || !token) return;
    const href = `/calendario/${encodeURIComponent(id)}/modifica?ritorno=${encodeURIComponent(back)}`;
    const draft: NewLessonDraft = {
      studentId: item.studentId, subject: item.subject, date: item.date, time: item.startTime,
      duration: String(item.durationMinutes), mode: item.mode, status: item.status, topic: item.topic,
      notes: item.notes, tariffId: item.tariffId ?? "", hourlyRate: String(item.hourlyRateCents / 100),
      weekly: false, intervalWeeks: "1", endsOn: "",
      editing: { href, originalDate, record: item, exclude: exclude! },
    };
    if (!saveNewLessonDraft(token, draft)) { setError("Non è possibile conservare temporaneamente la modifica in questo browser."); return; }
    router.push(calendarSelectionHref("week", isLocalDate(item.date) ? item.date : originalDate, token));
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item || saving) return;
    if (!isLocalDate(item.date) || !isLocalTime(item.startTime) || !Number.isInteger(item.durationMinutes) ||
        item.durationMinutes < 15 || item.durationMinutes > 480) { setError("Controlla data, ora e durata."); return; }
    if (item.travelMinutes !== undefined && (!Number.isInteger(item.travelMinutes) || item.travelMinutes < 1 || item.travelMinutes > 480)) {
      setError("La durata dello spostamento deve essere tra 1 e 480 minuti."); return;
    }
    if (item.status !== "annullata") {
      const fresh = checkLessonAvailability(
        { date: item.date, startTime: item.startTime, durationMinutes: item.durationMinutes },
        loadCalendarAppointments(), loadCalendarSeries(), exclude,
      );
      if (fresh.state === "incomplete") { setError(fresh.reason); return; }
      if (fresh.state === "conflict") {
        setError(`Orario non disponibile: ${fresh.occurrence.studentNameSnapshot}, ${fresh.occurrence.date} alle ${fresh.occurrence.startTime}.`); return;
      }
    }
    const original = appointments.find((lesson) => lesson.id === item.id) ?? series.find((lesson) => lesson.id === item.seriesId);
    const amountChanged = !original || item.hourlyRateCents !== original.hourlyRateCents || item.durationMinutes !== original.durationMinutes;
    const next = { ...item, lessonAmountCents: amountChanged
      ? Math.round(item.hourlyRateCents * item.durationMinutes / 60) : item.lessonAmountCents, updatedAt: new Date().toISOString() };
    setSaving(true);
    const result = upsertCalendarAppointmentResult(next);
    const destination = lessonSaveDestination(result, back);
    if (!destination) { setSaving(false); setError(result.status === "temporary" ? TEMPORARY_SAVE_WARNING : "Salvataggio non riuscito."); return; }
    clearNewLessonDraft(token);
    router.push(destination);
  }

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/SfondoNuovaLezioneLezioni.png" alt="" fill priority unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Modifica lezione</h1>
      <nav aria-label="Navigazione principale" className={styles.navigation}>
        <Link href="/oggi">OGGI</Link><Link href="/lezioni">LEZIONI</Link><Link href="/menu">MENU</Link>
      </nav>
      <form id="edit-lesson" onSubmit={save} className={styles.form}>
        {item && <>
          <p>{item.studentNameSnapshot} · {item.subject}</p>
          <div className={styles.calendarChoice}><button type="button" onClick={openCalendar}>SELEZIONA DAL CALENDARIO</button>
            <output>{isLocalDate(item.date) && isLocalTime(item.startTime) ? `${formatItalianLessonDate(item.date)} · ${item.startTime}` : "Nessun orario selezionato"}</output></div>
          <div className={styles.pair}>
            <label>Data<input type="date" required value={item.date} onChange={(event) => setItem({ ...item, date: event.target.value })} /></label>
            <label>Ora<input type="time" required step="1800" value={item.startTime} onChange={(event) => setItem({ ...item, startTime: event.target.value })} /></label>
          </div>
          <div className={styles.pair}>
            <label>Durata in minuti<input type="number" min="15" max="480" step="1" required value={item.durationMinutes} onChange={(event) => setItem({ ...item, durationMinutes: Number(event.target.value) })} /></label>
            <label>Modalità<select value={item.mode} onChange={(event) => setItem({ ...item, mode: event.target.value as LessonMode })}>
              <option value="casa">A casa</option><option value="domicilio">A domicilio</option><option value="online">Online</option>
            </select></label>
          </div>
          {availability?.state === "conflict" && item.status !== "annullata" &&
            <p role="alert" className={styles.conflict}>ORARIO NON DISPONIBILE · {availability.occurrence.date} {availability.occurrence.startTime}</p>}
          {item.mode === "domicilio" && <label>Durata prevista dello spostamento (minuti, facoltativa)
            <input type="number" min="1" max="480" step="1" value={item.travelMinutes ?? ""} onChange={(event) => setItem({ ...item, travelMinutes: event.target.value ? Number(event.target.value) : undefined })} />
          </label>}
          <label>Tariffa oraria (€)<input type="number" min="0" step="0.01" value={item.hourlyRateCents / 100} onChange={(event) => setItem({ ...item, hourlyRateCents: Math.round(Number(event.target.value) * 100) })} /></label>
          <label>Stato<select value={item.status} onChange={(event) => setItem({ ...item, status: event.target.value as LessonStatus })}>
            <option value="confermata">Confermata</option><option value="attesa">In attesa</option><option value="richiesta">Richiesta</option>
            <option value="svolta">Svolta</option><option value="annullata">Annullata</option>
          </select></label>
          <label>{item.topicKind === "planned" ? "Argomento previsto" : "Argomento precedente (storico, non classificato)"}<input value={item.topic} onChange={(event) => setItem({ ...item, topic: event.target.value })} /></label>
          <label>Argomento affrontato (facoltativo)<input value={item.coveredTopic ?? ""} onChange={(event) => setItem({ ...item, coveredTopic: event.target.value })} /></label>
          <label>Appunti sulla lezione<textarea rows={5} value={item.notes} onChange={(event) => setItem({ ...item, notes: event.target.value })} /></label>
          <Link href="/tariffario/pagamenti">Registra il pagamento in Tariffe → Pagamenti</Link>
        </>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </form>
      {item && <div className={`${styles.actions} ${styles.editActions}`}>
        <button form="edit-lesson" type="submit" disabled={saving || !loaded}>{saving ? "SALVATAGGIO…" : "SALVA"}</button>
        <Link href={back} onClick={() => clearNewLessonDraft(token)}>ANNULLA</Link>
      </div>}
    </div>
  </main>;
}
