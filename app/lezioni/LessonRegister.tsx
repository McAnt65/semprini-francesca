"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatLocalDate, toLocalDate } from "../data/calendario/calendar-dates";
import { selectOccurrencesInRange } from "../data/calendario/calendar-selectors";
import { loadCalendarAppointments, loadCalendarSeries } from "../data/calendario/calendar-storage";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries } from "../data/calendario/calendar-types";

type View = "upcoming" | "diary";
const longDate = (value: string, weekday = false) => new Intl.DateTimeFormat("it-IT", { ...(weekday ? { weekday: "long" as const } : {}), day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`));

export default function LessonRegister({ view }: { view: View }) {
  const [period, setPeriod] = useState(() => { const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() + 1 }; });
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { queueMicrotask(() => { setAppointments(loadCalendarAppointments()); setSeries(loadCalendarSeries()); setReady(true); }); }, []);

  const now = useMemo(() => new Date(), []);
  const today = toLocalDate(now);
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const from = formatLocalDate({ year: period.year, month: period.month, day: 1 });
  const to = formatLocalDate({ year: period.year, month: period.month, day: new Date(Date.UTC(period.year, period.month, 0)).getUTCDate() });
  const lessons = useMemo(() => selectOccurrencesInRange(appointments, series, from, to)
    .filter(item => item.status !== "annullata" && (view === "upcoming"
      ? item.date > today || (item.date === today && item.startTime >= currentTime)
      : item.date < today || (item.date === today && item.startTime < currentTime)))
    .sort((a, b) => view === "upcoming"
      ? a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
      : b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)),
  [appointments, series, from, to, view, today, currentTime]);

  function shift(delta: number) {
    const next = new Date(Date.UTC(period.year, period.month - 1 + delta, 1));
    setPeriod({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 });
  }
  const title = view === "upcoming" ? "Lezioni in programma" : "Diario delle lezioni";
  const monthLabel = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(new Date(period.year, period.month - 1, 1));

  return <main className="min-h-dvh overflow-x-hidden bg-[#f4eddf] text-[#473026]">
    <div className="relative mx-auto aspect-[941/1672] min-h-dvh w-full max-w-[430px] overflow-hidden sm:min-h-0">
      <Image src={view === "upcoming" ? "/lessons-upcoming-clean.png" : "/lessons-diary-clean.png"} alt="" fill priority unoptimized sizes="(max-width: 430px) 100vw, 430px" className="pointer-events-none object-fill" />
      <h1 className="sr-only">{title}</h1>
      <Link href="/lezioni" aria-label="Indietro a Lezioni" className="absolute left-[3%] top-[1%] h-[6%] w-[28%]" />
      <Link href="/menu" aria-label="Menu" className="absolute right-[3%] top-[1%] h-[6%] w-[26%]" />
      <button type="button" onClick={() => shift(-1)} aria-label="Mese precedente" className="absolute left-[23%] top-[19.2%] h-[6%] w-[10%]" />
      <button type="button" onClick={() => shift(1)} aria-label="Mese successivo" className="absolute right-[23%] top-[19.2%] h-[6%] w-[10%]" />
      <p aria-live="polite" className="absolute left-[32%] top-[20%] w-[36%] truncate text-center font-entry-elegant text-[clamp(16px,4.8vw,23px)] capitalize text-[#813247]">{monthLabel}</p>
      <section aria-label={title} className="absolute left-[6%] top-[29%] h-[58%] w-[88%] overflow-y-auto overscroll-contain font-entry-elegant [scrollbar-width:thin] [scrollbar-color:#b89879_transparent]">
        {ready && lessons.length === 0 && <p className="absolute left-[30%] top-[8%] w-[66%] text-center text-[clamp(12px,3.5vw,16px)] italic text-[#775a43]">{view === "upcoming" ? "Nessuna lezione in programma questo mese" : "Nessuna lezione registrata questo mese"}</p>}
        {lessons.map((item: CalendarOccurrence) => <Link key={item.occurrenceId} href={`/calendario/${encodeURIComponent(item.appointmentId ?? item.occurrenceId)}/modifica?data=${item.date}`} className="flex h-[30%] min-h-[30%] w-full items-center pl-[33%] pr-[7%] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#813247]">
          <span className="block w-full overflow-hidden leading-[1.25]">
            {view === "upcoming" ? <>
              <span className="block truncate text-[clamp(14px,4.2vw,20px)] italic text-[#4d3027]">{longDate(item.date, true)}</span>
              <span className="block truncate text-[clamp(13px,3.8vw,18px)]"><strong className="font-normal text-[#813247]">{item.startTime}</strong> · {item.studentNameSnapshot}</span>
              <span className="block truncate text-[clamp(11px,3.3vw,16px)] italic">{item.subject} · {item.durationMinutes} min</span>
            </> : <>
              <span className="block truncate text-[clamp(12px,3.5vw,17px)]"><span className="text-[#813247]">{longDate(item.date)}</span> · {item.studentNameSnapshot}</span>
              <span className="block truncate text-[clamp(14px,4.2vw,20px)] italic">{item.subject}</span>
              <span className="block truncate text-[clamp(11px,3.2vw,15px)] italic">{item.topic || "Argomento da annotare"}</span>
              <span className="block text-[clamp(10px,2.9vw,14px)]">{item.durationMinutes} min · {item.status === "attesa" ? "In attesa" : "Confermata"}</span>
            </>}
          </span>
        </Link>)}
      </section>
      <nav aria-label="Navigazione principale" className="absolute inset-x-[2%] bottom-[1%] h-[10%]">{[["/studenti","Studenti"],["/calendario","Calendario"],["/lezioni","Lezione"],["/materie","Materie"],["/menu","Menu"]].map(([href,label],i)=><Link key={label} href={href} aria-label={label} className="absolute inset-y-0 w-[20%]" style={{left:`${i*20}%`}}/>)}</nav>
    </div>
  </main>;
}
