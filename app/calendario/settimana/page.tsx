"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import CalendarFrame from "../CalendarFrame";
import { addDays, isLocalDate, parseLocalDate, startOfLocalWeek, toLocalDate } from "../../data/calendario/calendar-dates";
import { selectWeekOccurrences } from "../../data/calendario/calendar-selectors";
import { loadCalendarAppointments, loadCalendarSeries } from "../../data/calendario/calendar-storage";
import type { CalendarAppointment, CalendarSeries } from "../../data/calendario/calendar-types";
const months = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
export default function WeekPage() { return <Suspense fallback={<main className="min-h-dvh bg-[#efe3ce]" />}><Week /></Suspense>; }
function Week() {
  const router = useRouter(); const search = useSearchParams();
  const today = useMemo(() => toLocalDate(new Date()), []);
  const requested = search.get("data"); const selected = isLocalDate(requested) ? requested : today;
  const start = startOfLocalWeek(selected); const dates = useMemo(() => Array.from({length:7},(_,i)=>addDays(start,i)),[start]);
  const [appointments,setAppointments] = useState<CalendarAppointment[]>([]); const [series,setSeries] = useState<CalendarSeries[]>([]);
  useEffect(() => { queueMicrotask(() => {setAppointments(loadCalendarAppointments());setSeries(loadCalendarSeries());}); }, []);
  const counts = useMemo(() => { const map = new Map<string,number>(); for(const item of selectWeekOccurrences(appointments,series,selected)) if(item.status !== "annullata") map.set(item.date,(map.get(item.date)??0)+1); return map; },[appointments,series,selected]);
  const a = parseLocalDate(start)!, b = parseLocalDate(dates[6])!;
  const title = a.month === b.month ? `${a.day} – ${b.day} ${months[b.month-1]} ${b.year}` : `${a.day} ${months[a.month-1]} – ${b.day} ${months[b.month-1]} ${b.year}`;
  return <CalendarFrame view="week" date={selected} previous={() => router.push(`/calendario/settimana?data=${addDays(start,-7)}`)} next={() => router.push(`/calendario/settimana?data=${addDays(start,7)}`)}>
    <h1 aria-live="polite" className="absolute left-[18%] top-[21.9%] w-[64%] whitespace-nowrap text-center font-entry-elegant text-[clamp(14px,3.8vw,19px)] text-[#642b36]">{title}</h1>
    <section aria-label="Giorni della settimana" className="absolute left-[3.5%] top-[28.05%] z-20 grid h-[59.5%] w-[93%] grid-rows-7">
      {dates.map(date => {const p=parseLocalDate(date)!; const count=counts.get(date)??0; return <Link key={date} href={`/calendario/giorno?data=${date}`} aria-label={`${date}, ${count} ${count===1?"lezione":"lezioni"}`} className="relative min-h-0 font-entry-elegant">
        <span className={`absolute left-[19%] top-[73%] -translate-y-1/2 text-[clamp(11px,3vw,15px)] ${date===today?"font-semibold text-[#9e293d]":"text-[#654836]"}`}>{p.day} {months[p.month-1]}</span>
        <span className="absolute right-[9%] top-1/2 -translate-y-1/2 text-[clamp(11px,3vw,15px)] text-[#79384a]">{count} {count===1?"lezione":"lezioni"}</span>
      </Link>;})}
    </section>
  </CalendarFrame>;
}
