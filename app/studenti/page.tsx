"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { students, type StudentRecord } from "../data/students";
import { loadStoredStudents } from "../data/student-storage";
import { loadCalendarAppointments, loadCalendarSeries } from "../data/calendario/calendar-storage";
import { selectOccurrencesInRange } from "../data/calendario/calendar-selectors";
import { addDays, toLocalDate, toLocalTime } from "../data/calendario/calendar-dates";
import background from "../assets/students-register-watercolor.webp";

type SubjectFilter = "Tutte" | "Matematica" | "Fisica" | "Chimica";
type SortMode = "az" | "lesson" | "recent";

function normalizeSubject(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized.startsWith("mat")) return "Matematica";
  if (normalized.startsWith("fis")) return "Fisica";
  if (normalized.startsWith("chi")) return "Chimica";

  return value;
}

function nextLessonTime(student: StudentRecord) {
  if (!student.nextLesson) return Number.POSITIVE_INFINITY;

  const value = new Date(student.nextLesson).getTime();

  return Number.isNaN(value)
    ? Number.POSITIVE_INFINITY
    : value;
}

function updatedTime(student: StudentRecord) {
  if (!student.updatedAt) return 0;

  const value = new Date(student.updatedAt).getTime();

  return Number.isNaN(value) ? 0 : value;
}

