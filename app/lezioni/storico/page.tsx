"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { groupOccurrencesByDate } from "../../data/calendario/calendar-selectors";
import { loadCalendarAppointments, loadCalendarSeries } from "../../data/calendario/calendar-storage";
import { coveredTopicOf, plannedTopicOf, unclassifiedHistoricalTopicOf } from "../../data/calendario/calendar-topics";
import type { CalendarAppointment, CalendarSeries, LessonMode } from "../../data/calendario/calendar-types";
import { lessonEditorHref } from "../in-programma/upcoming-lessons";
import { filterAndSortHistory, lessonPaymentLabel, selectCompletedLessons, type HistoryCriterion, type HistoryOrder } from "./history-lessons";
import styles from "./storico.module.css";

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});
const modeLabels: Record<LessonMode, string> = {
  casa: "A casa", domicilio: "A domicilio", online: "Online",
};
function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T12:00:00`));
}

export default function LessonHistoryPage() {
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [criterion, setCriterion] = useState<HistoryCriterion>("student");
  const [query, setQuery] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodThrough, setPeriodThrough] = useState("");
  const [order, setOrder] = useState<HistoryOrder>("recent");

  useEffect(() => {
    function refresh() {
      setAppointments(loadCalendarAppointments());
      setSeries(loadCalendarSeries());
      setNow(new Date());
    }
    queueMicrotask(refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("storage", refresh); };
  }, []);

  const completed = useMemo(() => now ? selectCompletedLessons(appointments, series, now) : [], [appointments, series, now]);
  const subjects = useMemo(() => [...new Set(completed.map((item) => item.subject))].sort((a, b) => a.localeCompare(b, "it")), [completed]);
  const visible = useMemo(() => filterAndSortHistory(completed, criterion, query, periodFrom, periodThrough, order),
    [completed, criterion, query, periodFrom, periodThrough, order]);
  const days = useMemo(() => [...groupOccurrencesByDate(visible)], [visible]);

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/SfondoStoricoLezioniLezioni.png" alt="" fill priority unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Storico Lezioni</h1>
      <nav className={styles.navigation} aria-label="Navigazione lezioni">
        <Link href="/oggi">OGGI</Link><Link href="/lezioni">LEZIONI</Link><Link href="/menu">MENU</Link>
      </nav>
      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <label>CERCA <select aria-label="Cerca per" value={criterion} onChange={(event) => { setCriterion(event.target.value as HistoryCriterion); setQuery(""); }}>
            <option value="student">Studente</option><option value="subject">Materia</option><option value="period">Periodo</option>
          </select></label>
          <label>ORDINA <select aria-label="Ordina lezioni" value={order} onChange={(event) => setOrder(event.target.value as HistoryOrder)}>
            <option value="recent">Più recenti</option><option value="oldest">Più vecchie</option>
          </select></label>
        </div>
        <div className={styles.searchRow}>
          {criterion === "student" && <input aria-label="Nome dello studente" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome studente" />}
          {criterion === "subject" && <select aria-label="Materia" value={query} onChange={(event) => setQuery(event.target.value)}>
            <option value="">Tutte le materie</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>}
          {criterion === "period" && <div className={styles.period}>
            <label>Dal <input aria-label="Periodo dal" type="date" value={periodFrom} onChange={(event) => setPeriodFrom(event.target.value)} /></label>
            <label>Al <input aria-label="Periodo al" type="date" value={periodThrough} onChange={(event) => setPeriodThrough(event.target.value)} /></label>
          </div>}
        </div>
      </div>
      <section className={styles.workspace} aria-label="Lezioni svolte">
        <div className={styles.lessons} role="region" tabIndex={0} aria-label="Elenco delle lezioni svolte">
          {now && days.length === 0 && <p className={styles.empty}>Nessuna lezione nello storico</p>}
          {days.map(([date, lessons]) => <section key={date} className={styles.day} aria-label={formatDate(date)}>
            <h2>{formatDate(date)}</h2>
            {lessons.map((lesson) => <article key={lesson.occurrenceId} className={styles.lesson}>
              <p className={styles.mainLine}><span>{lesson.startTime}</span> <span>{lesson.studentNameSnapshot}</span></p>
              <p className={styles.subject}>{lesson.subject}</p>
              {coveredTopicOf(lesson) && <p className={styles.detail}>Argomento affrontato: <span>{coveredTopicOf(lesson)}</span></p>}
              {plannedTopicOf(lesson) && <p className={styles.detail}>Argomento previsto: <span>{plannedTopicOf(lesson)}</span></p>}
              {unclassifiedHistoricalTopicOf(lesson) && <p className={styles.detail}>Argomento storico non classificato: <span>{unclassifiedHistoricalTopicOf(lesson)}</span></p>}
              <p className={styles.detail}>Durata: <span>{lesson.durationMinutes} min</span> · Modalità: <span>{modeLabels[lesson.mode]}</span></p>
              <p className={styles.detail}>Pagamento: <span>{lessonPaymentLabel(lesson)}</span></p>
              <Link className={styles.openLesson} href={lessonEditorHref(lesson, "/lezioni/storico")} aria-label={`Apri lezione di ${lesson.studentNameSnapshot} del ${formatDate(date)} alle ${lesson.startTime}`}>APRI LEZIONE</Link>
            </article>)}
          </section>)}
        </div>
      </section>
    </div>
  </main>;
}
