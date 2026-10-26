"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadStoredStudents } from "../../data/student-storage";
import { students, type StudentRecord } from "../../data/students";
import { loadCalendarAppointments, loadCalendarSeries } from "../../data/calendario/calendar-storage";
import { coveredTopicOf, plannedTopicOf, unclassifiedHistoricalTopicOf } from "../../data/calendario/calendar-topics";
import { selectOccurrencesInRange } from "../../data/calendario/calendar-selectors";
import { toLocalDate } from "../../data/calendario/calendar-dates";
import type { CalendarOccurrence } from "../../data/calendario/calendar-types";
import { lessonEditHref } from "../../calendario/lesson-navigation";
import { fullName } from "../student-utils";
import styles from "./diario.module.css";

function lessonDate(date: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}

export default function StudentDiary({ studentId }: { studentId?: string }) {
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [allLessons, setAllLessons] = useState<CalendarOccurrence[]>([]);
  const [selectedId, setSelectedId] = useState(studentId ?? "");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = loadStoredStudents();
    const storedIds = new Set(stored.map((student) => student.id));
    const available = [...stored, ...students.filter((student) => !storedIds.has(student.id))];
    const appointments = loadCalendarAppointments();
    const series = loadCalendarSeries();
    const today = toLocalDate(new Date());
    const firstDate = [...appointments.map((item) => item.date), ...series.map((item) => item.startsOn)]
      .filter((date) => date <= today).sort()[0];
    const lessons = firstDate
      ? selectOccurrencesInRange(appointments, series, firstDate, today)
        .filter((item) => item.status === "svolta")
      : [];
    const requestedId = studentId ?? new URLSearchParams(window.location.search).get("id") ?? "";
    queueMicrotask(() => {
      setRecords(available);
      setAllLessons(lessons);
      setSelectedId(requestedId);
      setReady(true);
    });
  }, [studentId]);

  const student = records.find((record) => record.id === selectedId);
  const lessons = useMemo(() => allLessons
    .filter((item) => item.studentId === selectedId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)),
  [allLessons, selectedId]);

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/SfondoDiarioStudenti.png" alt="" fill priority unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Diario Studenti</h1>
      <nav className={styles.navigation} aria-label="Navigazione Diario Studenti">
        <Link href="/oggi">OGGI</Link>
        {student
          ? <Link href={`/studenti/${encodeURIComponent(student.id)}`}>CARD STUDENTE</Link>
          : <span aria-disabled="true">CARD STUDENTE</span>}
        <Link href="/menu">MENU</Link>
      </nav>
      <section className={styles.workspace} aria-label="Annotazioni delle lezioni">
        <div className={styles.studentHeader}>
          {student ? <>
            <h2>{fullName(student)}</h2>
            <Link href="/studenti/diario" onClick={() => setSelectedId("")}>CAMBIA STUDENTE</Link>
          </> : <>
            <label htmlFor="diary-student">SCEGLI STUDENTE</label>
            <select id="diary-student" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              <option value="">Seleziona uno studente</option>
              {records.map((record) => <option key={record.id} value={record.id}>{fullName(record)}</option>)}
            </select>
          </>}
        </div>
        <div className={styles.lessons} role="region" tabIndex={0} aria-label="Lezioni dello studente">
          {ready && selectedId && !student && <p className={styles.empty}>Studente non trovato. Seleziona uno studente.</p>}
          {ready && student && lessons.length === 0 && <p className={styles.empty}>Nessuna lezione svolta registrata per {fullName(student)}.</p>}
          {lessons.map((lesson) => <article key={lesson.occurrenceId} className={styles.lesson}>
            <h3><span>{lessonDate(lesson.date)}</span>{lesson.subject && <span>{lesson.subject}</span>}</h3>
            {coveredTopicOf(lesson) && <p><span className={styles.label}>Argomento affrontato</span>{coveredTopicOf(lesson)}</p>}
            {plannedTopicOf(lesson) && <p><span className={styles.label}>Argomento previsto</span>{plannedTopicOf(lesson)}</p>}
            {unclassifiedHistoricalTopicOf(lesson) && <p><span className={styles.label}>Argomento storico non classificato</span>{unclassifiedHistoricalTopicOf(lesson)}</p>}
            {lesson.notes && <p><span className={styles.label}>Annotazioni</span>{lesson.notes}</p>}
            <Link href={lessonEditHref(lesson, studentId ? `/studenti/${encodeURIComponent(studentId)}/lezioni` : `/studenti/diario?id=${encodeURIComponent(selectedId)}`)} aria-label={`Apri la lezione del ${lessonDate(lesson.date)}`} className={styles.openLesson}>APRI LEZIONE</Link>
          </article>)}
        </div>
      </section>
    </div>
  </main>;
}