function formatLesson(value?: string) {
  if (!value) return "Da fissare";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Da fissare";
  }

  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function StudentsPage() {
  const [allStudents, setAllStudents] = useState<StudentRecord[]>(students);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<SubjectFilter>("Tutte");
  const [sortMode, setSortMode] = useState<SortMode>("az");

  useEffect(() => {
    const storedStudents = loadStoredStudents();
    const storedIds = new Set(storedStudents.map((student) => student.id));
    const now = new Date();
    const today = toLocalDate(now);
    const currentTime = toLocalTime(now);
    const nextByStudent = new Map<string, string>();
    const upcoming = selectOccurrencesInRange(
      loadCalendarAppointments(),
      loadCalendarSeries(),
      today,
      addDays(today, 366)
    );
    for (const lesson of upcoming) {
      if (lesson.status === "annullata" || (lesson.date === today && lesson.startTime < currentTime)) continue;
      const next = `${lesson.date}T${lesson.startTime}`;
      const previous = nextByStudent.get(lesson.studentId);
      if (!previous || next < previous) nextByStudent.set(lesson.studentId, next);
    }
    queueMicrotask(() => setAllStudents([
      ...storedStudents,
      ...students.filter((student) => !storedIds.has(student.id)),
    ].map((student) => ({
      ...student,
      nextLesson: nextByStudent.get(student.id),
    }))));
  }, []);

  const visibleStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = allStudents.filter((student) => {
      const normalizedSubjects =
        student.subjects.map(normalizeSubject);

      const matchesSubject =
        subject === "Tutte" ||
        normalizedSubjects.includes(subject);

      if (!matchesSubject) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        student.firstName,
        student.lastName,
        student.school,
        student.gradeClass,
        ...normalizedSubjects,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "lesson") {
        return nextLessonTime(a) - nextLessonTime(b);
      }

      if (sortMode === "recent") {
        return updatedTime(b) - updatedTime(a);
      }

      return `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`,
        "it",
        {
          sensitivity: "base",
        }
      );
    });
  }, [allStudents, query, subject, sortMode]);

  return (
    <main className="min-h-dvh w-full bg-[#f6eddb] text-[#4e3426]">
      <div className="relative mx-auto flex h-dvh min-h-[570px] w-full max-w-[430px] flex-col overflow-hidden bg-[#f8f0e1] sm:h-[min(850px,100dvh)] sm:rounded-[28px] sm:shadow-xl">
        <Image src={background} alt="" fill priority unoptimized sizes="(max-width: 430px) 100vw, 430px" className="pointer-events-none object-fill" />

        <header className="relative z-10 shrink-0 px-[5%] pt-[2%]">
          <div className="flex h-12 items-center justify-between font-entry-elegant text-[clamp(16px,4.5vw,21px)]">
            <Link href="/menu" aria-label="Indietro al menù" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-[#754838]">←</Link>
            <Link href="/menu" className="flex min-h-11 items-center rounded-lg px-2 underline decoration-[#896f50]/50 underline-offset-4">Menù</Link>
          </div>
          <h1 className="mt-2 text-center font-handwritten text-[clamp(36px,10vw,56px)] leading-[1.08] text-[#683c2b]">I miei studenti</h1>
          <div className="mx-auto mt-1 w-[40%] border-b border-[#ad9471]/65" />
        </header>

        <div className="relative z-10 mt-7 flex shrink-0 gap-2 px-[5%]">
          <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#aa8f6d]/65 bg-[#fff9ed]/55 px-3 shadow-[0_1px_3px_#8c6b4920]">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-[#7b603d]"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.7" /><path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            <span className="sr-only">Cerca uno studente</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca studente" className="w-full min-w-0 bg-transparent font-entry-elegant text-[clamp(15px,4vw,18px)] outline-none placeholder:text-[#907b69]" />
          </label>
          <Link href="/studenti/nuovo" className="flex h-12 shrink-0 items-center justify-center rounded-xl border border-[#8b9273]/60 bg-[#eaf0df]/70 px-3 font-entry-elegant text-[clamp(16px,4.2vw,20px)] shadow-[0_1px_3px_#8c6b4920]">Nuovo <span aria-hidden="true" className="ml-1 text-2xl">+</span></Link>
        </div>

        <div className="relative z-10 mt-5 flex shrink-0 items-end justify-between gap-2 border-b border-[#a88d69]/60 px-[5%] pb-2 font-entry-elegant">
          <div aria-label="Filtra per materia" className="flex min-w-0 flex-wrap items-center gap-x-[clamp(8px,2.6vw,15px)] gap-y-1">
            {(["Tutte", "Matematica", "Fisica", "Chimica"] as SubjectFilter[]).map((filter) => (
              <button key={filter} type="button" onClick={() => setSubject(filter)} aria-pressed={subject === filter}
                className={"min-h-9 border-b-2 px-0.5 text-[clamp(12px,3.25vw,16px)] " + (subject === filter ? "border-[#66745b] text-[#593724]" : "border-transparent text-[#6b4e3b]")}>{filter}</button>
            ))}
          </div>
          <label className="flex shrink-0 items-center gap-1 pb-1 text-[clamp(11px,2.8vw,14px)]">
            <span className="sr-only">Ordina studenti</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="max-w-[83px] bg-transparent text-[#68442e] outline-none" aria-label="Ordina studenti">
              <option value="az">A–Z</option><option value="lesson">Lezione</option><option value="recent">Recenti</option>
            </select>
          </label>
        </div>

        <section aria-label="Elenco degli studenti" className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-[5%] pb-16 [scrollbar-color:#ad9471_transparent] [scrollbar-width:thin]">
          {visibleStudents.map((student) => (
            <Link key={student.id} href={"/studenti/" + encodeURIComponent(student.id)}
              aria-label={"Apri il profilo di " + student.firstName + " " + student.lastName}
              className="grid min-h-[76px] grid-cols-[22px_minmax(0,1.4fr)_minmax(0,.8fr)_minmax(0,.8fr)] items-center gap-2 border-b border-[#a88d69]/55 py-2 font-entry-elegant focus-visible:outline-2 focus-visible:outline-[#754838]">
              <PenNib />
              <span className="min-w-0 text-[clamp(16px,4.1vw,21px)] leading-tight text-[#593326]">{student.firstName} {student.lastName}</span>
              <span className="min-w-0 text-center text-[clamp(11px,2.8vw,14px)] leading-tight text-[#675743]">{student.subjects.map(normalizeSubject).join(" · ") || "—"}</span>
              <span className="min-w-0 text-right text-[clamp(11px,2.7vw,14px)] leading-tight text-[#593e30]">{formatLesson(student.nextLesson)}</span>
            </Link>
          ))}
          {visibleStudents.length === 0 && (
            <p className="pt-12 text-center font-entry-elegant text-lg text-[#765d48]">{allStudents.length === 0 ? "Nessuno studente inserito. Inizia con Nuovo +." : "Nessuno studente corrisponde alla ricerca."}</p>
          )}
        </section>
      </div>
    </main>
  );
}

function PenNib() {
  return <svg aria-hidden="true" viewBox="0 0 32 44" fill="none" className="h-7 w-5 shrink-0 text-[#907550]">
    <path d="M16 2 4 25l12 17 12-17L16 2Z" stroke="currentColor" strokeWidth="1.25" />
    <path d="M16 13v28M12 24a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z" stroke="currentColor" strokeWidth="1.2" />
  </svg>;
}
