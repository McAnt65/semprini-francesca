"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toLocalDate, toLocalTime } from "../../data/calendario/calendar-dates";
import { CALENDAR_APPOINTMENTS_STORAGE_KEY, CALENDAR_SERIES_STORAGE_KEY,
  loadCalendarAppointments, loadCalendarSeries } from "../../data/calendario/calendar-storage";
import type { CalendarAppointment, CalendarSeries, LocalDate, LocalTime } from "../../data/calendario/calendar-types";
import { selectPaymentStatistics, shiftStatisticsPeriod,
  type LessonStatistics, type StatisticsPeriod } from "./statistics-model";
import shared from "../payment-interior.module.css";
import styles from "./statistiche.module.css";

const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const modeLabels = { casa: "A casa / studio", domicilio: "A domicilio", online: "Online" } as const;
const euro = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
const minutesLabel = (minutes: number) => minutes % 60
  ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes / 60} h`;
const periodLabel = (period: StatisticsPeriod) => period.month === null
  ? `Intero anno ${period.year}` : `${months[period.month - 1]} ${period.year}`;

function LedgerFigures({ totals, compact = false }: { totals: LessonStatistics; compact?: boolean }) {
  return <dl className={compact ? styles.studentFigures : styles.figures}>
    <div><dt>Valore lezioni</dt><dd>{euro(totals.valueCents)}</dd></div>
    <div><dt>Versato attribuito</dt><dd>{euro(totals.paidAttributedCents)}</dd></div>
    <div><dt>Residuo dovuto</dt><dd>{euro(totals.outstandingCents)}</dd></div>
  </dl>;
}

export default function StatisticsPage() {
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);
  const [clock, setClock] = useState<{ today: LocalDate; time: LocalTime } | null>(null);
  const [period, setPeriod] = useState<StatisticsPeriod | null>(null);
  const [studentId, setStudentId] = useState("");

  useEffect(() => {
    function refresh() {
      const now = new Date();
      setClock({ today: toLocalDate(now), time: toLocalTime(now) });
      setPeriod((current) => current ?? { year: now.getFullYear(), month: now.getMonth() + 1 });
      setAppointments(loadCalendarAppointments());
      setSeries(loadCalendarSeries());
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

  const statistics = useMemo(() => clock && period
    ? selectPaymentStatistics(appointments, series, period, clock.today, clock.time) : null,
  [appointments, series, period, clock]);
  const selectedStudent = statistics?.students.find((student) => student.studentId === studentId);

  function movePeriod(offset: number) {
    setPeriod((current) => current ? shiftStatisticsPeriod(current, offset) : current);
    setStudentId("");
  }

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/SfondoStatistichePagamenti.png" alt="" fill priority unoptimized
        sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Statistiche pagamenti</h1>
      <nav className={`${shared.navigation} ${styles.topLinks}`} aria-label="Navigazione principale">
        <Link href="/oggi">OGGI</Link>
        <Link href="/pagamenti">← PAGAMENTI</Link>
        <Link href="/menu">MENU</Link>
      </nav>
      <div className={styles.workspace}>
        {period && statistics ? <>
          <div className={styles.periodNav}>
            <button type="button" aria-label="Periodo precedente" disabled={period.year <= 1 && (period.month === null || period.month === 1)}
              onClick={() => movePeriod(-1)}>‹</button>
            <p aria-live="polite">{periodLabel(period)}</p>
            <button type="button" aria-label="Periodo successivo" disabled={period.year >= 9999 && (period.month === null || period.month === 12)}
              onClick={() => movePeriod(1)}>›</button>
          </div>
          <div className={styles.periodFields}>
            <label>Mese
              <select value={period.month ?? "anno"} onChange={(event) => {
                setPeriod({ ...period, month: event.target.value === "anno" ? null : Number(event.target.value) });
                setStudentId("");
              }}>
                <option value="anno">Intero anno</option>
                {months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
              </select>
            </label>
            <label>Anno
              <input type="number" min="1" max="9999" value={period.year} onChange={(event) => {
                const year = Number(event.target.value);
                if (Number.isInteger(year) && year >= 1 && year <= 9999) {
                  setPeriod({ ...period, year });
                  setStudentId("");
                }
              }} />
            </label>
          </div>

          <section className={styles.section} aria-labelledby="activity-heading">
            <h2 id="activity-heading">Attività didattica</h2>
            <dl className={styles.metrics}>
              <div><dt>Lezioni svolte</dt><dd>{statistics.lessonCount}</dd></div>
              <div><dt>Ore insegnate</dt><dd>{minutesLabel(statistics.durationMinutes)}</dd></div>
              <div><dt>Durata media</dt><dd>{statistics.lessonCount ? `${Math.round(statistics.durationMinutes / statistics.lessonCount)} min` : "—"}</dd></div>
              <div><dt>Studenti coinvolti</dt><dd>{statistics.students.length}</dd></div>
            </dl>
            <h3>Materie</h3>
            {statistics.subjects.length ? <ul className={styles.rows}>{statistics.subjects.map((subject) =>
              <li key={subject.name}><span>{subject.name}</span><strong>{subject.count}</strong></li>)}</ul>
              : <p className={styles.empty}>Nessuna lezione svolta nel periodo.</p>}
            <h3>Modalità</h3>
            <ul className={styles.rows}>{(Object.keys(modeLabels) as Array<keyof typeof modeLabels>).map((mode) =>
              <li key={mode}><span>{modeLabels[mode]}</span><strong>{statistics.modes[mode]}</strong></li>)}</ul>
          </section>

          <section className={styles.section} aria-labelledby="economy-heading">
            <h2 id="economy-heading">Situazione economica</h2>
            <LedgerFigures totals={statistics} />
            <dl className={styles.metrics}>
              <div><dt>Incassi nel periodo</dt><dd>{euro(statistics.receivedCents)}</dd></div>
              <div><dt>Media per lezione</dt><dd>{statistics.lessonCount ? euro(Math.round(statistics.valueCents / statistics.lessonCount)) : "—"}</dd></div>
              <div><dt>Valore medio per ora</dt><dd>{statistics.durationMinutes ? euro(Math.round(statistics.valueCents * 60 / statistics.durationMinutes)) : "—"}</dd></div>
            </dl>
            <p className={styles.note}>Gli incassi seguono la data dei pagamenti; valore e versato attribuito seguono le lezioni svolte.</p>
            {statistics.invalidLedgerIds.length > 0 && <p className={styles.warning} role="status">
              {statistics.invalidLedgerIds.length} registrazioni di pagamento da verificare: gli incassi potrebbero essere incompleti.
            </p>}
          </section>

          <section className={styles.section} aria-labelledby="student-heading">
            <h2 id="student-heading">Per studente</h2>
            {statistics.students.length ? <>
              <label className={styles.studentFilter}>Studente
                <select value={selectedStudent?.studentId ?? ""} onChange={(event) => setStudentId(event.target.value)}>
                  <option value="">Tutti gli studenti</option>
                  {statistics.students.map((student) => <option key={student.studentId} value={student.studentId}>{student.name}</option>)}
                </select>
              </label>
              {(selectedStudent ? [selectedStudent] : statistics.students).map((student) => <article key={student.studentId} className={styles.student}>
                <h3>{student.name}</h3>
                <p>{student.lessonCount} {student.lessonCount === 1 ? "lezione" : "lezioni"} · {minutesLabel(student.durationMinutes)}</p>
                <LedgerFigures totals={student} compact />
              </article>)}
            </> : <p className={styles.empty}>Nessuno studente con lezioni svolte nel periodo.</p>}
          </section>

          <section className={styles.section} aria-labelledby="travel-heading">
            <h2 id="travel-heading">Trasferimenti</h2>
            <dl className={styles.metrics}>
              <div><dt>Lezioni a domicilio</dt><dd>{statistics.modes.domicilio}</dd></div>
              <div><dt>Tempo indicato</dt><dd>{statistics.lessonsWithTravelMinutes
                ? minutesLabel(statistics.travelMinutesRecorded) : "Non registrato"}</dd></div>
              <div><dt>Chilometri percorsi</dt><dd>{statistics.kilometersRecorded ?? "Non ancora registrati"}</dd></div>
              <div><dt>Spese di trasferta</dt><dd>{statistics.travelExpenseCents === null
                ? "Non ancora registrate" : euro(statistics.travelExpenseCents)}</dd></div>
            </dl>
            <p className={styles.note}>Il tempo indicato riguarda {statistics.lessonsWithTravelMinutes} lezioni ed è una stima annotata, non una distanza o una misura dei viaggi effettivi.</p>
          </section>
        </> : <p className={styles.empty}>Caricamento statistiche…</p>}
      </div>
    </div>
  </main>;
}
