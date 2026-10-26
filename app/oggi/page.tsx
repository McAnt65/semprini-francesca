"use client";

import Image from "next/image";
import styles from "./diario.module.css";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { addDays, toLocalDate } from "../data/calendario/calendar-dates";
import { selectOccurrencesInRange } from "../data/calendario/calendar-selectors";
import { loadCalendarAppointments, loadCalendarSeries } from "../data/calendario/calendar-storage";
import { coveredTopicOf, plannedTopicOf, unclassifiedHistoricalTopicOf } from "../data/calendario/calendar-topics";
import type { CalendarOccurrence } from "../data/calendario/calendar-types";
import { loadStoredStudents } from "../data/student-storage";
import type { StudentRecord } from "../data/students";
import { lessonEditHref } from "../calendario/lesson-navigation";
import { completeTodayLesson, findTodayLesson, saveTodayTeaching, todayLessonSummary } from "./today-summary";
import { TEMPORARY_SAVE_WARNING } from "../data/save-result";
import { confirmTodayPayment, prepareTodayPayment, todayPaymentState, type TodayPaymentConfirmation } from "./today-payment";

const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const modeLabels = { casa: "In studio", domicilio: "A domicilio", online: "Online" } as const;
const statusLabels = { confermata: "CONFERMATA", attesa: "IN ATTESA", richiesta: "RICHIESTA",
  svolta: "SVOLTA", annullata: "ANNULLATA" } as const;

function dateTitle(date: string) {
  return new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" }).format(new Date(date + "T12:00:00"));
}

function fullDateTitle(date: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(date + "T12:00:00"));
}

function phoneHref(value: string) {
  const normalized = value.replace(/[^\d+]/g, "");
  return normalized ? "tel:" + normalized : "";
}

function readToday() {
  const day = toLocalDate(new Date());
  const lessons = selectOccurrencesInRange(loadCalendarAppointments(), loadCalendarSeries(), day, addDays(day, 1))
    .filter((item) => item.status !== "annullata")
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  return { day, lessons, students: loadStoredStudents() };
}

