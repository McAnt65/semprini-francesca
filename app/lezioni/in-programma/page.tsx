"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { addDays, toLocalDate, toLocalTime } from "../../data/calendario/calendar-dates";
import { groupOccurrencesByDate, selectOccurrencesInRange } from "../../data/calendario/calendar-selectors";
import { loadCalendarAppointments, loadCalendarSeries } from "../../data/calendario/calendar-storage";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries, LessonMode } from "../../data/calendario/calendar-types";
import { loadLessonLocation, type LessonLocation } from "../../data/lesson-location";
import { loadStoredStudents } from "../../data/student-storage";
import type { StudentRecord } from "../../data/students";
import { initialScheduleEnd, lessonEditorHref, selectProgrammedLessons } from "./upcoming-lessons";
import { buildTransferLinks, googleMapsRouteUrl, type TransferLink } from "./transfer-links";
import styles from "./in-programma.module.css";

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});
const currencyFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const modeLabels: Record<LessonMode, string> = {
  casa: "A casa", domicilio: "A domicilio", online: "Online",
};

function formatDate(date: string) {
  return dateFormatter.format(new Date(`${date}T12:00:00`));
}

function lessonPlace(lesson: CalendarOccurrence, students: StudentRecord[], location: LessonLocation | null) {
  if (lesson.mode === "online") return "Online";
  if (lesson.mode === "casa") {
    if (!location?.street.trim() || !location.city.trim()) return "Indirizzo non disponibile";
    return [
      [location.street.trim(), location.streetNumber.trim()].filter(Boolean).join(" "),
      [location.city.trim(), location.province.trim() ? `(${location.province.trim()})` : ""].filter(Boolean).join(" "),
      location.country.trim(),
    ].filter(Boolean).join(", ");
  }
  const student = students.find((item) => item.id === lesson.studentId);
  if (!student?.address.trim()) return "Indirizzo non disponibile";
  return [student.address.trim(), [student.city.trim(), student.province?.trim() ? `(${student.province.trim()})` : ""].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

function plannedAmount(lesson: CalendarOccurrence) {
  if (lesson.lessonAmountCents > 0) return currencyFormatter.format(lesson.lessonAmountCents / 100);
  if (lesson.paymentStatus === "non_dovuta" || lesson.hourlyRateCents <= 0 || lesson.durationMinutes <= 0) return null;
  return currencyFormatter.format(Math.round(lesson.hourlyRateCents * lesson.durationMinutes / 60) / 100);
}

function TransferNotice({ transfer }: { transfer: TransferLink }) {
  return <div className={styles.transfer}>
    <div className={styles.transferInterval}>
      <svg viewBox="0 0 32 22" width="18" height="14" fill="none" aria-hidden="true"><path d="M5 13.5h22l-2-6a3 3 0 0 0-2.8-2H9.8a3 3 0 0 0-2.8 2l-2 6Zm0 0H3v4h3m20-4h3v4h-3M9 17.5a2 2 0 1 0 4 0m8 0a2 2 0 1 0 4 0M9 10h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span>{transfer.kind === "first" ? "Dalla sede alla prima lezione" : `Intervallo disponibile: ${transfer.interval} min`}</span>
    </div>
    <a className={styles.routeLink} href={googleMapsRouteUrl(transfer.from, transfer.to)} target="_blank" rel="noopener noreferrer">APRI PERCORSO</a>
  </div>;
}

export default function UpcomingLessonsPage() {
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [location, setLocation] = useState<LessonLocation | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [extraYears, setExtraYears] = useState(0);

  useEffect(() => {
    function refresh() {
      setAppointments(loadCalendarAppointments());
      setSeries(loadCalendarSeries());
      setStudents(loadStoredStudents());
      setLocation(loadLessonLocation());
      setNow(new Date());
    }
    queueMicrotask(refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("storage", refresh); };
  }, []);

  const days = useMemo(() => {
    if (!now) return [];
    const today = toLocalDate(now);
    const through = addDays(initialScheduleEnd(appointments, series, today), extraYears * 365);
    const lessons = selectProgrammedLessons(appointments, series, today, toLocalTime(now), through);
    return [...groupOccurrencesByDate(lessons)];
  }, [appointments, series, now, extraYears]);

  const transfers = useMemo(() => {
    if (!location) return [];
    const firstIds = new Set<string>();
    for (const [date] of days) {
      const first = selectOccurrencesInRange(appointments, series, date, date)
        .filter((item) => item.status !== "annullata")
        .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
      if (first) firstIds.add(first.occurrenceId);
    }
    return buildTransferLinks(days, firstIds, students, location);
  }, [location, days, appointments, series, students]);
  const transferById = new Map(transfers.map((transfer) => [transfer.id, transfer]));
  const hasOpenSeries = series.some((item) =>
    !item.recurrence.endsOn && item.status !== "svolta" && item.status !== "annullata"
  );

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/SfondoInProgrammaLezioni.png" alt="" fill priority unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">In programma</h1>
      <nav className={styles.navigation} aria-label="Navigazione lezioni">
        <Link href="/oggi">OGGI</Link>
        <Link href="/lezioni">LEZIONI</Link>
        <Link href="/menu">MENU</Link>
      </nav>
      <section className={styles.workspace} aria-label="Lezioni future">
        <div className={styles.lessons} role="region" tabIndex={0} aria-label="Elenco delle lezioni future">
          {now && days.length === 0 && !hasOpenSeries && <p className={styles.empty}>Nessuna lezione in programma</p>}
          {days.map(([date, lessons]) => <section key={date} className={styles.day} aria-label={formatDate(date)}>
            <h2>{formatDate(date)}</h2>
            {transferById.get(`first:${lessons[0]?.occurrenceId}`) && <TransferNotice transfer={transferById.get(`first:${lessons[0]?.occurrenceId}`)!} />}
            {lessons.map((lesson, index) => {
              const next = lessons[index + 1];
              const transfer = next ? transferById.get(`${lesson.occurrenceId}>${next.occurrenceId}`) : undefined;
              return <Fragment key={lesson.occurrenceId}><article className={styles.lesson}>
                <p className={styles.mainLine}><span className={styles.time}>{lesson.startTime}</span> <span className={styles.student}>{lesson.studentNameSnapshot}</span></p>
                <p className={styles.subject}>{lesson.subject}</p>
                {lesson.topic && <p className={styles.detail}>Argomento: <span>{lesson.topic}</span></p>}
                <p className={styles.detail}><span>{lesson.durationMinutes} min</span> <span aria-hidden="true">·</span> <span>{modeLabels[lesson.mode]}</span></p>
                <p className={styles.meta}>Dove: <span>{lessonPlace(lesson, students, location)}</span></p>
                {plannedAmount(lesson) && <p className={styles.meta}>Tariffa: <span>{plannedAmount(lesson)}</span></p>}
                <Link className={styles.openLesson} href={lessonEditorHref(lesson)} aria-label={`Apri lezione di ${lesson.studentNameSnapshot} del ${formatDate(date)} alle ${lesson.startTime}`}>APRI LEZIONE</Link>
              </article>
                {transfer && <TransferNotice transfer={transfer} />}
              </Fragment>;
            })}
          </section>)}
          {now && hasOpenSeries && <button className={styles.more} type="button" onClick={() => setExtraYears((years) => years + 1)}>MOSTRA ALTRE LEZIONI</button>}
        </div>
      </section>
    </div>
  </main>;
}
