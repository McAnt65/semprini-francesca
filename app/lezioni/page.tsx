"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toLocalDate } from "../data/calendario/calendar-dates";
import { selectOccurrencesInRange } from "../data/calendario/calendar-selectors";
import { loadCalendarAppointments, loadCalendarSeries } from "../data/calendario/calendar-storage";
import type { CalendarOccurrence } from "../data/calendario/calendar-types";

const dateLabel = (date: string) => new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));

export default function LessonsPage() {
  const [today, setToday] = useState("");
  const [todayLessons, setTodayLessons] = useState<CalendarOccurrence[]>([]);
  const [nextLesson, setNextLesson] = useState<CalendarOccurrence | null>(null);

  useEffect(() => {
    const now = new Date();
    const date = toLocalDate(now);
    const until = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    const lessons = selectOccurrencesInRange(loadCalendarAppointments(), loadCalendarSeries(), date, toLocalDate(until))
      .filter((item) => item.status !== "annullata")
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    queueMicrotask(() => {
      setToday(date);
      setTodayLessons(lessons.filter((item) => item.date === date));
      setNextLesson(lessons.find((item) => item.date > date || item.startTime >= time) ?? null);
    });
  }, []);

  return <main className="min-h-dvh overflow-x-hidden bg-[#f4eddf] text-[#493025]">
    <div className="relative mx-auto aspect-[941/1672] min-h-dvh w-full max-w-[430px] overflow-hidden sm:min-h-0">
      <Image src="/lezioni-menu.png" alt="" fill priority unoptimized sizes="(max-width: 430px) 100vw, 430px" className="pointer-events-none object-fill" />
      <h1 className="sr-only">Lezioni</h1>
      <Link href="/menu" aria-label="Indietro al menu" className="absolute left-[5%] top-[1%] h-[5%] w-[25%]" />
      <Link href="/menu" aria-label="Menu" className="absolute right-[4%] top-[1%] h-[5%] w-[25%]" />
      <Link href="/calendario/nuova" aria-label="Nuova lezione" className="absolute left-[6%] top-[19%] h-[23%] w-[88%]" />
      <Link href="/lezioni/in-programma" aria-label="Lezioni in programma" className="absolute left-[6%] top-[44%] h-[15%] w-[88%]" />
      <Link href="/lezioni/diario" aria-label="Diario delle lezioni" className="absolute left-[6%] top-[61%] h-[16%] w-[88%]" />
      <Link href={today ? `/calendario/giorno?data=${today}` : "/calendario/giorno"} aria-label="Lezioni di oggi" className="absolute left-[6%] top-[79%] h-[19%] w-[44%]" />
      <Link href={nextLesson ? `/calendario/giorno?data=${nextLesson.date}` : "/calendario"} aria-label="Prossima lezione" className="absolute left-[52%] top-[79%] h-[19%] w-[43%]" />
      <div aria-live="polite" className="pointer-events-none absolute left-[12%] top-[87%] w-[33%] overflow-hidden text-center font-entry-elegant text-[clamp(10px,2.6vw,13px)] leading-[1.35]">
        {todayLessons.length ? <><p>{todayLessons.length} {todayLessons.length === 1 ? "lezione" : "lezioni"}</p>{todayLessons.slice(0, 2).map(item => <p key={item.occurrenceId} className="truncate">{item.startTime} · {item.studentNameSnapshot}</p>)}</> : <p>Nessuna lezione prevista</p>}
      </div>
      <div aria-live="polite" className="pointer-events-none absolute left-[56%] top-[87%] w-[34%] overflow-hidden text-center font-entry-elegant text-[clamp(10px,2.6vw,13px)] leading-[1.35]">
        {nextLesson ? <><p>{dateLabel(nextLesson.date)} · {nextLesson.startTime}</p><p className="truncate">{nextLesson.studentNameSnapshot}</p><p className="truncate">{nextLesson.subject}</p></> : <p>Nessuna lezione in programma</p>}
      </div>
    </div>
  </main>;
}
