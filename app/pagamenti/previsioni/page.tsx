"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { startOfLocalMonth, toLocalDate, toLocalTime } from "../../data/calendario/calendar-dates";
import { CALENDAR_APPOINTMENTS_STORAGE_KEY, CALENDAR_SERIES_STORAGE_KEY, loadCalendarAppointments, loadCalendarSeries } from "../../data/calendario/calendar-storage";
import type { CalendarAppointment, CalendarSeries, LocalDate, LocalTime } from "../../data/calendario/calendar-types";
import { selectForecastMonths, shiftForecastMonth, type ForecastTotals } from "./forecast-model";
import shared from "../payment-interior.module.css";
import styles from "./previsioni.module.css";

const euro = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
const monthLabel = (month: LocalDate) => new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" })
  .format(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1));
const hoursLabel = (minutes: number) => minutes % 60
  ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes / 60} h`;

function Amounts({ totals }: { totals: ForecastTotals }) {
  return <dl className={styles.amounts}>
    <div><dt>Valore previsto</dt><dd>{euro(totals.valueCents)}</dd></div>
    <div><dt>Già versato</dt><dd>{euro(totals.paidCents)}</dd></div>
    <div><dt>Da ricevere</dt><dd>{euro(totals.outstandingCents)}</dd></div>
  </dl>;
}

export default function ForecastPage() {
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);
  const [clock, setClock] = useState<{ today: LocalDate; time: LocalTime } | null>(null);
  const [firstMonth, setFirstMonth] = useState<LocalDate>("");
  const [selectedMonth, setSelectedMonth] = useState<LocalDate>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    function refresh() {
      const now = new Date();
      const today = toLocalDate(now);
      const currentMonth = startOfLocalMonth(today);
      setClock({ today, time: toLocalTime(now) });
      setAppointments(loadCalendarAppointments());
      setSeries(loadCalendarSeries());
      setFirstMonth((current) => !current || current < currentMonth ? currentMonth : current);
      setSelectedMonth((current) => current && current < currentMonth ? "" : current);
      setLoaded(true);
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CALENDAR_APPOINTMENTS_STORAGE_KEY ||
        event.key === CALENDAR_SERIES_STORAGE_KEY) refresh();
    };
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    queueMicrotask(refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const months = useMemo(() => clock && firstMonth
    ? selectForecastMonths(appointments, series, firstMonth, clock.today, clock.time)
    : [], [appointments, series, firstMonth, clock]);
  const currentMonth = clock ? startOfLocalMonth(clock.today) : "";

  function shiftWindow(offset: number) {
    if (!firstMonth) return;
    const next = shiftForecastMonth(firstMonth, offset);
    if (next < currentMonth) return;
    setFirstMonth(next);
    setSelectedMonth("");
  }

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/SfondoPrevisioniPagamenti.png" alt="" fill priority unoptimized
        sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Previsioni pagamenti</h1>
      <nav className={`${shared.navigation} ${styles.topLinks}`} aria-label="Navigazione principale">
        <Link href="/oggi">OGGI</Link>
        <Link href="/pagamenti">← PAGAMENTI</Link>
        <Link href="/menu">MENU</Link>
      </nav>
      <section className={styles.workspace} aria-label="Previsioni mensili">
        <div className={styles.windowControl}>
          <button type="button" aria-label="Mese iniziale precedente" disabled={!firstMonth || firstMonth <= currentMonth}
            onClick={() => shiftWindow(-1)}>‹</button>
          <p aria-live="polite">{months.length
            ? `${monthLabel(months[0].month)} – ${monthLabel(months[5].month)}` : "Caricamento…"}</p>
          <button type="button" aria-label="Mese iniziale successivo" disabled={!firstMonth}
            onClick={() => shiftWindow(1)}>›</button>
        </div>
        <p className={styles.explanation}>Solo lezioni future confermate. Il già versato si riferisce a queste lezioni.</p>
        {loaded && months.map((month) => {
          const expanded = selectedMonth === month.month;
          return <article key={month.month} className={styles.month}>
            <button type="button" className={styles.monthHeading} aria-expanded={expanded}
              onClick={() => setSelectedMonth(expanded ? "" : month.month)}>
              <strong>{monthLabel(month.month)}</strong>
              <span>{month.lessonCount} {month.lessonCount === 1 ? "lezione" : "lezioni"} · {hoursLabel(month.durationMinutes)}</span>
              <span aria-hidden="true">{expanded ? "−" : "+"}</span>
            </button>
            <Amounts totals={month} />
            {expanded && <section className={styles.details} aria-label={`Studenti di ${monthLabel(month.month)}`}>
              {month.students.length === 0
                ? <p className={styles.empty}>Nessuna lezione futura confermata in questo mese.</p>
                : month.students.map((student) => <div key={student.studentId} className={styles.student}>
                  <h2>{student.name}</h2>
                  <p>{student.lessonCount} {student.lessonCount === 1 ? "lezione" : "lezioni"} · {hoursLabel(student.durationMinutes)}</p>
                  <Amounts totals={student} />
                </div>)}
            </section>}
          </article>;
        })}
      </section>
    </div>
  </main>;
}
