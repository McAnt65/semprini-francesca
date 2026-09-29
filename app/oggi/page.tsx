"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import background from "../assets/today-diary-watercolor.webp";
import { addDays, toLocalDate } from "../data/calendario/calendar-dates";
import { selectOccurrencesInRange } from "../data/calendario/calendar-selectors";
import { loadCalendarAppointments, loadCalendarSeries } from "../data/calendario/calendar-storage";
import type { CalendarOccurrence } from "../data/calendario/calendar-types";
import { loadStoredStudents } from "../data/student-storage";
import type { StudentRecord } from "../data/students";

const menu = [
  { href: "/studenti", label: "Studenti", icon: "students" },
  { href: "/lezioni", label: "Lezioni", icon: "lessons" },
  { href: "/tariffario", label: "Tariffe e pagamenti", icon: "payments" },
  { href: "/materie", label: "Materie", icon: "subjects" },
  { href: "/calendario", label: "Calendario", icon: "calendar" },
];

function DiaryIcon({ name }: { name: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg aria-hidden="true" viewBox="0 0 48 42" className="h-7 w-8 text-[#856347]" {...common}>
    {name === "students" && <><circle cx="24" cy="12" r="5" /><path d="M14 34c0-8 4-12 10-12s10 4 10 12M10 18a4 4 0 1 1 3-7M7 32c0-6 2-10 7-11M38 18a4 4 0 1 0-3-7M41 32c0-6-2-10-7-11" /></>}
    {name === "lessons" && <><path d="M24 36c-6-4-12-4-19-3V8c7-1 13-1 19 3 6-4 12-4 19-3v25c-7-1-13-1-19 3ZM24 11v25M9 15c4-.5 8 0 11 2M28 17c3-2 7-2.5 11-2M9 22c4-.5 8 0 11 2M28 24c3-2 7-2.5 11-2" /></>}
    {name === "payments" && <><ellipse cx="18" cy="11" rx="10" ry="4" /><path d="M8 11v10c0 2 4 4 10 4 2 0 4-.2 6-1M8 16c3 3 11 4 16 2M24 20v11c0 3 4 5 10 5s10-2 10-5V20" /><ellipse cx="34" cy="20" rx="10" ry="4" /><path d="M24 25c4 3 16 3 20 0" /></>}
    {name === "subjects" && <><path d="m4 18 20-10 20 10-20 10L4 18ZM13 24v9c8 5 14 5 22 0v-9M43 19v13" /><circle cx="43" cy="34" r="2" /></>}
    {name === "calendar" && <><rect x="6" y="9" width="36" height="29" rx="2" /><path d="M6 18h36M15 5v8M33 5v8M14 25h5M25 25h5M14 32h5M25 32h5" /></>}
  </svg>;
}

function dateTitle(date: string) {
  return new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" }).format(new Date(date + "T12:00:00"));
}

function phoneHref(value: string) {
  const normalized = value.replace(/[^\d+]/g, "");
  return normalized ? "tel:" + normalized : "";
}

export default function TodayPage() {
  const [today, setToday] = useState("");
  const [lessons, setLessons] = useState<CalendarOccurrence[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);

  useEffect(() => {
    function refresh() {
      const day = toLocalDate(new Date());
      const upcoming = selectOccurrencesInRange(
        loadCalendarAppointments(), loadCalendarSeries(), day, addDays(day, 1)
      ).filter((item) => item.status !== "annullata")
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
      setToday(day);
      setLessons(upcoming);
      setStudents(loadStoredStudents());
    }
    queueMicrotask(refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const tomorrow = today ? addDays(today, 1) : "";
  const todayLessons = lessons.filter((item) => item.date === today);
  const tomorrowLessons = lessons.filter((item) => item.date === tomorrow);
  const byId = new Map(students.map((student) => [student.id, student]));

  return <main className="min-h-dvh w-full bg-[#f2e6d2] text-[#4f3528]">
    <div className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[#fbf1de] shadow-[0_8px_35px_#53331b30]">
      <Image src={background} alt="" fill priority unoptimized sizes="(max-width: 430px) 100vw, 430px" className="pointer-events-none object-fill" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-[8%]">
        <header className="shrink-0 pt-3">
          <div className="flex min-h-11 items-center justify-between font-entry-elegant text-base">
            <Link href="/" aria-label="Torna alla copertina" className="rounded-lg px-1 py-2">‹ Copertina</Link>
            <Link href="/menu" className="rounded-lg px-2 py-2 text-[#702f3e]">☰ Menù</Link>
          </div>
          <p className="mt-2 text-center font-entry-elegant text-xs tracking-[.12em] text-[#8a6546]">IL DIARIO DI FRANCESCA</p>
          <h1 className="mt-2 text-center font-handwritten text-[clamp(43px,12vw,58px)] leading-tight text-[#71313b]">Oggi</h1>
          <p className="text-center font-entry-elegant text-[clamp(16px,4.4vw,20px)] capitalize">{today ? dateTitle(today) : "Il diario della giornata"}</p>
          <div className="mx-auto mt-3 flex w-[75%] items-center gap-2 text-[#9b7359]" aria-hidden="true"><span className="h-px flex-1 bg-current/65" /><span className="text-xs">✦</span><span className="h-px flex-1 bg-current/65" /></div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-5 [scrollbar-color:#ad9471_transparent] [scrollbar-width:thin]" aria-label="Diario di oggi e domani" tabIndex={0}>
        <section aria-labelledby="today-lessons" className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <h2 id="today-lessons" className="font-entry-elegant text-[clamp(22px,6vw,27px)] text-[#71313b]">Le lezioni di oggi</h2>
            <Link href={today ? "/calendario/giorno?data=" + today : "/calendario/giorno"} className="font-entry-elegant text-sm underline underline-offset-4">Apri agenda</Link>
          </div>
          {today && todayLessons.length === 0 && <p className="py-8 font-entry-elegant text-lg text-[#765b46]">Oggi non ci sono lezioni in programma.</p>}
          <div className="mt-2">
            {todayLessons.map((lesson) => {
              const student = byId.get(lesson.studentId);
              const address = student && [student.address, student.city, student.province].filter(Boolean).join(", ");
              const phone = student?.phone || student?.whatsapp || "";
              return <article key={lesson.occurrenceId} className="border-b border-[#9b7554]/55 py-4">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <p className="font-entry-elegant text-lg text-[#703242]">{lesson.startTime} <span className="text-sm text-[#715540]">· {lesson.durationMinutes} min</span></p>
                  <span aria-hidden="true" className="text-[#98745c]">│</span>
                  <Link href={"/studenti/" + encodeURIComponent(lesson.studentId)} className="font-entry-elegant text-xl text-[#513326] underline decoration-[#a98b6b]/50 underline-offset-4">{student ? student.firstName + " " + student.lastName : lesson.studentNameSnapshot}</Link>
                  {lesson.status !== "confermata" && <span className="font-entry-elegant text-xs capitalize text-[#805b48]">{lesson.status}</span>}
                </div>
                {phone && <a href={phoneHref(phone)} className="inline-block font-entry-elegant text-sm text-[#743d42] underline underline-offset-4" aria-label={"Chiama " + lesson.studentNameSnapshot}>{phone}</a>}
                <p className="mt-1 font-entry-elegant text-base">{lesson.subject}{lesson.topic ? " · " + lesson.topic : ""}</p>
                {lesson.mode === "domicilio" && <p className="mt-1 font-entry-elegant text-sm text-[#6e5844]">
                  A domicilio{address ? " · " : ""}
                  {address && <a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{address} ↗</a>}
                  {lesson.travelMinutes ? " · Spostamento previsto " + lesson.travelMinutes + " min" : ""}
                </p>}
                {lesson.mode === "online" && <p className="font-entry-elegant text-sm text-[#6e5844]">Online</p>}
                <Link href={"/calendario/" + encodeURIComponent(lesson.appointmentId ?? lesson.occurrenceId) + "/modifica?data=" + lesson.date} className="mt-2 inline-block font-entry-elegant text-sm text-[#71313b] underline underline-offset-4">Apri la lezione</Link>
              </article>;
            })}
          </div>
          <Link href={today ? "/calendario/nuova?data=" + today : "/calendario/nuova"} className="mt-4 inline-block rounded-full border border-[#98745c]/50 bg-[#f8ecda]/70 px-4 py-2 font-entry-elegant text-sm text-[#71313b]">+ Nuova lezione</Link>
        </section>

        <section aria-labelledby="tomorrow-lessons" className="mt-8 border-t border-[#a88965]/50 pt-5">
          <h2 id="tomorrow-lessons" className="font-handwritten text-[clamp(30px,8vw,38px)] text-[#71313b]">Domani</h2>
          <p className="font-entry-elegant text-sm capitalize text-[#82674e]">{tomorrow ? dateTitle(tomorrow) : ""}</p>
          {tomorrow && tomorrowLessons.length === 0 && <p className="mt-3 font-entry-elegant text-base">Nessuna lezione prevista per domani.</p>}
          <ul className="mt-3 space-y-2 font-entry-elegant">
            {tomorrowLessons.map((lesson) => <li key={lesson.occurrenceId} className="border-b border-[#ad9471]/35 pb-2">
              <span className="text-[#71313b]">{lesson.startTime}</span> · {lesson.studentNameSnapshot} · {lesson.subject}
              {lesson.topic && <span className="block pl-6 text-sm text-[#765b46]">Da preparare: {lesson.topic}</span>}
            </li>)}
          </ul>
          {tomorrow && <Link href={"/calendario/giorno?data=" + tomorrow} className="mt-3 inline-block text-sm text-[#71313b] underline underline-offset-4">Agenda di domani</Link>}
        </section>

        </div>
        <nav aria-label="Sezioni principali" className="shrink-0 border-t border-[#a88965]/60 bg-[#fbf1de]/95 py-1.5">
          <div className="grid grid-cols-5 divide-x divide-[#ac9272]/45">
            {menu.map((item) => <Link key={item.href} href={item.href} className="flex min-h-[67px] flex-col items-center justify-center gap-0.5 px-0.5 text-center font-entry-elegant text-[clamp(9px,2.5vw,12px)] leading-tight text-[#623b2e] focus-visible:outline-2 focus-visible:outline-[#71313b]"><DiaryIcon name={item.icon} />{item.label}</Link>)}
          </div>
        </nav>
      </div>
    </div>
  </main>;
}
