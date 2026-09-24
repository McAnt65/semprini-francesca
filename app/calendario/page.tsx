"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  formatLocalDate,
  parseLocalDate,
  startOfLocalWeek,
  toLocalDate,
  toLocalTime,
} from "../data/calendario/calendar-dates";
import {
  selectDayOccurrences,
  selectOccurrencesInRange,
} from "../data/calendario/calendar-selectors";
import {
  loadCalendarMonthlyNote,
  saveCalendarMonthlyNote,
} from "../data/calendario/calendar-monthly-notes";
import {
  loadCalendarAppointments,
  loadCalendarSeries,
} from "../data/calendario/calendar-storage";
import type {
  CalendarAppointment,
  CalendarSeries,
  LessonMode,
  LessonStatus,
  LocalDate,
} from "../data/calendario/calendar-types";

const MONTH_NAMES = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
] as const;

const STATUS_ORDER: LessonStatus[] = [
  "confermata",
  "attesa",
  "richiesta",
  "annullata",
];

const STATUS_COLORS: Record<LessonStatus, string> = {
  confermata: "bg-[#3f9a78]",
  attesa: "bg-[#d99a18]",
  richiesta: "bg-[#3078c6]",
  annullata: "bg-[#ac4a4c]",
};

const MODE_LABELS: Record<LessonMode, string> = {
  casa: "Casa",
  domicilio: "A domicilio",
  online: "Online",
};

interface VisibleDay {
  date: LocalDate;
  dayNumber: number;
  belongsToMonth: boolean;
}

