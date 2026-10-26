"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";
import { addDays, isLocalDate, parseLocalDate, startOfLocalWeek, toLocalDate } from "../../data/calendario/calendar-dates";
import { selectWeekOccurrences } from "../../data/calendario/calendar-selectors";
import { loadCalendarAppointments, loadCalendarSeries } from "../../data/calendario/calendar-storage";
import type { CalendarAppointment, CalendarSeries } from "../../data/calendario/calendar-types";
import { lessonEditHref } from "../lesson-navigation";
import { calendarSelectionHref, loadNewLessonDraft, returnToNewLessonHref, validSelectionToken } from "../nuova/lesson-selection";
import styles from "./week.module.css";

const months = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const weekdays = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export default function WeekPage() {
  return <Suspense fallback={<main className={styles.page} />}><Week /></Suspense>;
}

function Week() {
  const router = useRouter();
  const search = useSearchParams();
  const rawToken = search.get("seleziona");
  const [selectionToken, setSelectionToken] = useState<string | undefined>();
  useEffect(() => {
    queueMicrotask(() => setSelectionToken(validSelectionToken(rawToken) && loadNewLessonDraft(rawToken) ? rawToken : undefined));
  }, [rawToken]);

  const today = useMemo(() => toLocalDate(new Date()), []);
  const requested = search.get("data");
  const selected = isLocalDate(requested) ? requested : today;
  const start = startOfLocalWeek(selected);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(start, index)), [start]);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);
  useEffect(() => {
    queueMicrotask(() => {
      setAppointments(loadCalendarAppointments());
      setSeries(loadCalendarSeries());
    });
  }, []);

  const occurrences = useMemo(() => selectWeekOccurrences(appointments, series, selected), [appointments, series, selected]);
  const a = parseLocalDate(start)!;
  const b = parseLocalDate(dates[6])!;
  const title = a.month === b.month
    ? a.day + " – " + b.day + " " + months[b.month - 1] + " " + b.year
    : a.day + " " + months[a.month - 1] + " – " + b.day + " " + months[b.month - 1] + " " + b.year;

  function viewHref(view: "month" | "week" | "day") {
    if (selectionToken) return calendarSelectionHref(view, selected, selectionToken);
    const path = view === "month" ? "mese" : view === "week" ? "settimana" : "giorno";
    return "/calendario/" + path + "?data=" + selected;
  }

  function shift(days: number) {
    const target = addDays(start, days);
    router.push(selectionToken ? calendarSelectionHref("week", target, selectionToken) : "/calendario/settimana?data=" + target);
  }

  return <main className={styles.page}>
    <div className={styles.sheet} style={{ "--selection-extra": selectionToken ? "44px" : "0px" } as CSSProperties}>
      <Image src="/SfondoSettimanaCalendario.png" alt="" fill priority unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Calendario, vista settimana</h1>

      <nav className={styles.views} aria-label="Viste del calendario">
        <Link href={viewHref("month")}>MESE</Link>
        <Link href={viewHref("week")} aria-current="page">SETTIMANA</Link>
        <Link href={viewHref("day")}>GIORNO</Link>
      </nav>

      <div className={styles.weekSelector}>
        <button type="button" onClick={() => shift(-7)} aria-label="Settimana precedente">‹</button>
        <h2 aria-live="polite">{title}</h2>
        <button type="button" onClick={() => shift(7)} aria-label="Settimana successiva">›</button>
      </div>

      {selectionToken && <Link href={returnToNewLessonHref(selectionToken)} className={styles.returnLink}>TORNA ALLA LEZIONE</Link>}

      <section key={start} aria-label={"Appuntamenti dal " + dates[0] + " al " + dates[6]} className={styles.appointments}>
        {dates.map((date, index) => {
          const parts = parseLocalDate(date)!;
          const lessons = occurrences.filter((item) => item.date === date).sort((first, second) => first.startTime.localeCompare(second.startTime));
          const count = lessons.filter((item) => item.status !== "annullata").length;
          const dayHref = selectionToken ? calendarSelectionHref("day", date, selectionToken) : "/calendario/giorno?data=" + date + "&vista=settimana";
          const dayLabel = weekdays[index] + " " + parts.day + " " + months[parts.month - 1];
          return <div key={date} className={styles.day}>
            <Link href={dayHref} className={styles.dayHeading} aria-current={date === today ? "date" : undefined} aria-label={dayLabel + ", " + count + (count === 1 ? " lezione" : " lezioni")}>
              <span>{dayLabel}</span>
              <span className={styles.count}>{count} {count === 1 ? "lezione" : "lezioni"}</span>
            </Link>
            {lessons.length === 0
              ? <p className={styles.empty}>Nessuna lezione</p>
              : lessons.map((item) => {
                const content = <>
                  <span className={styles.time}>{item.startTime}</span>
                  <span className={styles.lessonDescription}>
                    <span>{item.studentNameSnapshot} · {item.subject}</span>
                    <span className={styles.lessonMeta}>
                      <span>{item.durationMinutes} min ·</span>
                      <span className={item.status === "svolta" ? styles.completedStatus : undefined}>{item.status}</span>
                      {item.isRecurring && <span>· ricorrente</span>}
                      {item.isException && <span>· eccezione</span>}
                    </span>
                  </span>
                </>;
                return selectionToken
                  ? <div key={item.occurrenceId} className={styles.lesson}>{content}</div>
                  : <Link key={item.occurrenceId} href={lessonEditHref(item, "/calendario/settimana?data=" + selected)} className={styles.lesson} aria-label={"Apri " + item.studentNameSnapshot + ", " + date + " alle " + item.startTime + ", " + item.status}>{content}</Link>;
              })}
          </div>;
        })}
      </section>

      <nav className={styles.bottomNavigation} aria-label="Navigazione della pagina">
        <Link href="/oggi">OGGI</Link>
        <Link href="/menu">MENU</Link>
      </nav>
    </div>
  </main>;
}