export default function TodayPage() {
  const [selectedDay, setSelectedDay] = useState<"today" | "tomorrow">("today");
  const [today, setToday] = useState("");
  const [lessons, setLessons] = useState<CalendarOccurrence[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [summaryLesson, setSummaryLesson] = useState<CalendarOccurrence | null>(null);
  const [summaryError, setSummaryError] = useState("");
  const [completionNotice, setCompletionNotice] = useState<{ kind: "success" | "warning" | "error"; text: string } | null>(null);
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [teachingOpen, setTeachingOpen] = useState(false);
  const [coveredTopicDraft, setCoveredTopicDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [originalCoveredTopic, setOriginalCoveredTopic] = useState<string | undefined>();
  const [originalNotes, setOriginalNotes] = useState("");
  const [teachingNotice, setTeachingNotice] = useState<{ kind: "success" | "warning" | "error"; text: string } | null>(null);
  const [savingTeaching, setSavingTeaching] = useState(false);
  const [paymentConfirmation, setPaymentConfirmation] = useState<TodayPaymentConfirmation | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<{ kind: "success" | "warning" | "error"; text: string } | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const completionBusy = useRef(false);
  const teachingBusy = useRef(false);
  const paymentBusy = useRef(false);
  const summaryHeading = useRef<HTMLHeadingElement>(null);
  const openedFrom = useRef("");
  const summaryOpen = summaryLesson !== null;

  useEffect(() => {
    if (!summaryOpen) return;
    document.getElementById("daily-program")?.scrollTo({ top: 0 });
    summaryHeading.current?.focus({ preventScroll: true });
  }, [summaryOpen]);

  useEffect(() => {
    function refresh() {
      const current = readToday();
      setToday(current.day);
      setLessons(current.lessons);
      setStudents(current.students);
    }
    queueMicrotask(() => {
      if (new URLSearchParams(window.location.search).get("giorno") === "domani") setSelectedDay("tomorrow");
      refresh();
    });
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const tomorrow = today ? addDays(today, 1) : "";
  const selectedDate = selectedDay === "today" ? today : tomorrow;
  const selectedLessons = lessons.filter((item) => item.date === selectedDate);
  const byId = new Map(students.map((student) => [student.id, student]));
  const calendarHref = selectedDate ? "/calendario/giorno?data=" + selectedDate : "/calendario/giorno";

  function openSummary(lesson: CalendarOccurrence) {
    if (selectedDay !== "today" || lesson.date !== toLocalDate(new Date())) return;
    const current = findTodayLesson(lesson, loadCalendarAppointments(), loadCalendarSeries());
    if (!current) {
      setSummaryError("La lezione è cambiata. Riapri OGGI e riprova.");
      return;
    }
    openedFrom.current = lesson.occurrenceId;
    setSummaryError("");
    setCompletionNotice(null);
    setTeachingNotice(null);
    setTeachingOpen(false);
    setPaymentConfirmation(null);
    setPaymentNotice(null);
    setCoveredTopicDraft(current.coveredTopic ?? "");
    setOriginalCoveredTopic(current.coveredTopic);
    setNotesDraft(current.notes);
    setOriginalNotes(current.notes);
    setSummaryLesson(current);
  }

  function saveTeaching() {
    if (!summaryLesson || teachingBusy.current) return;
    teachingBusy.current = true;
    setSavingTeaching(true);
    setTeachingNotice(null);
    try {
      const result = saveTodayTeaching(summaryLesson, {
        originalCoveredTopic, originalNotes, coveredTopic: coveredTopicDraft, notes: notesDraft,
      });
      if (result.status === "failed") {
        setTeachingNotice({ kind: "error", text: "Salvataggio non riuscito. Il testo scritto è ancora qui: riprova." });
      } else if (result.status === "conflict") {
        setTeachingNotice({ kind: "error", text: "Argomento o appunti sono cambiati dopo l'apertura. Il tuo testo è conservato qui; riapri la lezione per confrontarlo prima di salvare." });
      } else if (result.status === "stale") {
        setTeachingNotice({ kind: "error", text: "La lezione è cambiata o è stata annullata. Il tuo testo è conservato qui; torna a OGGI e riaprila." });
      } else if ("lesson" in result) {
        const current = readToday();
        setToday(current.day); setLessons(current.lessons); setStudents(current.students);
        setSummaryLesson(result.lesson);
        setCoveredTopicDraft(result.lesson.coveredTopic ?? "");
        setOriginalCoveredTopic(result.lesson.coveredTopic);
        setNotesDraft(result.lesson.notes);
        setOriginalNotes(result.lesson.notes);
        setTeachingNotice(result.status === "temporary"
          ? { kind: "warning", text: `Dati didattici salvati solo temporaneamente. ${TEMPORARY_SAVE_WARNING}` }
          : { kind: "success", text: result.status === "unchanged"
            ? "Nessuna modifica da salvare." : "Argomento e appunti salvati." });
      }
    } catch {
      setTeachingNotice({ kind: "error", text: "Salvataggio non riuscito. Il testo scritto è ancora qui: riprova." });
    } finally {
      teachingBusy.current = false;
      setSavingTeaching(false);
    }
  }

  function markCompleted() {
    if (!summaryLesson || summaryLesson.status === "svolta" || completionBusy.current) return;
    completionBusy.current = true;
    setSavingCompletion(true);
    setCompletionNotice(null);
    setTeachingNotice(null);
    setTeachingOpen(false);
    try {
      const result = completeTodayLesson(summaryLesson);
      if (result.status === "stale") {
        const current = readToday();
        setToday(current.day); setLessons(current.lessons); setStudents(current.students);
        setSummaryLesson(null);
        setSummaryError("La lezione è cambiata o è stata annullata. Riaprila da OGGI prima di riprovare.");
      } else if (result.status === "failed") {
        setCompletionNotice({ kind: "error", text: "Non è stato possibile salvare la lezione. Riprova." });
      } else if ("lesson" in result) {
        const current = readToday();
        setToday(current.day); setLessons(current.lessons); setStudents(current.students);
        setSummaryLesson(result.lesson);
        setCompletionNotice(result.status === "temporary"
          ? { kind: "warning", text: `Lezione segnata come SVOLTA solo temporaneamente. ${TEMPORARY_SAVE_WARNING}` }
          : { kind: "success", text: result.status === "unchanged"
            ? "La lezione risulta già SVOLTA." : "Lezione segnata come SVOLTA." });
      }
    } catch {
      setCompletionNotice({ kind: "error", text: "Non è stato possibile salvare la lezione. Riprova." });
    } finally {
      completionBusy.current = false;
      setSavingCompletion(false);
    }
  }

  function closeSummary() {
    setSummaryLesson(null);
    setCompletionNotice(null);
    setPaymentConfirmation(null);
    setPaymentNotice(null);
    requestAnimationFrame(() => document.getElementById(`concludi-${openedFrom.current}`)?.focus());
  }

  function refreshAfterPayment(lesson: CalendarOccurrence) {
    const current = readToday();
    setToday(current.day); setLessons(current.lessons); setStudents(current.students);
    setSummaryLesson(lesson);
  }

  function openPaymentConfirmation() {
    if (!summaryLesson || paymentBusy.current) return;
    setPaymentNotice(null);
    const result = prepareTodayPayment(summaryLesson, toLocalDate(new Date()));
    if (result.status === "stale") {
      setPaymentConfirmation(null);
      setSummaryLesson(null);
      setSummaryError("La lezione è cambiata. Riaprila da OGGI prima di registrare il pagamento.");
      const current = readToday();
      setToday(current.day); setLessons(current.lessons); setStudents(current.students);
    } else if (result.status === "unavailable") {
      setPaymentConfirmation(null);
      refreshAfterPayment(result.lesson);
      setPaymentNotice({ kind: "error", text: "La situazione economica è cambiata. Verifica il nuovo stato prima di riprovare." });
    } else {
      refreshAfterPayment(result.lesson);
      setPaymentConfirmation(result.confirmation);
    }
  }

  function confirmPayment() {
    if (!paymentConfirmation || paymentBusy.current) return;
    paymentBusy.current = true;
    setSavingPayment(true);
    setPaymentNotice(null);
    try {
      const result = confirmTodayPayment(paymentConfirmation);
      if (result.status === "saved" || result.status === "temporary" || result.status === "unchanged") {
        refreshAfterPayment(result.lesson);
        setPaymentConfirmation(null);
        setPaymentNotice(result.status === "temporary"
          ? { kind: "warning", text: `Pagamento salvato solo temporaneamente. ${TEMPORARY_SAVE_WARNING}` }
          : { kind: "success", text: result.status === "unchanged"
            ? "Pagamento già registrato. Nessun nuovo versamento aggiunto." : "Pagamento registrato per questa lezione." });
      } else if (result.status === "changed" || result.status === "unavailable") {
        refreshAfterPayment(result.lesson);
        setPaymentConfirmation(null);
        setPaymentNotice({ kind: "error", text: result.status === "changed"
          ? "Il residuo è cambiato. Controlla il nuovo importo e apri una nuova conferma."
          : "Il pagamento non è più disponibile. Controlla il nuovo stato della lezione." });
      } else if (result.status === "stale") {
        setPaymentConfirmation(null);
        setSummaryLesson(null);
        setSummaryError("La lezione è cambiata. Riaprila da OGGI prima di registrare il pagamento.");
        const current = readToday();
        setToday(current.day); setLessons(current.lessons); setStudents(current.students);
      } else {
        setPaymentNotice({ kind: "error", text: result.status === "invalid_date"
          ? "Inserisci una data del versamento valida."
          : "Pagamento non salvato. Riprova con CONFERMA PAGAMENTO." });
      }
    } catch {
      setPaymentNotice({ kind: "error", text: "Pagamento non salvato. Riprova con CONFERMA PAGAMENTO." });
    } finally {
      paymentBusy.current = false;
      setSavingPayment(false);
    }
  }

  const summary = summaryLesson ? todayLessonSummary(summaryLesson) : null;
  const paymentState = summaryLesson ? todayPaymentState(summaryLesson) : null;
  const summaryStudent = summaryLesson ? byId.get(summaryLesson.studentId) : undefined;
  const summaryName = summaryStudent
    ? `${summaryStudent.firstName} ${summaryStudent.lastName}` : summaryLesson?.studentNameSnapshot;
  const suggestedTopic = summaryLesson?.topic.trim() ?? "";
  const historicalSuggestion = summaryLesson ? unclassifiedHistoricalTopicOf(summaryLesson) : "";

  return (
    <main className={styles.page}>
      <div className={styles.sheet}>
        <Image src="/images/copertine/oggi.png" alt="" fill preload unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
        <h1 className="sr-only">Il Registro di Francesca: programma delle lezioni</h1>
        <div className={styles.content}>
          <nav className={styles.navigation} aria-label="Giornata e menu">
            <button type="button" aria-pressed={selectedDay === "today"} aria-controls="daily-program" onClick={() => { setSelectedDay("today"); setSummaryLesson(null); setSummaryError(""); setCompletionNotice(null); setPaymentConfirmation(null); setPaymentNotice(null); }}>OGGI</button>
            <Link href="/menu">MENU</Link>
            <button type="button" aria-pressed={selectedDay === "tomorrow"} aria-controls="daily-program" onClick={() => { setSelectedDay("tomorrow"); setSummaryLesson(null); setSummaryError(""); setCompletionNotice(null); setPaymentConfirmation(null); setPaymentNotice(null); }}>DOMANI</button>
          </nav>
          <section key={selectedDay} id="daily-program" className={styles.scroll} tabIndex={0} aria-labelledby={summaryLesson ? "summary-title" : "program-title"}>
            {summaryLesson && summary ? <article className={styles.summary}>
              <button type="button" className={styles.summaryBack} onClick={closeSummary}>← TORNA A OGGI</button>
              <header className={styles.summaryHeader}>
                <h2 id="summary-title" ref={summaryHeading} tabIndex={-1}>{summaryName}</h2>
                <p className={styles.summaryMeta}>{summaryLesson.subject} <span aria-hidden="true">·</span> {summaryLesson.startTime} <span aria-hidden="true">·</span> {summaryLesson.durationMinutes} min</p>
                <p className={styles.summaryContext}>{modeLabels[summaryLesson.mode]} <span aria-hidden="true">·</span> {fullDateTitle(summaryLesson.date)}</p>
              </header>
              <div className={styles.summaryOperations}>
                <section className={styles.summaryOperation} aria-labelledby="lesson-operation-title">
                  <h3 id="lesson-operation-title">LEZIONE</h3>
                  {summaryLesson.status === "annullata" ? <p className={styles.neutralStatus}>ANNULLATA</p>
                    : summary.completed ? <p className={styles.positiveStatus}>SVOLTA</p>
                      : <button type="button" className={styles.completeAction} onClick={markCompleted}
                        disabled={savingCompletion}>{savingCompletion ? "SALVATAGGIO…" : "SEGNA SVOLTA"}</button>}
                  {completionNotice && <p className={completionNotice.kind === "success" ? styles.summarySuccess : styles.summaryWarning}
                    role={completionNotice.kind === "error" ? "alert" : "status"}>{completionNotice.text}</p>}
                </section>
                <section className={styles.summaryOperation} aria-labelledby="payment-operation-title">
                  <h3 id="payment-operation-title">PAGAMENTO</h3>
                  {paymentState?.label === "SALDATA" ? <p className={styles.positiveStatus}>SALDATA <span>· {currency.format(summary.amountCents / 100)}</span></p>
                    : paymentState?.label === "NON DOVUTA" ? <p className={styles.neutralStatus}>NON DOVUTA</p>
                      : paymentState?.action ? <p className={styles.paymentDue}>{paymentState.label === "PARZIALE" ? "Residuo" : "Da saldare"}: <strong>{currency.format(paymentState.outstandingCents / 100)}</strong></p>
                        : <p className={styles.neutralStatus}>{paymentState?.label}</p>}
                  {(summary.paymentMismatch || !summary.paymentReadable) && <p className={styles.summaryWarning} role="status">La situazione del pagamento richiede una verifica nel dettaglio.</p>}
                  {paymentNotice && <p className={paymentNotice.kind === "success" ? styles.summarySuccess : styles.summaryWarning}
                    role={paymentNotice.kind === "error" ? "alert" : "status"}>{paymentNotice.text}</p>}
                  {paymentConfirmation ? <section className={styles.paymentConfirmation} aria-label="Conferma del versamento">
                    <h3>Conferma pagamento</h3>
                    <p><strong>Studente:</strong> {summaryName}</p>
                    <p><strong>Lezione:</strong> {fullDateTitle(paymentConfirmation.reference.date)}</p>
                    <p><strong>Importo da registrare:</strong> {currency.format(paymentConfirmation.amountCents / 100)}</p>
                    <label htmlFor="today-payment-date">Data del versamento</label>
                    <input id="today-payment-date" type="date" value={paymentConfirmation.paymentDate}
                      onChange={(event) => setPaymentConfirmation((previous) => previous && { ...previous, paymentDate: event.target.value })} />
                    <div className={styles.paymentChoices}>
                      <button type="button" onClick={() => { setPaymentConfirmation(null); setPaymentNotice(null); }} disabled={savingPayment}>ANNULLA</button>
                      <button type="button" onClick={confirmPayment} disabled={savingPayment}>
                        {savingPayment ? "SALVATAGGIO…" : "CONFERMA PAGAMENTO"}
                      </button>
                    </div>
                  </section> : paymentState?.action && <button type="button" className={styles.completeAction}
                    onClick={openPaymentConfirmation} disabled={savingPayment}>{paymentState.action}</button>}
                </section>
              </div>
              <section className={styles.teachingSection} aria-label="Argomento e appunti facoltativi">
                <button type="button" className={styles.teachingToggle} aria-expanded={teachingOpen}
                  aria-controls="teaching-fields" onClick={() => setTeachingOpen((open) => !open)}>
                  <span>ARGOMENTO E APPUNTI {summaryLesson.notes && <span className={styles.notesPresent}>· Appunti presenti</span>}</span>
                  <span aria-hidden="true">{teachingOpen ? "−" : "+"}</span>
                </button>
                {teachingOpen && <div id="teaching-fields" className={styles.teachingFields}>
                  {coveredTopicOf(summaryLesson) && <p className={styles.summaryNote}><strong>Argomento affrontato:</strong> {coveredTopicOf(summaryLesson)}</p>}
                  {plannedTopicOf(summaryLesson) && <p className={styles.summaryNote}><strong>Argomento previsto:</strong> {plannedTopicOf(summaryLesson)}</p>}
                  {historicalSuggestion && <p className={styles.summaryNote}><strong>Argomento storico non classificato:</strong> {historicalSuggestion}</p>}
                  {summaryLesson.notes && <p className={styles.summaryNote}><strong>Appunti già annotati:</strong> {summaryLesson.notes}</p>}
                  {suggestedTopic && <div className={styles.topicSuggestion}>
                    <p>{historicalSuggestion ? "Argomento storico non classificato" : "Argomento previsto"}: {suggestedTopic}</p>
                    <button type="button" onClick={() => setCoveredTopicDraft(suggestedTopic)}>USA COME AFFRONTATO</button>
                  </div>}
                  <label htmlFor="covered-topic">Argomento affrontato <span>(facoltativo)</span></label>
                  <textarea id="covered-topic" rows={2} value={coveredTopicDraft}
                    onChange={(event) => setCoveredTopicDraft(event.target.value)} />
                  <label htmlFor="teaching-notes">Appunti della lezione <span>(facoltativi)</span></label>
                  <textarea id="teaching-notes" rows={5} value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)} />
                  {teachingNotice && <p role={teachingNotice.kind === "error" ? "alert" : "status"}
                    className={teachingNotice.kind === "success" ? styles.summarySuccess : styles.summaryWarning}>{teachingNotice.text}</p>}
                  <button type="button" className={styles.teachingSave} onClick={saveTeaching} disabled={savingTeaching}>
                    {savingTeaching ? "SALVATAGGIO…" : "SALVA ARGOMENTO E APPUNTI"}
                  </button>
                </div>}
              </section>
              <details className={styles.otherDetails}>
                <summary>ALTRI DETTAGLI DELLA LEZIONE</summary>
                <dl className={styles.summaryDetails}>
                  <div><dt>Data</dt><dd>{fullDateTitle(summaryLesson.date)}</dd></div>
                  <div><dt>Ora e durata</dt><dd>{summaryLesson.startTime} · {summaryLesson.durationMinutes} min</dd></div>
                  <div><dt>Modalità</dt><dd>{modeLabels[summaryLesson.mode]}</dd></div>
                  <div><dt>Importo totale</dt><dd>{currency.format(summary.amountCents / 100)}</dd></div>
                  <div><dt>Già versato</dt><dd>{summary.paymentReadable ? currency.format(summary.paidAmountCents / 100) : "Da verificare"}</dd></div>
                  <div><dt>Residuo</dt><dd>{summary.paymentReadable ? currency.format(summary.outstandingCents / 100) : "Da verificare"}</dd></div>
                  <div><dt>Stato didattico</dt><dd>{statusLabels[summaryLesson.status]}</dd></div>
                  <div><dt>Stato economico</dt><dd>{paymentState?.label}</dd></div>
                </dl>
                {summaryLesson.seriesId && <p className={styles.summaryRecurrence}>
                  Lezione ricorrente del {fullDateTitle(summaryLesson.originalOccurrenceDate ?? summaryLesson.date)}
                  {summaryLesson.isException && " · Occorrenza modificata"}
                </p>}
              </details>
              <Link href={lessonEditHref(summaryLesson, "/oggi")} className={styles.summaryEdit}>APRI DETTAGLIO LEZIONE</Link>
            </article> : <>
            <header className={styles.programHeader}>
              <h2 id="program-title">Le lezioni di {selectedDay === "today" ? "oggi" : "domani"}</h2>
              <p className={styles.date} aria-live="polite">{selectedDate ? dateTitle(selectedDate) : "Caricamento della giornata..."}</p>
              <Link href={calendarHref} className={`${styles.link} ${styles.agendaLink}`}>Apri agenda</Link>
            </header>
            {summaryError && <p className={styles.summaryWarning} role="alert">{summaryError}</p>}
            {selectedDate && selectedLessons.length === 0 && <p className={styles.empty}>{selectedDay === "today" ? "Oggi non ci sono lezioni in programma." : "Nessuna lezione prevista per domani."}</p>}
            {selectedLessons.map((lesson) => {
              const student = byId.get(lesson.studentId);
              const name = student ? student.firstName + " " + student.lastName : lesson.studentNameSnapshot;
              const address = student && [student.address, student.city, student.province].filter(Boolean).join(", ");
              const phone = student?.phone || student?.whatsapp || "";
              const whatsappDigits = (student?.whatsapp || student?.phone || "").replace(/\D/g, "");
              const whatsapp = whatsappDigits && !whatsappDigits.startsWith("39") ? "39" + whatsappDigits : whatsappDigits;
              return (
                <article key={lesson.occurrenceId} className={styles.lesson}>
                  <div className={styles.lessonHeading}>
                    <p className={styles.time}>{lesson.startTime} <span>· {lesson.durationMinutes} min</span></p>
                    <Link href={"/studenti/" + encodeURIComponent(lesson.studentId)} className={styles.student}>{name}</Link>
                  </div>
                  <p className={styles.subject}>{lesson.subject}</p>
                  {selectedDay === "tomorrow" ? lesson.topic && <p className={styles.topic}>Da preparare: {lesson.topic}</p> : <>
                    {coveredTopicOf(lesson) && <p className={styles.topic}>Affrontato: {coveredTopicOf(lesson)}</p>}
                    {plannedTopicOf(lesson) && <p className={styles.topic}>Previsto: {plannedTopicOf(lesson)}</p>}
                    {unclassifiedHistoricalTopicOf(lesson) && <p className={styles.topic}>Argomento storico non classificato: {unclassifiedHistoricalTopicOf(lesson)}</p>}
                  </>}
                  <p className={styles.lessonMeta}><span className={`${styles.status} ${lesson.status === "svolta" ? styles.statusDone : ""}`}>{lesson.status === "svolta" ? "SVOLTA" : lesson.status}</span><span aria-hidden="true"> · </span><span className={styles.mode}>{lesson.mode === "domicilio" ? "A domicilio" : lesson.mode === "online" ? "Online" : "In studio"}</span></p>
                  {lesson.mode === "domicilio" && address && <p className={styles.address}><a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address)} target="_blank" rel="noopener noreferrer" className={`${styles.link} ${styles.addressLink}`}>{address} ↗</a></p>}
                  {selectedDay === "today" && lesson.status !== "annullata" && <button type="button" id={`concludi-${lesson.occurrenceId}`} className={styles.concludeAction}
                    onClick={() => openSummary(lesson)} aria-label={`Concludi lezione: ${name}, ${lesson.startTime}`}>
                    CONCLUDI LEZIONE
                  </button>}
                  {lesson.notes && <p className={styles.notes}>{lesson.notes}</p>}
                  {(phone || whatsapp) && <div className={styles.contacts}>
                    {phone && phoneHref(phone) && <a href={phoneHref(phone)} className={styles.link} aria-label={"Chiama " + name}>{phone}</a>}
                    {whatsapp && <a href={"https://wa.me/" + whatsapp} target="_blank" rel="noopener noreferrer" className={styles.link} aria-label={"WhatsApp di " + name}>WhatsApp</a>}
                  </div>}
                  {!!lesson.travelMinutes && <p className={styles.secondary}>Spostamento previsto: {lesson.travelMinutes} min</p>}
                  <Link href={lessonEditHref(lesson, selectedDay === "tomorrow" ? "/oggi?giorno=domani" : "/oggi")} className={styles.link}>Apri la lezione</Link>
                </article>
              );
            })}
            <Link href={selectedDate ? "/calendario/nuova?data=" + selectedDate + "&origine=oggi" : "/calendario/nuova?origine=oggi"} className={`${styles.link} ${styles.newLesson}`}>+ Nuova lezione</Link>
            </>}
          </section>
        </div>
      </div>
    </main>
  );
}