export default function CalendarMonthPage() {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => toLocalDate(now), [now]);
  const [visibleMonth, setVisibleMonth] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }));
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);
  const [monthlyNote, setMonthlyNote] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setAppointments(loadCalendarAppointments());
      setSeries(loadCalendarSeries());
    });
  }, []);

  const days = useMemo(
    () => buildVisibleDays(visibleMonth.year, visibleMonth.month),
    [visibleMonth]
  );

  const visibleMonthKey = `${visibleMonth.year}-${visibleMonth.month
    .toString()
    .padStart(2, "0")}`;

  useEffect(() => {
    queueMicrotask(() => {
      setMonthlyNote(loadCalendarMonthlyNote(visibleMonthKey));
    });
  }, [visibleMonthKey]);

  const occurrencesByDate = useMemo(() => {
    const firstDay = days[0]?.date;
    const lastDay = days.at(-1)?.date;
    const grouped = new Map<LocalDate, Set<LessonStatus>>();
    if (!firstDay || !lastDay) return grouped;

    const occurrences = selectOccurrencesInRange(
      appointments,
      series,
      firstDay,
      lastDay
    );

    for (const occurrence of occurrences) {
      const statuses = grouped.get(occurrence.date) ?? new Set<LessonStatus>();
      statuses.add(occurrence.status);
      grouped.set(occurrence.date, statuses);
    }

    return grouped;
  }, [appointments, days, series]);

  const todaySummary = useMemo(
    () => buildTodaySummary(appointments, series, today, toLocalTime(now)),
    [appointments, now, series, today]
  );

  function changeMonth(amount: number) {
    setVisibleMonth((current) => {
      const index = current.year * 12 + current.month - 1 + amount;
      return {
        year: Math.floor(index / 12),
        month: ((index % 12) + 12) % 12 + 1,
      };
    });
  }

  const selectedDate = formatLocalDate({
    year: visibleMonth.year,
    month: visibleMonth.month,
    day: 1,
  });

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce] text-[#4b3024]">
      <div className="mx-auto w-full max-w-[430px] sm:py-3">
        <div className="relative aspect-[941/1672] w-full min-h-dvh sm:min-h-0 overflow-hidden bg-[#f4e7cf] sm:rounded-[28px]">
          <Image
            src="/calendar-month-new-lesson-bg.png"
            alt="Calendario mensile illustrato"
            fill
            priority
            unoptimized
            sizes="(max-width: 430px) 100vw, 430px"
            className="pointer-events-none select-none object-fill"
          />

          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Indietro"
            className="antique-clickable absolute left-[4.2%] top-[0.7%] z-30 h-[4.4%] w-[19%] rounded-[12px] bg-transparent"
          />
          <Link
            href="/menu"
            aria-label="Torna al menù"
            className="antique-clickable absolute right-[4.1%] top-[0.7%] z-30 h-[4.4%] w-[19%] rounded-[12px] bg-transparent"
          />
          <Link
            href={`/calendario/nuova?data=${visibleMonthKey === today.slice(0, 7) ? today : selectedDate}`}
            aria-label="Nuova lezione"
            className="antique-clickable absolute right-[2.7%] top-[5.3%] z-30 h-[11.7%] w-[26%] bg-transparent"
          />

          <Link
            href="/calendario"
            aria-label="Vista mese"
            aria-current="page"
            className="antique-clickable absolute left-[11.5%] top-[17.5%] z-30 h-[5.2%] w-[23.6%] rounded-[12px] bg-transparent"
          />
          <Link
            href={`/calendario/settimana?data=${visibleMonthKey === today.slice(0, 7) ? today : selectedDate}`}
            aria-label="Vista settimana"
            className="antique-clickable absolute left-[37.5%] top-[17.5%] z-30 h-[5.2%] w-[24%] rounded-[12px] bg-transparent"
          />
          <Link
            href={`/calendario/giorno?data=${selectedDate}`}
            aria-label="Vista giorno"
            className="antique-clickable absolute left-[63.1%] top-[17.5%] z-30 h-[5.2%] w-[23.2%] rounded-[12px] bg-transparent"
          />

          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="Mese precedente"
            className="antique-clickable absolute left-[11.6%] top-[25.3%] z-30 h-[4.5%] w-[8.5%] rounded-full bg-transparent"
          />
          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label="Mese successivo"
            className="antique-clickable absolute right-[11.7%] top-[25.3%] z-30 h-[4.5%] w-[8.5%] rounded-full bg-transparent"
          />

          <h1
            aria-live="polite"
            className="pointer-events-none absolute left-[23%] top-[24.85%] z-20 w-[54%] text-center font-entry-elegant text-[clamp(15px,4.4vw,22px)] font-semibold text-[#6f2638]"
          >
            {MONTH_NAMES[visibleMonth.month - 1]} {visibleMonth.year}
          </h1>

          <section
            aria-label={`${MONTH_NAMES[visibleMonth.month - 1]} ${visibleMonth.year}`}
            className="absolute left-[6.70%] top-[33.85%] z-20 grid h-[27.09%] w-[81.40%] grid-cols-7 grid-rows-[repeat(6,minmax(0,1fr))]"
          >
            {days.map((day) => {
              const statuses = occurrencesByDate.get(day.date);
              const isToday = day.date === today;

              return (
                <Link
                  key={day.date}
                  href={`/calendario/giorno?data=${day.date}`}
                  aria-label={`Apri il giorno ${day.date}`}
                  aria-current={isToday ? "date" : undefined}
                  className={`relative min-w-0 ${
                    day.belongsToMonth ? "opacity-100" : "opacity-35"
                  } ${
                    isToday
                      ? "bg-[#8b2438]/12 ring-1 ring-inset ring-[#8b2438]/35"
                      : ""
                  }`}
                >
                  <span
                    className={`absolute left-1/2 top-[54%] flex aspect-square w-[36%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-entry-elegant text-[clamp(12px,3.4vw,17px)] leading-none ${
                      isToday
                        ? "font-semibold text-[#a5142b]"
                        : "text-[#4b3024]"
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {statuses && statuses.size > 0 && (
                    <span
                      className="absolute left-1/2 top-[70%] flex max-w-[82%] -translate-x-1/2 flex-wrap justify-center gap-[3px]"
                      aria-label={statusLabel(statuses)}
                    >
                      {STATUS_ORDER.filter((status) => statuses.has(status)).map(
                        (status) => (
                          <span
                            key={status}
                            className={`h-[clamp(4px,1.35vw,6px)] w-[clamp(4px,1.35vw,6px)] rounded-full shadow-[0_1px_2px_rgba(74,45,29,0.18)] ${STATUS_COLORS[status]}`}
                          />
                        )
                      )}
                    </span>
                  )}
                </Link>
              );
            })}
          </section>

          <textarea
            aria-label={`Appunti di ${MONTH_NAMES[visibleMonth.month - 1]} ${visibleMonth.year}`}
            value={monthlyNote}
            maxLength={4_000}
            onChange={(event) => {
              const value = event.target.value;
              setMonthlyNote(value);
              saveCalendarMonthlyNote(visibleMonthKey, value);
            }}
            spellCheck
            className="absolute left-[8.8%] top-[71.6%] z-20 h-[14.8%] w-[33.2%] resize-none overflow-y-auto border-0 bg-transparent px-[1%] py-[0.5%] font-entry-elegant text-[clamp(10px,2.75vw,14px)] leading-[1.75] text-[#5a3a2a] outline-none placeholder:text-[#765744]/45"
          />

          <section
            aria-label="Riepilogo di oggi"
            className="absolute left-[53.4%] top-[71.7%] z-20 h-[13.7%] w-[30.8%] overflow-y-auto px-[0.8%] py-[0.4%] text-center font-entry-elegant text-[clamp(8px,2.25vw,11px)] leading-[1.38] text-[#563728]"
          >
            {todaySummary.lessonCount === 0 ? (
              <p className="mt-[8%] text-[clamp(9px,2.5vw,12px)] italic leading-[1.5]">
                Nessuna lezione programmata
              </p>
            ) : (
              <>
                <p className="font-semibold">
                  {todaySummary.lessonCount} {todaySummary.lessonCount === 1 ? "lezione" : "lezioni"}
                  {" · "}{formatDuration(todaySummary.totalMinutes)}
                </p>
                <p>{todaySummary.modeSummary}</p>
                {todaySummary.pendingRequests > 0 && (
                  <p>Richieste in attesa: {todaySummary.pendingRequests}</p>
                )}
              </>
            )}

            {todaySummary.nextOccurrence && (
              <div className="mt-[4%] border-t border-[#8a6546]/25 pt-[4%]">
                <p className="font-semibold text-[#76283a]">
                  {todaySummary.nextOccurrence.date === today
                    ? "Prossima lezione"
                    : `Prossima · ${formatShortDate(todaySummary.nextOccurrence.date)}`}
                </p>
                <p>
                  {todaySummary.nextOccurrence.startTime} · {todaySummary.nextOccurrence.studentNameSnapshot}
                </p>
                <p>
                  {todaySummary.nextOccurrence.subject} · {MODE_LABELS[todaySummary.nextOccurrence.mode]}
                </p>
              </div>
            )}
          </section>

          <nav aria-label="Navigazione principale" className="absolute inset-x-[1.8%] bottom-[1.65%] z-30 h-[9.4%]">
            <Link href="/studenti" aria-label="Studenti" className="antique-clickable absolute inset-y-0 left-0 w-[20%] rounded-[12px] bg-transparent" />
            <Link href="/calendario" aria-label="Calendario" aria-current="page" className="antique-clickable absolute inset-y-0 left-[20%] w-[20%] rounded-[12px] bg-transparent" />
            <Link href="/materie" aria-label="Materie" className="antique-clickable absolute inset-y-0 left-[40%] w-[20%] rounded-[12px] bg-transparent" />
            <Link href="/libri" aria-label="Libri" className="antique-clickable absolute inset-y-0 left-[60%] w-[20%] rounded-[12px] bg-transparent" />
            <Link href="/menu" aria-label="Menu" className="antique-clickable absolute inset-y-0 left-[80%] w-[20%] rounded-[12px] bg-transparent" />
          </nav>
        </div>
      </div>
    </main>
  );
}

function buildVisibleDays(year: number, month: number): VisibleDay[] {
  const firstOfMonth = formatLocalDate({ year, month, day: 1 });
  const firstVisibleDay = startOfLocalWeek(firstOfMonth);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(firstVisibleDay, index);
    const parts = parseLocalDate(date);

    return {
      date,
      dayNumber: parts?.day ?? 0,
      belongsToMonth: parts?.year === year && parts.month === month,
    };
  });
}

function statusLabel(statuses: Set<LessonStatus>) {
  const labels: Record<LessonStatus, string> = {
    confermata: "confermata",
    attesa: "in attesa",
    richiesta: "richiesta",
    annullata: "annullata",
  };

  return `Appuntamenti: ${STATUS_ORDER.filter((status) => statuses.has(status))
    .map((status) => labels[status])
    .join(", ")}`;
}

function buildTodaySummary(
  appointments: CalendarAppointment[],
  series: CalendarSeries[],
  today: LocalDate,
  currentTime: string
) {
  const todayOccurrences = selectDayOccurrences(appointments, series, today);
  const activeToday = todayOccurrences.filter(
    (occurrence) => occurrence.status !== "annullata"
  );
  const modeCounts = new Map<LessonMode, number>();

  for (const occurrence of activeToday) {
    modeCounts.set(occurrence.mode, (modeCounts.get(occurrence.mode) ?? 0) + 1);
  }

  const rangeEnd = futureRangeEnd(appointments, series, today);
  const nextOccurrence = selectOccurrencesInRange(
    appointments,
    series,
    today,
    rangeEnd
  ).find(
    (occurrence) =>
      occurrence.status !== "annullata" &&
      (occurrence.date > today || occurrence.startTime >= currentTime)
  );

  return {
    lessonCount: activeToday.length,
    totalMinutes: activeToday.reduce(
      (total, occurrence) => total + occurrence.durationMinutes,
      0
    ),
    modeSummary: (["casa", "domicilio", "online"] as LessonMode[])
      .filter((mode) => modeCounts.has(mode))
      .map((mode) => `${MODE_LABELS[mode]} ${modeCounts.get(mode)}`)
      .join(" · "),
    pendingRequests: todayOccurrences.filter(
      (occurrence) =>
        occurrence.status === "richiesta" || occurrence.status === "attesa"
    ).length,
    nextOccurrence,
  };
}

function futureRangeEnd(
  appointments: CalendarAppointment[],
  series: CalendarSeries[],
  today: LocalDate
) {
  const dates = [
    addDays(today, 366),
    ...appointments.map((appointment) => appointment.date),
    ...series.map((item) => item.recurrence.endsOn ?? addDays(today, 366)),
  ];

  return dates.reduce((latest, date) => date > latest ? date : latest, today);
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function formatShortDate(date: LocalDate) {
  const parts = parseLocalDate(date);
  return parts
    ? `${parts.day.toString().padStart(2, "0")}/${parts.month
        .toString()
        .padStart(2, "0")}`
    : date;
}
