"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";
import { addDays, formatLocalDate, isLocalDate, parseLocalDate, startOfLocalWeek, toLocalDate } from "../data/calendario/calendar-dates";
import { selectOccurrencesInRange } from "../data/calendario/calendar-selectors";
import { loadCalendarAppointments, loadCalendarSeries } from "../data/calendario/calendar-storage";
import type { CalendarAppointment, CalendarSeries } from "../data/calendario/calendar-types";
import { calendarSelectionHref, loadNewLessonDraft, returnToNewLessonHref, validSelectionToken } from "./nuova/lesson-selection";
import styles from "./month.module.css";

const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const weekdays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export default function MonthCalendar() {
  return <Suspense fallback={<main className={styles.page} />}><Month /></Suspense>;
}

function Month() {
  const router = useRouter();
  const search = useSearchParams();
  const rawToken = search.get("seleziona");
  const [selectionToken, setSelectionToken] = useState<string | undefined>();
  useEffect(() => { queueMicrotask(() => setSelectionToken(validSelectionToken(rawToken) && loadNewLessonDraft(rawToken) ? rawToken : undefined)); }, [rawToken]);
  const today = useMemo(() => toLocalDate(new Date()), []);
  const requested = search.get("data");
  const selected = isLocalDate(requested) ? requested : today;
  const parts = parseLocalDate(selected)!;
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);
  useEffect(() => { queueMicrotask(() => { setAppointments(loadCalendarAppointments()); setSeries(loadCalendarSeries()); }); }, []);

  const first = formatLocalDate({ year: parts.year, month: parts.month, day: 1 });
  const last = formatLocalDate({ year: parts.year, month: parts.month, day: new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate() });
  const start = startOfLocalWeek(first);
  const weekCount = Math.ceil((Math.round((Date.parse(`${last}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1) / 7);
  const dates = Array.from({ length: weekCount * 7 }, (_, i) => addDays(start, i));
  const counts = new Map<string, number>();
  for (const item of selectOccurrencesInRange(appointments, series, dates[0], dates[dates.length - 1])) {
    if (item.status !== "annullata") counts.set(item.date, (counts.get(item.date) ?? 0) + 1);
  }

  function shift(n: number) {
    const d = new Date(Date.UTC(parts.year, parts.month - 1 + n, 1));
    const target = formatLocalDate({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: 1 });
    router.push(selectionToken ? calendarSelectionHref("month", target, selectionToken) : `/calendario/mese?data=${target}`);
  }

  function viewHref(view: "month" | "week" | "day") {
    if (selectionToken) return calendarSelectionHref(view, selected, selectionToken);
    return view === "month" ? `/calendario/mese?data=${selected}`
      : `/calendario/${view === "week" ? "settimana" : "giorno"}?data=${selected}`;
  }

  return <main className={styles.page}>
    <div className={styles.sheet} style={{
      "--week-count": weekCount,
      "--calendar-height": `${weekCount * 44}px`,
      "--selection-extra": selectionToken ? "44px" : "0px",
    } as CSSProperties}>
      <Image src="/SfondoMeseCalendario.png" alt="" fill priority unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Calendario, vista mese</h1>

      <nav className={styles.views} aria-label="Viste del calendario">
        <Link href={viewHref("month")} aria-current="page">MESE</Link>
        <Link href={viewHref("week")}>SETTIMANA</Link>
        <Link href={viewHref("day")}>GIORNO</Link>
      </nav>

      <div className={styles.monthSelector}>
        <button type="button" onClick={() => shift(-1)} aria-label="Mese precedente">‹</button>
        <h2 aria-live="polite">{months[parts.month - 1]} {parts.year}</h2>
        <button type="button" onClick={() => shift(1)} aria-label="Mese successivo">›</button>
      </div>

      <section aria-label={`${months[parts.month - 1]} ${parts.year}`} className={styles.workspace}>
        <div className={styles.calendarContent}>
          {selectionToken && <Link href={returnToNewLessonHref(selectionToken)} className={styles.returnLink}>TORNA ALLA LEZIONE</Link>}
          <div className={styles.calendarGrid}>
            {weekdays.map(day => <span key={day} className={styles.weekday}>{day}</span>)}
            {dates.map(date => {
              const p = parseLocalDate(date)!;
              const count = counts.get(date) ?? 0;
              return <Link
                key={date}
                href={selectionToken ? calendarSelectionHref("day", date, selectionToken) : `/calendario/giorno?data=${date}&vista=mese`}
                aria-label={`${date}, ${count} ${count === 1 ? "lezione" : "lezioni"}`}
                aria-current={date === today ? "date" : undefined}
                className={`${styles.day} ${p.month !== parts.month ? styles.outside : ""} ${date === selected ? styles.selected : ""}`}
              >
                <span className={styles.dayNumber}>{p.day}</span>
                {count > 0 && <span className={styles.count} aria-hidden="true">{count > 3 ? count : "●".repeat(count)}</span>}
              </Link>;
            })}
          </div>
        </div>
      </section>
      <nav className={styles.bottomNavigation} aria-label="Navigazione della pagina">
        <Link href="/oggi">OGGI</Link>
        <Link href="/menu">MENU</Link>
      </nav>
    </div>
  </main>;
}
