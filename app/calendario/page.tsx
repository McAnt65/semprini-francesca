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
} from "../data/calendario/calendar-dates";
import { selectOccurrencesInRange } from "../data/calendario/calendar-selectors";
import {
  loadCalendarAppointments,
  loadCalendarSeries,
} from "../data/calendario/calendar-storage";
import type {
  CalendarAppointment,
  CalendarSeries,
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
        <div className="relative aspect-[941/1672] w-full overflow-hidden bg-[#f4e7cf] sm:rounded-[28px]">
          <Image
            src="/calendar-month-bg-clean.png"
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
            href="/calendario"
            aria-label="Vista mese"
            aria-current="page"
            className="antique-clickable absolute left-[11.5%] top-[17.5%] z-30 h-[5.2%] w-[23.6%] rounded-[12px] bg-transparent"
          />
          <Link
            href={`/calendario/settimana?data=${selectedDate}`}
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
                <div
                  key={day.date}
                  aria-current={isToday ? "date" : undefined}
                  className={`relative min-w-0 ${
                    day.belongsToMonth ? "opacity-100" : "opacity-35"
                  }`}
                >
                  <span
                    className={`absolute left-1/2 top-1/2 flex aspect-square w-[36%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-entry-elegant text-[clamp(11px,3.15vw,16px)] leading-none ${
                      isToday
                        ? "bg-[#8f263b]/14 font-semibold text-[#781d31] ring-1 ring-[#8f263b]/65"
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
                </div>
              );
            })}
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
