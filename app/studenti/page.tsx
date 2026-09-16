"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { students, type StudentRecord } from "../data/students";

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
  return Number.isNaN(value) ? Number.POSITIVE_INFINITY : value;
}

function updatedTime(student: StudentRecord) {
  if (!student.updatedAt) return 0;
  const value = new Date(student.updatedAt).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function formatLesson(value?: string) {
  if (!value) return "Da fissare";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Da fissare";

  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function StudentsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<SubjectFilter>("Tutte");
  const [sortMode, setSortMode] = useState<SortMode>("az");

  const visibleStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = students.filter((student) => {
      const normalizedSubjects = student.subjects.map(normalizeSubject);
      const matchesSubject = subject === "Tutte" || normalizedSubjects.includes(subject);
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
      if (sortMode === "lesson") return nextLessonTime(a) - nextLessonTime(b);
      if (sortMode === "recent") return updatedTime(b) - updatedTime(a);

      return `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`,
        "it",
        { sensitivity: "base" }
      );
    });
  }, [query, subject, sortMode]);

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce] text-[#4b3024]">
      <div className="mx-auto w-full max-w-[430px] px-0 sm:py-3">
        <div className="relative aspect-[977/1610] w-full overflow-hidden bg-[#f4e7cf] shadow-[0_10px_40px_rgba(72,48,30,0.16)] sm:rounded-[28px]">
          <img
            src="/students-register-bg.png?v=20260916-1"
            alt="Registro illustrato degli studenti"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Indietro"
            className="antique-clickable absolute left-[3.2%] top-[1.4%] z-30 h-[5.2%] w-[23%] bg-transparent"
          />

          <Link
            href="/menu"
            aria-label="Torna al menù"
            className="antique-clickable absolute right-[3.2%] top-[1.4%] z-30 h-[5.2%] w-[21%] bg-transparent"
          />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca studente"
            aria-label="Cerca uno studente"
            className="absolute left-[6.2%] top-[21.3%] z-30 h-[6.2%] w-[59.5%] border-0 bg-transparent px-[7.2%] font-serif text-[clamp(12px,3.4vw,16px)] italic text-[#4b3024] outline-none placeholder:text-[#8b6f5a]/75 focus:bg-transparent focus:placeholder:text-transparent"
          />

          <Link
            href="/studenti/nuovo"
            aria-label="Nuovo studente"
            className="antique-clickable absolute left-[67.5%] top-[21.3%] z-30 h-[6.2%] w-[28.4%] rounded-[16px] bg-transparent"
          />

          <button
            type="button"
            onClick={() => setSubject(subject === "Matematica" ? "Tutte" : "Matematica")}
            aria-label="Filtra Matematica"
            aria-pressed={subject === "Matematica"}
            className="antique-clickable absolute left-[5.2%] top-[27.1%] z-30 h-[11.9%] w-[29.1%] rounded-[12px] bg-transparent"
          />
          <button
            type="button"
            onClick={() => setSubject(subject === "Fisica" ? "Tutte" : "Fisica")}
            aria-label="Filtra Fisica"
            aria-pressed={subject === "Fisica"}
            className="antique-clickable absolute left-[35.4%] top-[27.1%] z-30 h-[11.9%] w-[29.1%] rounded-[12px] bg-transparent"
          />
          <button
            type="button"
            onClick={() => setSubject(subject === "Chimica" ? "Tutte" : "Chimica")}
            aria-label="Filtra Chimica"
            aria-pressed={subject === "Chimica"}
            className="antique-clickable absolute right-[5.2%] top-[27.1%] z-30 h-[11.9%] w-[29.1%] rounded-[12px] bg-transparent"
          />

          <section className="absolute bottom-[15.4%] left-[3.5%] right-[3.5%] top-[39.4%] z-20 overflow-hidden bg-transparent">
            <div className="relative h-[12.2%] bg-transparent">
              <button
                type="button"
                onClick={() => setSubject("Tutte")}
                aria-label="Mostra tutti gli studenti"
                aria-pressed={subject === "Tutte"}
                className="antique-clickable absolute left-[2.5%] top-[35%] h-[38%] w-[18%] rounded-full bg-transparent"
              />
              <button
                type="button"
                onClick={() => setSubject("Matematica")}
                aria-label="Mostra studenti di Matematica"
                aria-pressed={subject === "Matematica"}
                className="antique-clickable absolute left-[21.5%] top-[35%] h-[38%] w-[23%] rounded-full bg-transparent"
              />
              <button
                type="button"
                onClick={() => setSubject("Fisica")}
                aria-label="Mostra studenti di Fisica"
                aria-pressed={subject === "Fisica"}
                className="antique-clickable absolute left-[45.5%] top-[35%] h-[38%] w-[17%] rounded-full bg-transparent"
              />
              <button
                type="button"
                onClick={() => setSubject("Chimica")}
                aria-label="Mostra studenti di Chimica"
                aria-pressed={subject === "Chimica"}
                className="antique-clickable absolute left-[63.5%] top-[35%] h-[38%] w-[20%] rounded-full bg-transparent"
              />

              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                aria-label="Ordina studenti"
                className="absolute right-[2%] top-[2%] h-[42%] w-[31%] cursor-pointer opacity-0"
              >
                <option value="az">A–Z</option>
                <option value="lesson">Prossima lezione</option>
                <option value="recent">Più recenti</option>
              </select>
            </div>

            <div className="h-[87.8%] overflow-y-auto overscroll-contain px-[2%] [scrollbar-color:#9a7657_transparent] [scrollbar-width:thin]">
              {visibleStudents.map((student) => (
                <StudentRow key={student.id} student={student} />
              ))}

              {visibleStudents.length === 0 && (
                <div className="flex min-h-36 items-center justify-center px-6 text-center">
                  <p className="font-serif text-sm italic text-[#80644f]">
                    Nessuno studente corrisponde alla ricerca.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function StudentRow({ student }: { student: StudentRecord }) {
  const subjects = student.subjects.map(normalizeSubject);

  return (
    <div className="grid min-h-[58px] grid-cols-[1.18fr_1fr_.9fr_.92fr] gap-2 border-b border-[#a8886e]/22 px-2 py-2.5 text-[#4b3024]">
      <div className="min-w-0">
        <Link
          href={`/studenti/${student.id}`}
          className="block truncate font-serif text-[clamp(11px,3vw,14px)] italic underline decoration-[#8f6b50]/55 decoration-1 underline-offset-2"
        >
          {student.firstName} {student.lastName}
        </Link>
      </div>

      <div className="min-w-0 font-serif text-[clamp(8px,2.2vw,10px)] leading-tight text-[#5e493b]">
        <div className="line-clamp-2">{student.school || "—"}</div>
        {student.gradeClass && <div className="mt-0.5 italic text-[#816954]">{student.gradeClass}</div>}
      </div>

      <div className="flex min-w-0 flex-wrap content-start gap-1">
        {subjects.length > 0 ? (
          subjects.map((item) => <SubjectTag key={item} subject={item} />)
        ) : (
          <span className="font-serif text-[clamp(8px,2.1vw,10px)] italic text-[#8a7463]">—</span>
        )}
      </div>

      <div className="font-serif text-[clamp(8px,2.2vw,10px)] leading-tight text-[#5e493b]">
        {formatLesson(student.nextLesson)}
      </div>
    </div>
  );
}

function SubjectTag({ subject }: { subject: string }) {
  return (
    <span className="rounded-[5px] bg-transparent px-1 py-0.5 font-serif text-[clamp(7px,1.9vw,9px)] italic text-[#594234]">
      {subject}
    </span>
  );
}
