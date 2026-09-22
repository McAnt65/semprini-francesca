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
  loadCalendarRequests,
  loadCalendarSeries,
} from "../../data/calendario/calendar-storage";
import type {
  CalendarAppointment,
  CalendarOccurrence,
  CalendarRequest,
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
  studio: { icon: "♟", label: "Studio" },
  online: { icon: "▣", label: "Online" },
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
  const weekEnd = addDays(weekStart, 6);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);
  const [requests, setRequests] = useState<CalendarRequest[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      setAppointments(loadCalendarAppointments());
      setSeries(loadCalendarSeries());
      setRequests(loadCalendarRequests());
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

    for (const dayOccurrences of grouped.values()) {
      dayOccurrences.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    return grouped;
  }, [appointments, selectedDate, series]);

  const latestReceivedRequest = useMemo(
    () =>
      [...requests]
        .filter(
          (request) =>
            request.direction === "ricevuta" &&
            request.status !== "annullata"
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0],
    [requests]
  );

  function changeWeek(amount: number) {
    router.push(`/calendario/settimana?data=${addDays(weekStart, amount * 7)}`);
  }

  return (
    <WeekPageFrame>
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Indietro"
        className="antique-clickable absolute left-[5.4%] top-[0.55%] z-30 h-[3.7%] w-[18.2%] rounded-[12px] bg-transparent"
      />
      <Link
        href="/menu"
        aria-label="Torna al menù"
        className="antique-clickable absolute right-[6.2%] top-[0.45%] z-30 h-[3.7%] w-[17%] rounded-[12px] bg-transparent"
      />

      <button
        type="button"
        onClick={() => changeWeek(-1)}
        aria-label="Settimana precedente"
        className="antique-clickable absolute left-[24.8%] top-[4.2%] z-30 h-[5.1%] w-[9.2%] rounded-full bg-transparent"
      />
      <button
        type="button"
        onClick={() => changeWeek(1)}
        aria-label="Settimana successiva"
        className="antique-clickable absolute left-[65.3%] top-[4.2%] z-30 h-[5.1%] w-[9.2%] rounded-full bg-transparent"
      />

      <h1
        aria-live="polite"
        className="pointer-events-none absolute left-[30.5%] top-[5.35%] z-20 w-[39%] whitespace-nowrap text-center font-entry-elegant text-[clamp(9px,2.35vw,11px)] font-semibold leading-none text-[#6f2638]"
      >
        {formatWeekTitle(weekStart, weekEnd)}
      </h1>

      <Link
        href={`/calendario?data=${selectedDate}`}
        aria-label="Vista mese"
        className="antique-clickable absolute right-[7.4%] top-[5.5%] z-30 h-[4.7%] w-[10.5%] rounded-[12px] bg-transparent"
      />

      <section
        aria-label={`Settimana ${formatWeekInterval(weekStart, weekEnd)}`}
        className="absolute left-[3.5%] top-[12.05%] z-20 grid h-[59.9%] w-[92.3%] grid-rows-[repeat(7,minmax(0,1fr))]"
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
                className={`antique-clickable absolute inset-y-[3%] left-0 z-20 w-[15.1%] rounded-[8px] ${isToday ? "bg-[#8b2438]/12 ring-1 ring-inset ring-[#8b2438]/35" : "bg-transparent"}`}
              >
                <span
                  className={`absolute left-[51%] top-[75%] flex h-[clamp(23px,6vw,29px)] min-w-[clamp(23px,6vw,29px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-1 font-entry-elegant text-[clamp(14px,3.8vw,18px)] font-semibold leading-none ${
                    isToday
                      ? "text-[#a5142b]"
                      : "text-[#5a3828]"
                  }`}
                >
                  {parts?.day}
                </span>
              </Link>

              <div className="absolute bottom-[6%] left-[17.2%] top-[8%] w-[79.4%] touch-pan-y overflow-y-auto overscroll-contain pr-[0.7%] [-webkit-overflow-scrolling:touch]">
                <div className="flex min-h-full flex-col justify-start gap-[clamp(2px,0.55vw,3px)] py-[1%]">
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

      <section
        aria-label="Richiesta ricevuta"
        className="absolute left-[6.8%] top-[76.45%] z-20 h-[10.7%] w-[53.2%] font-entry-elegant text-[#5b3929]"
      >
        {latestReceivedRequest ? (
          <>
            <p className="absolute left-[2%] top-[28%] w-[87%] truncate text-[clamp(9px,2.4vw,11px)]">
              {latestReceivedRequest.studentNameSnapshot}
            </p>
            <p className="absolute left-[2%] top-[43%] w-[87%] truncate text-[clamp(9px,2.4vw,11px)]">
              {latestReceivedRequest.subject}
            </p>
            <p className="absolute left-[2%] top-[58%] w-[87%] truncate text-[clamp(9px,2.4vw,11px)]">
              {formatRequestDateTime(latestReceivedRequest)}
            </p>
            <p className="absolute left-[2%] top-[73%] w-[87%] truncate text-[clamp(8px,2.2vw,10px)] italic">
              {latestReceivedRequest.notes || "Richiesta di lezione"}
            </p>
          </>
        ) : (
          <p className="absolute left-[31%] top-[47%] w-[58%] text-center text-[clamp(8px,2.15vw,10px)] italic text-[#6f5745]">
            Nessuna richiesta in attesa
          </p>
        )}
        <Link
          href="/calendario/richieste"
          aria-label="Vai alle richieste ricevute"
          className="antique-clickable absolute bottom-[2%] right-[1%] h-[20%] w-[42%] rounded-[8px] bg-transparent"
        />
      </section>

      <nav
        aria-label="Navigazione principale"
        className="absolute inset-x-[1.7%] bottom-[0.6%] z-30 h-[9.5%]"
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
        className="antique-clickable flex min-h-[clamp(22px,5.6vw,27px)] shrink-0 items-center gap-[1.8%] rounded-[7px] bg-transparent px-[1.8%] py-[0.5%] font-entry-elegant text-[#4e3124]"
      >
        <span className="shrink-0 text-[clamp(9px,2.55vw,12px)] font-semibold text-[#702c3b]">
          {occurrence.startTime}
        </span>
        <span className="min-w-0 flex-1 truncate text-[clamp(8px,2.35vw,11px)] font-semibold leading-none">
          {occurrence.studentNameSnapshot}
        </span>
        <span className="max-w-[24%] truncate text-[clamp(7px,2.05vw,9.5px)] text-[#694b39]">
          {occurrence.subject}
        </span>
        <span className="shrink-0 text-[clamp(7px,1.95vw,9px)] text-[#694b39]">
          {formatDuration(occurrence.durationMinutes)}
        </span>
        <span
          aria-label={mode.label}
          title={mode.label}
          className="shrink-0 text-[clamp(9px,2.45vw,11px)] leading-none text-[#674736]"
        >
          {mode.icon}
        </span>
        <span
          aria-hidden="true"
          title={STATUS_LABELS[occurrence.status]}
          className={`h-[clamp(5px,1.45vw,7px)] w-[clamp(5px,1.45vw,7px)] shrink-0 rounded-full ${STATUS_COLORS[occurrence.status]}`}
        />
      </Link>

      {showTravel && (
        <div className="flex h-[clamp(6px,1.6vw,8px)] shrink-0 items-center justify-center text-[clamp(6px,1.55vw,7.5px)] italic leading-none text-[#76543d]/75">
          ↝&nbsp;spostamento
        </div>
      )}
    </>
  );
}

