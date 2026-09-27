"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import CalendarFrame from "./CalendarFrame";
import { addDays, formatLocalDate, isLocalDate, parseLocalDate, startOfLocalWeek, toLocalDate } from "../data/calendario/calendar-dates";
import { selectOccurrencesInRange } from "../data/calendario/calendar-selectors";
import { loadCalendarAppointments, loadCalendarSeries } from "../data/calendario/calendar-storage";
import type { CalendarAppointment, CalendarSeries } from "../data/calendario/calendar-types";

const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
export default function MonthPage() { return <Suspense fallback={<main className="min-h-dvh bg-[#efe3ce]" />}><Month /></Suspense>; }
function Month() {
  const router = useRouter();
  const search = useSearchParams();
  const today = useMemo(() => toLocalDate(new Date()), []);
  const requested = search.get("data");
  const selected = isLocalDate(requested) ? requested : today;
  const parts = parseLocalDate(selected)!;
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);
  useEffect(() => { queueMicrotask(() => { setAppointments(loadCalendarAppointments()); setSeries(loadCalendarSeries()); }); }, []);
  const first = formatLocalDate({ year: parts.year, month: parts.month, day: 1 });
  const dates = useMemo(() => Array.from({length: 42}, (_, i) => addDays(startOfLocalWeek(first), i)), [first]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of selectOccurrencesInRange(appointments, series, dates[0], dates[41])) if (item.status !== "annullata") map.set(item.date, (map.get(item.date) ?? 0) + 1);
    return map;
  }, [appointments, series, dates]);
  function shift(n: number) { const d = new Date(Date.UTC(parts.year, parts.month - 1 + n, 1)); router.push(`/calendario?data=${formatLocalDate({year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:1})}`); }
  return <CalendarFrame view="month" date={selected} previous={() => shift(-1)} next={() => shift(1)}>
    <h1 aria-live="polite" className="absolute left-[18%] top-[21.8%] w-[64%] text-center font-entry-elegant text-[clamp(16px,4.8vw,22px)] text-[#642b36]">{months[parts.month - 1]} {parts.year}</h1>
    <section aria-label={`${months[parts.month-1]} ${parts.year}`} className="absolute left-[3.4%] top-[31.85%] z-20 grid h-[39.7%] w-[93.2%] grid-cols-7 grid-rows-6">
      {dates.map(date => { const p = parseLocalDate(date)!; const count = counts.get(date) ?? 0; return <Link key={date} href={`/calendario/giorno?data=${date}`} aria-label={`${date}, ${count} lezioni`} aria-current={date === today ? "date" : undefined} className={`relative flex flex-col items-center justify-center font-entry-elegant ${p.month !== parts.month ? "opacity-40" : ""}`}>
        <span className={`flex h-[clamp(24px,8vw,36px)] w-[clamp(24px,8vw,36px)] items-center justify-center rounded-full text-[clamp(14px,4vw,19px)] ${date === today ? "bg-[#842e42] text-[#fff6e8]" : "text-[#422a21]"}`}>{p.day}</span>
        {count > 0 && <span className="absolute bottom-[7%] text-[clamp(9px,2.5vw,12px)] text-[#883e4a]" aria-hidden="true">{count > 3 ? `${count}` : "●".repeat(count)}</span>}
      </Link>; })}
    </section>
  </CalendarFrame>;
}
