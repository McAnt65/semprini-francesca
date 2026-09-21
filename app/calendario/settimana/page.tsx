"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  addDays,
  isLocalDate,
  parseLocalDate,
  startOfLocalWeek,
  toLocalDate,
} from "../../data/calendario/calendar-dates";
import { selectWeekOccurrences } from "../../data/calendario/calendar-selectors";
import {
  loadCalendarAppointments,
  loadCalendarSeries,
} from "../../data/calendario/calendar-storage";
import type {
  CalendarAppointment,
  CalendarOccurrence,
  CalendarSeries,
  LessonMode,
  LessonStatus,
  LocalDate,
} from "../../data/calendario/calendar-types";

const MONTH_NAMES = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
] as const;

const WEEKDAY_NAMES = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica",
] as const;

const STATUS_LABELS: Record<LessonStatus, string> = {
  confermata: "Confermata",
  attesa: "In attesa",
  richiesta: "Richiesta",
  annullata: "Annullata",
};

const STATUS_COLORS: Record<LessonStatus, string> = {
  confermata: "bg-[#3f9a78]",
  attesa: "bg-[#d99a18]",
  richiesta: "bg-[#3078c6]",
  annullata: "bg-[#ac4a4c]",
};

const MODE_DETAILS: Record<LessonMode, { icon: string; label: string }> = {
  casa: { icon: "⌂", label: "Casa" },
  studio: { icon: "✎", label: "Studio" },
  online: { icon: "◉", label: "Online" },
};

export default function CalendarWeekPage() {
  return (
    <Suspense fallback={<WeekPageFrame />}>
      <CalendarWeekContent />
    </Suspense>
  );
}

function CalendarWeekContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = useMemo(() => toLocalDate(new Date()), []);
  const requestedDate = searchParams.get("data");
  const selectedDate = isLocalDate(requestedDate) ? requestedDate : today;
  const weekStart = startOfLocalWeek(selectedDate);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      setAppointments(loadCalendarAppointments());
      setSeries(loadCalendarSeries());
    });
  }, []);

  const occurrencesByDate = useMemo(() => {
    const grouped = new Map<LocalDate, CalendarOccurrence[]>();

    for (const occurrence of selectWeekOccurrences(
      appointments,
      series,
      selectedDate
    )) {
      const dayOccurrences = grouped.get(occurrence.date) ?? [];
      dayOccurrences.push(occurrence);
      grouped.set(occurrence.date, dayOccurrences);
    }

    return grouped;
  }, [appointments, selectedDate, series]);

  function changeWeek(amount: number) {
    router.push(`/calendario/settimana?data=${addDays(weekStart, amount * 7)}`);
  }

  return (
    <WeekPageFrame>
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Indietro"
        className="antique-clickable absolute left-[5.7%] top-[0.7%] z-30 h-[4.2%] w-[18.2%] rounded-[12px] bg-transparent"
      />
      <Link
        href="/menu"
        aria-label="Torna al menù"
        className="antique-clickable absolute right-[5.4%] top-[0.7%] z-30 h-[4.2%] w-[18.2%] rounded-[12px] bg-transparent"
      />

      <button
        type="button"
        onClick={() => changeWeek(-1)}
        aria-label="Settimana precedente"
        className="antique-clickable absolute left-[24.6%] top-[4.8%] z-30 h-[5.4%] w-[9.2%] rounded-full bg-transparent"
      />
      <button
        type="button"
        onClick={() => changeWeek(1)}
        aria-label="Settimana successiva"
        className="antique-clickable absolute left-[65.8%] top-[4.8%] z-30 h-[5.4%] w-[9.2%] rounded-full bg-transparent"
      />

      <nav aria-label="Viste calendario">
        <Link
          href={`/calendario?data=${selectedDate}`}
          aria-label="Vista mese"
          className="antique-clickable absolute right-[4.8%] top-[5.6%] z-30 h-[6.4%] w-[11.2%] rounded-[12px] bg-transparent"
        />
        <Link
          href={`/calendario/settimana?data=${selectedDate}`}
          aria-label="Vista settimana"
          aria-current="page"
          className="antique-clickable absolute left-[34.3%] top-[5.3%] z-30 h-[4.6%] w-[31.4%] rounded-[10px] bg-transparent"
        />
      </nav>

      <h1
        aria-live="polite"
        className="pointer-events-none absolute left-[33.3%] top-[5.7%] z-20 w-[33.4%] text-center font-entry-elegant text-[clamp(12px,3.45vw,17px)] font-semibold text-[#6f2638]"
      >
        {formatWeekInterval(weekStart, weekDays[6])}
      </h1>

      <section
        aria-label={`Settimana ${formatWeekInterval(weekStart, weekDays[6])}`}
        className="absolute left-[4.1%] top-[15.55%] z-20 grid h-[62.75%] w-[91.1%] grid-rows-7"
      >
        {weekDays.map((date, dayIndex) => {
          const parts = parseLocalDate(date);
          const occurrences = occurrencesByDate.get(date) ?? [];
          const isToday = date === today;

          return (
            <article key={date} className="relative min-h-0">
              <Link
                href={`/calendario/giorno?data=${date}`}
                aria-label={`Vista giorno: ${WEEKDAY_NAMES[dayIndex]} ${parts?.day ?? ""}`}
                aria-current={isToday ? "date" : undefined}
                className="antique-clickable absolute inset-y-[4%] left-0 w-[16.2%] rounded-[10px] bg-transparent"
              >
                <span
                  className={`absolute left-1/2 top-[68%] flex h-[clamp(18px,5vw,24px)] min-w-[clamp(18px,5vw,24px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-1 font-entry-elegant text-[clamp(11px,3.2vw,16px)] font-semibold leading-none ${
                    isToday
                      ? "bg-[#8f263b]/14 text-[#781d31] ring-1 ring-[#8f263b]/65"
                      : "text-[#5a3828]"
                  }`}
                >
                  {parts?.day}
                </span>
              </Link>

              <div className="absolute bottom-[8%] left-[16.8%] top-[9%] w-[81.2%] overflow-y-auto pr-[1%]">
                <div className="flex min-h-full flex-col justify-center gap-[clamp(2px,0.7vw,4px)]">
                  {occurrences.map((occurrence, index) => (
                    <AppointmentWithTravel
                      key={occurrence.occurrenceId}
                      occurrence={occurrence}
                      nextOccurrence={occurrences[index + 1]}
                    />
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <nav
        aria-label="Navigazione principale"
        className="absolute inset-x-[2%] bottom-[0.8%] z-30 h-[8.6%]"
      >
        <Link href="/studenti" aria-label="Studenti" className="antique-clickable absolute inset-y-0 left-0 w-[20%] bg-transparent" />
        <Link href="/calendario" aria-label="Calendario" className="antique-clickable absolute inset-y-0 left-[20%] w-[20%] bg-transparent" />
        <Link href="/materie" aria-label="Materie" className="antique-clickable absolute inset-y-0 left-[40%] w-[20%] bg-transparent" />
        <Link href="/libri" aria-label="Libri" className="antique-clickable absolute inset-y-0 left-[60%] w-[20%] bg-transparent" />
        <Link href="/menu" aria-label="Menu" className="antique-clickable absolute inset-y-0 left-[80%] w-[20%] bg-transparent" />
      </nav>
    </WeekPageFrame>
  );
}

function AppointmentWithTravel({
  occurrence,
  nextOccurrence,
}: {
  occurrence: CalendarOccurrence;
  nextOccurrence?: CalendarOccurrence;
}) {
  const appointmentId = encodeURIComponent(
    occurrence.appointmentId ?? occurrence.occurrenceId
  );
  const mode = MODE_DETAILS[occurrence.mode];
  const showTravel =
    nextOccurrence &&
    occurrence.status !== "annullata" &&
    nextOccurrence.status !== "annullata" &&
    (occurrence.mode === "casa" || nextOccurrence.mode === "casa");

  return (
    <>
      <Link
        href={`/calendario/${appointmentId}/modifica`}
        aria-label={`${occurrence.startTime}, ${occurrence.studentNameSnapshot}, ${occurrence.subject}`}
        className="antique-clickable flex min-h-[clamp(22px,6.2vw,29px)] items-center gap-[2%] rounded-[7px] border border-[#9b7754]/18 bg-[#fff9e9]/28 px-[2%] py-[1%] font-entry-elegant text-[#4e3124] shadow-[0_1px_2px_rgba(77,45,27,0.08)]"
      >
        <span className="shrink-0 text-[clamp(9px,2.6vw,12px)] font-semibold text-[#702c3b]">
          {occurrence.startTime}
        </span>
        <span className="min-w-0 flex-1 leading-[1.05]">
          <span className="block truncate text-[clamp(8px,2.35vw,11px)] font-semibold">
            {occurrence.studentNameSnapshot} · {occurrence.subject}
          </span>
          <span className="block truncate text-[clamp(7px,2vw,9.5px)] text-[#694b39]">
            {formatDuration(occurrence.durationMinutes)} · {STATUS_LABELS[occurrence.status]}
          </span>
        </span>
        <span
          aria-label={mode.label}
          title={mode.label}
          className="flex shrink-0 items-center gap-0.5 text-[clamp(7px,2vw,9.5px)] text-[#674736]"
        >
          <span aria-hidden="true" className="text-[clamp(10px,2.8vw,13px)] leading-none">
            {mode.icon}
          </span>
          <span>{mode.label}</span>
        </span>
        <span
          aria-hidden="true"
          className={`h-[clamp(5px,1.5vw,7px)] w-[clamp(5px,1.5vw,7px)] shrink-0 rounded-full ${STATUS_COLORS[occurrence.status]}`}
        />
      </Link>

      {showTravel && (
        <div className="flex h-[clamp(7px,1.9vw,9px)] items-center justify-center text-[clamp(6px,1.65vw,8px)] italic leading-none text-[#76543d]/75">
          <span aria-hidden="true">↝</span>&nbsp;spostamento
        </div>
      )}
    </>
  );
}

function WeekPageFrame({ children }: { children?: ReactNode }) {
  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce] text-[#4b3024]">
      <div className="mx-auto w-full max-w-[430px] sm:py-3">
        <div className="relative aspect-[941/1672] w-full overflow-hidden bg-[#f4e7cf] sm:rounded-[28px]">
          <Image
            src="/calendar-week-bg-clean.png"
            alt="Agenda settimanale illustrata"
            fill
            priority
            unoptimized
            sizes="(max-width: 430px) 100vw, 430px"
            className="pointer-events-none select-none object-fill"
          />
          {children}
        </div>
      </div>
    </main>
  );
}

function formatWeekInterval(start: LocalDate, end: LocalDate) {
  const startParts = parseLocalDate(start);
  const endParts = parseLocalDate(end);
  if (!startParts || !endParts) return "";

  if (startParts.year === endParts.year && startParts.month === endParts.month) {
    return `${startParts.day}–${endParts.day} ${MONTH_NAMES[endParts.month - 1]} ${endParts.year}`;
  }

  if (startParts.year === endParts.year) {
    return `${startParts.day} ${MONTH_NAMES[startParts.month - 1]}–${endParts.day} ${MONTH_NAMES[endParts.month - 1]} ${endParts.year}`;
  }

  return `${startParts.day} ${MONTH_NAMES[startParts.month - 1]} ${startParts.year}–${endParts.day} ${MONTH_NAMES[endParts.month - 1]} ${endParts.year}`;
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} h`;
  return `${hours} h ${remainingMinutes} min`;
}
