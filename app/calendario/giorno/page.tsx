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
  parseLocalTime,
  toLocalDate,
} from "../../data/calendario/calendar-dates";
import { selectDayOccurrences } from "../../data/calendario/calendar-selectors";
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

const WEEKDAY_NAMES = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
] as const;

const MODE_DETAILS: Record<LessonMode, { icon: string; label: string }> = {
  casa: { icon: "⌂", label: "A casa" },
  domicilio: { icon: "⌂", label: "A domicilio" },
  online: { icon: "▣", label: "Online" },
};

const STATUS_DETAILS: Record<
  LessonStatus,
  { label: string; stripe: string; wash: string }
> = {
  confermata: {
    label: "Confermata",
    stripe: "bg-[#4f7d52]",
    wash: "bg-[#d8e6d0]/50",
  },
  attesa: {
    label: "In attesa",
    stripe: "bg-[#c88d24]",
    wash: "bg-[#f1e2bd]/50",
  },
  richiesta: {
    label: "Richiesta",
    stripe: "bg-[#557e9c]",
    wash: "bg-[#d9e4e8]/50",
  },
  annullata: {
    label: "Annullata",
    stripe: "bg-[#9e5151]",
    wash: "bg-[#edd8d6]/50",
  },
};

const DAY_START_MINUTES = 8 * 60;
const DAY_END_MINUTES = 22 * 60;
const DAY_SPAN_MINUTES = DAY_END_MINUTES - DAY_START_MINUTES;

type LayoutOccurrence = {
  occurrence: CalendarOccurrence;
  topPct: number;
  heightPct: number;
  lane: number;
  laneCount: number;
};

export default function CalendarDayPage() {
  return (
    <Suspense fallback={<DayPageFrame />}>
      <CalendarDayContent />
    </Suspense>
  );
}

function CalendarDayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = useMemo(() => toLocalDate(new Date()), []);
  const requestedDate = searchParams.get("data");
  const selectedDate = isLocalDate(requestedDate) ? requestedDate : today;

  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      setAppointments(loadCalendarAppointments());
      setSeries(loadCalendarSeries());
    });
  }, []);

  const occurrences = useMemo(
    () =>
      selectDayOccurrences(appointments, series, selectedDate).sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      ),
    [appointments, selectedDate, series]
  );

  const layout = useMemo(() => layoutDayOccurrences(occurrences), [occurrences]);

  return (
    <DayPageFrame>
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Indietro"
        className="antique-clickable absolute left-[4.4%] top-[0.6%] z-30 h-[4.5%] w-[20%] rounded-[12px] bg-transparent"
      />
      <Link
        href="/menu"
        aria-label="Torna al menù"
        className="antique-clickable absolute right-[4.3%] top-[0.6%] z-30 h-[4.5%] w-[18.5%] rounded-[12px] bg-transparent"
      />
      <Link
        href={`/calendario/nuova?data=${selectedDate}`}
        aria-label="Nuova lezione"
        className="antique-clickable absolute right-[4.7%] top-[5.8%] z-30 h-[9.5%] w-[20%] bg-transparent"
      />

      <button
        type="button"
        onClick={() =>
          router.push(`/calendario/giorno?data=${addDays(selectedDate, -1)}`)
        }
        aria-label="Giorno precedente"
        className="antique-clickable absolute left-[8.7%] top-[14.9%] z-30 h-[5%] w-[9%] rounded-full bg-transparent"
      />
      <button
        type="button"
        onClick={() =>
          router.push(`/calendario/giorno?data=${addDays(selectedDate, 1)}`)
        }
        aria-label="Giorno successivo"
        className="antique-clickable absolute right-[20.2%] top-[14.9%] z-30 h-[5%] w-[9%] rounded-full bg-transparent"
      />
      <Link
        href={`/calendario?data=${selectedDate}`}
        aria-label="Vista mese"
        className="antique-clickable absolute right-[7.4%] top-[15.5%] z-30 h-[5.5%] w-[10.8%] rounded-[12px] bg-transparent"
      />

      <h1
        aria-live="polite"
        className="pointer-events-none absolute left-[20%] top-[15.15%] z-20 w-[51%] whitespace-nowrap text-center font-entry-elegant text-[clamp(13px,3.55vw,18px)] font-semibold text-[#7a2739]"
      >
        {formatDayTitle(selectedDate)}
      </h1>

      <section
        aria-label={`Appuntamenti di ${formatDayTitle(selectedDate)}`}
        className="absolute left-[18.4%] top-[21.45%] z-20 h-[60.15%] w-[68.8%]"
      >
        {layout.map(({ occurrence, topPct, heightPct, lane, laneCount }) => {
          const mode = MODE_DETAILS[occurrence.mode];
          const status = STATUS_DETAILS[occurrence.status];
          const appointmentId = encodeURIComponent(
            occurrence.appointmentId ?? occurrence.occurrenceId
          );
          const gap = 1.5;
          const widthPct = (100 - gap * (laneCount - 1)) / laneCount;
          const leftPct = lane * (widthPct + gap);

          return (
            <Link
              key={occurrence.occurrenceId}
              href={`/calendario/${appointmentId}/modifica`}
              aria-label={`${occurrence.startTime}, ${occurrence.studentNameSnapshot}, ${occurrence.subject}, ${mode.label}, ${status.label}`}
              style={{
                top: `${topPct}%`,
                height: `${heightPct}%`,
                left: `${leftPct}%`,
                width: `${widthPct}%`,
              }}
              className={`antique-clickable absolute overflow-hidden rounded-[3px] ${status.wash}`}
            >
              <span
                aria-hidden="true"
                className={`absolute inset-y-[7%] left-[1%] w-[1%] rounded-full opacity-70 ${status.stripe}`}
              />
              <div className="absolute inset-y-[8%] left-[5%] right-[4%] grid min-w-0 grid-cols-[1fr_auto] gap-x-[3%] font-entry-elegant text-[#4d3024]">
                <div className="min-w-0 self-center">
                  <p className="truncate text-[clamp(10px,2.8vw,14px)] font-semibold leading-[1.05]">
                    {occurrence.studentNameSnapshot}
                  </p>
                  <p className="truncate text-[clamp(8px,2.3vw,11px)] leading-[1.1]">
                    {occurrence.subject}
                  </p>
                  <p className="truncate text-[clamp(7px,2.05vw,10px)] leading-[1.1] text-[#654837]">
                    {occurrence.startTime} – {endTime(occurrence.startTime, occurrence.durationMinutes)}
                    {" · "}
                    {formatDuration(occurrence.durationMinutes)}
                  </p>
                </div>

                <div className="flex min-w-[48px] flex-col items-end justify-center gap-[4%] text-right">
                  <span className="whitespace-nowrap text-[clamp(7px,2vw,10px)] text-[#5d4031]">
                    <span aria-hidden="true" className="mr-1 text-[clamp(10px,2.7vw,13px)]">
                      {mode.icon}
                    </span>
                    {mode.label}
                  </span>
                  <span className="text-[clamp(9px,2.5vw,12px)]" aria-hidden="true">
                    ✎
                  </span>
                </div>
              </div>
            </Link>
          );
        })}

        {occurrences.length === 0 && (
          <p className="pointer-events-none absolute left-[18%] top-[37%] w-[65%] text-center font-entry-elegant text-[clamp(12px,3.2vw,16px)] italic text-[#755743]/70">
            Nessun appuntamento
          </p>
        )}
      </section>

      <nav
        aria-label="Navigazione principale"
        className="absolute inset-x-[1.8%] bottom-[0.65%] z-30 h-[9.2%]"
      >
        <Link
          href="/studenti"
          aria-label="Studenti"
          className="antique-clickable absolute inset-y-0 left-0 w-[20%] bg-transparent"
        />
        <Link
          href="/calendario"
          aria-label="Calendario"
          aria-current="page"
          className="antique-clickable absolute inset-y-0 left-[20%] w-[20%] bg-transparent"
        />
        <Link
          href="/materie"
          aria-label="Materie"
          className="antique-clickable absolute inset-y-0 left-[40%] w-[20%] bg-transparent"
        />
        <Link
          href="/libri"
          aria-label="Libri"
          className="antique-clickable absolute inset-y-0 left-[60%] w-[20%] bg-transparent"
        />
        <Link
          href="/menu"
          aria-label="Menu"
          className="antique-clickable absolute inset-y-0 left-[80%] w-[20%] bg-transparent"
        />
      </nav>
    </DayPageFrame>
  );
}