function WeekPageFrame({ children }: { children?: ReactNode }) {
  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce] text-[#4b3024]">
      <div className="mx-auto w-full max-w-[430px] sm:py-3">
        <div className="relative aspect-[940/1672] w-full overflow-hidden bg-[#f4e7cf] sm:rounded-[28px]">
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

function formatWeekTitle(start: LocalDate, end: LocalDate) {
  const startParts = parseLocalDate(start);
  const endParts = parseLocalDate(end);
  if (!startParts || !endParts) return "Settimana";

  if (startParts.year === endParts.year && startParts.month === endParts.month) {
    return `Dal ${startParts.day} al ${endParts.day} ${MONTH_NAMES[endParts.month - 1]}`;
  }

  if (startParts.year === endParts.year) {
    return `Dal ${startParts.day} ${MONTH_NAMES[startParts.month - 1]} al ${endParts.day} ${MONTH_NAMES[endParts.month - 1]}`;
  }

  return `Dal ${startParts.day} ${MONTH_NAMES[startParts.month - 1]} ${startParts.year} al ${endParts.day} ${MONTH_NAMES[endParts.month - 1]} ${endParts.year}`;
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h${remainingMinutes}`;
}

function formatRequestDateTime(request: CalendarRequest) {
  const parts = parseLocalDate(request.proposedDate);
  if (!parts) return request.proposedStartTime;
  return `${parts.day} ${MONTH_NAMES[parts.month - 1]} · ${request.proposedStartTime}`;
}
