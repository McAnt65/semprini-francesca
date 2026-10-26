"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { groupOccurrencesByDate } from "../../data/calendario/calendar-selectors";
import { loadCalendarAppointments, loadCalendarSeries, upsertCalendarAppointmentResult } from "../../data/calendario/calendar-storage";
import { coveredTopicOf, plannedTopicOf, unclassifiedHistoricalTopicOf } from "../../data/calendario/calendar-topics";
import { TEMPORARY_SAVE_WARNING } from "../../data/save-result";
import type { CalendarAppointment, CalendarSeries } from "../../data/calendario/calendar-types";
import { lessonEditorHref } from "../in-programma/upcoming-lessons";
import { selectCompletedLessons } from "../storico/history-lessons";
import { appointmentWithUpdatedNotes, filterAndSortDiary, type DiaryCriterion, type DiaryOrder } from "./diary-lessons";
import styles from "./diario.module.css";

const dateFormatter = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
function formatDate(value: string) { return dateFormatter.format(new Date(`${value}T12:00:00`)); }

export default function LessonDiaryPage() {
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [criterion, setCriterion] = useState<DiaryCriterion>("student");
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<DiaryOrder>("recent");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    function refresh() { setAppointments(loadCalendarAppointments()); setSeries(loadCalendarSeries()); setNow(new Date()); }
    queueMicrotask(refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("storage", refresh); };
  }, []);

  const completed = useMemo(() => now ? selectCompletedLessons(appointments, series, now) : [], [appointments, series, now]);
  const visible = useMemo(() => filterAndSortDiary(completed, criterion, query, order), [completed, criterion, query, order]);
  const days = useMemo(() => [...groupOccurrencesByDate(visible)], [visible]);

  function saveNotes(id: string) {
    const lesson = completed.find((item) => item.occurrenceId === id);
    if (!lesson) { setError("La lezione non è più disponibile. Ricarica la pagina."); return; }
    const currentAppointments = loadCalendarAppointments();
    const currentSeries = loadCalendarSeries();
    const updated = appointmentWithUpdatedNotes(lesson, draft, currentAppointments, currentSeries, crypto.randomUUID(), new Date().toISOString());
    const result = updated ? upsertCalendarAppointmentResult(updated) : { status: "failed" };
    if (result.status !== "saved") { setError(result.status === "temporary" ? TEMPORARY_SAVE_WARNING : "Non è stato possibile salvare le annotazioni. Riprova."); return; }
    setAppointments(loadCalendarAppointments());
    setSeries(loadCalendarSeries());
    setEditingId(null);
    setDraft("");
    setError("");
  }

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/SfondoDiarioLezioniLezioni.png" alt="" fill priority unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Diario Lezioni</h1>
      <nav className={styles.navigation} aria-label="Navigazione lezioni">
        <Link href="/oggi">OGGI</Link><Link href="/lezioni">LEZIONI</Link><Link href="/menu">MENU</Link>
      </nav>
      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <label>CERCA <select aria-label="Cerca per" value={criterion} onChange={(event) => { setCriterion(event.target.value as DiaryCriterion); setQuery(""); }}>
            <option value="student">Studente</option><option value="subject">Materia</option><option value="text">Testo</option>
          </select></label>
          <label>ORDINA <select aria-label="Ordina lezioni" value={order} onChange={(event) => setOrder(event.target.value as DiaryOrder)}>
            <option value="recent">Più recenti</option><option value="oldest">Meno recenti</option>
          </select></label>
        </div>
        <input aria-label={criterion === "student" ? "Cerca studente" : criterion === "subject" ? "Cerca materia" : "Cerca negli argomenti e nelle annotazioni"} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={criterion === "student" ? "Nome studente" : criterion === "subject" ? "Materia" : "Argomenti e annotazioni"} />
      </div>
      <section className={styles.workspace} aria-label="Diario delle lezioni">
        <div className={styles.lessons} role="region" tabIndex={0} aria-label="Lezioni svolte e annotazioni">
          {now && completed.length === 0 && <p className={styles.empty}>Nessuna annotazione nel diario</p>}
          {now && completed.length > 0 && visible.length === 0 && <p className={styles.empty}>Nessuna lezione corrisponde alla ricerca</p>}
          {now && completed.length > 0 && !completed.some((item) => coveredTopicOf(item) || unclassifiedHistoricalTopicOf(item) || item.notes) && !query && <p className={styles.empty}>Le lezioni svolte non hanno ancora argomenti affrontati o annotazioni.</p>}
          {days.map(([date, lessons]) => <section key={date} className={styles.day} aria-label={formatDate(date)}>
            <h2>{formatDate(date)}</h2>
            {lessons.map((lesson) => <article key={lesson.occurrenceId} className={styles.lesson}>
              <p className={styles.mainLine}><span>{lesson.startTime}</span> <span>{lesson.studentNameSnapshot}</span></p>
              <p className={styles.subject}>{lesson.subject}</p>
              {coveredTopicOf(lesson) && <p className={styles.detail}>Argomento affrontato: <span>{coveredTopicOf(lesson)}</span></p>}
              {plannedTopicOf(lesson) && <p className={styles.detail}>Argomento previsto: <span>{plannedTopicOf(lesson)}</span></p>}
              {unclassifiedHistoricalTopicOf(lesson) && <p className={styles.detail}>Argomento storico non classificato: <span>{unclassifiedHistoricalTopicOf(lesson)}</span></p>}
              {editingId === lesson.occurrenceId ? <div className={styles.editArea}>
                <label htmlFor={`notes-${lesson.occurrenceId}`}>Annotazioni di Francesca</label>
                <textarea id={`notes-${lesson.occurrenceId}`} value={draft} onChange={(event) => setDraft(event.target.value)} rows={Math.max(4, draft.split("\n").length)} autoFocus />
                {error && <p role="alert" className={styles.error}>{error}</p>}
                <div className={styles.actions}><button type="button" onClick={() => saveNotes(lesson.occurrenceId)}>SALVA</button><button type="button" onClick={() => { setEditingId(null); setDraft(""); setError(""); }}>ANNULLA</button></div>
              </div> : <>
                {lesson.notes && <p className={styles.detail}>Annotazioni: <span>{lesson.notes}</span></p>}
                <button type="button" className={styles.editButton} onClick={() => { setEditingId(lesson.occurrenceId); setDraft(lesson.notes); setError(""); }}>{lesson.notes ? "MODIFICA ANNOTAZIONI" : "AGGIUNGI ANNOTAZIONI"}</button>
              </>}
              <Link className={styles.openLesson} href={lessonEditorHref(lesson, "/lezioni/diario")} aria-label={`Apri lezione di ${lesson.studentNameSnapshot} del ${formatDate(date)} alle ${lesson.startTime}`}>APRI LEZIONE</Link>
            </article>)}
          </section>)}
        </div>
      </section>
    </div>
  </main>;
}