function DayPageFrame({ children }: { children?: ReactNode }) {
  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce] text-[#4b3024]">
      <div className="mx-auto w-full max-w-[430px] sm:py-3">
        <div className="relative aspect-[940/1672] w-full min-h-dvh sm:min-h-0 overflow-hidden bg-[#f4e7cf] sm:rounded-[28px]">
          <Image
            src="/calendar-day-new-lesson-bg.png"
            alt="Agenda giornaliera illustrata"
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

function formatDayTitle(date: LocalDate) {
  const parts = parseLocalDate(date);
  if (!parts) return date;

  const weekday = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day)
  ).getUTCDay();

  return `${WEEKDAY_NAMES[weekday]} ${parts.day} ${MONTH_NAMES[parts.month - 1]} ${parts.year}`;
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return hours === 1 ? "1h" : `${hours}h`;
  return `${hours}h ${remainingMinutes} min`;
}

function endTime(startTime: string, durationMinutes: number) {
  const parts = parseLocalTime(startTime);
  if (!parts) return startTime;
  const total = parts.hour * 60 + parts.minute + durationMinutes;
  const hour = Math.floor(total / 60) % 24;
  const minute = total % 60;
  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
}

function layoutDayOccurrences(
  occurrences: CalendarOccurrence[]
): LayoutOccurrence[] {
  const items = occurrences
    .map((occurrence) => {
      const start = minutesOfDay(occurrence.startTime);
      if (start === null) return null;
      const clampedStart = Math.max(DAY_START_MINUTES, start);
      const clampedEnd = Math.min(
        DAY_END_MINUTES,
        start + Math.max(30, occurrence.durationMinutes)
      );
      if (clampedEnd <= DAY_START_MINUTES || clampedStart >= DAY_END_MINUTES) {
        return null;
      }
      return {
        occurrence,
        start: clampedStart,
        end: clampedEnd,
        lane: 0,
        laneCount: 1,
      };
    })
    .filter(
      (
        item
      ): item is {
        occurrence: CalendarOccurrence;
        start: number;
        end: number;
        lane: number;
        laneCount: number;
      } => item !== null
    )
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const clusters: typeof items[] = [];
  let cluster: typeof items = [];
  let clusterEnd = -1;

  for (const item of items) {
    if (cluster.length === 0 || item.start < clusterEnd) {
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.end);
    } else {
      clusters.push(cluster);
      cluster = [item];
      clusterEnd = item.end;
    }
  }
  if (cluster.length > 0) clusters.push(cluster);

  for (const current of clusters) {
    const laneEnds: number[] = [];

    for (const item of current) {
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.end);
      } else {
        laneEnds[lane] = item.end;
      }
      item.lane = lane;
    }

    const laneCount = Math.max(1, laneEnds.length);
    for (const item of current) item.laneCount = laneCount;
  }

  return items.map((item) => ({
    occurrence: item.occurrence,
    topPct: ((item.start - DAY_START_MINUTES) / DAY_SPAN_MINUTES) * 100,
    heightPct: Math.max(
      3.25,
      ((item.end - item.start) / DAY_SPAN_MINUTES) * 100
    ),
    lane: item.lane,
    laneCount: item.laneCount,
  }));
}

function minutesOfDay(value: string) {
  const parts = parseLocalTime(value);
  return parts ? parts.hour * 60 + parts.minute : null;
}
