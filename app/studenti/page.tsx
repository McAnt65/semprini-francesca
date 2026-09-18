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
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<SubjectFilter>("Tutte");
  const [sortMode, setSortMode] = useState<SortMode>("az");

  const subjectCounts = useMemo(() => {
    const countBySubject = (subjectName: SubjectFilter) =>
      students.filter((student) =>
        student.subjects
          .map(normalizeSubject)
          .includes(subjectName)
      ).length;

    return {
      Matematica: countBySubject("Matematica"),
      Fisica: countBySubject("Fisica"),
      Chimica: countBySubject("Chimica"),
    };
  }, []);

  const visibleStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = students.filter((student) => {
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
  }, [query, subject, sortMode]);

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce] text-sepia">
      <div className="mx-auto w-full max-w-[430px] px-0 sm:py-3">
        <div className="relative aspect-[977/1610] w-full overflow-hidden bg-[#f4e7cf] shadow-[0_10px_40px_rgba(72,48,30,0.16)] sm:rounded-[28px]">

          <img
            src="/students-register-bg.png?v=20260916-1"
            alt="Registro illustrato degli studenti"
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* INDIETRO */}
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Indietro"
            className="antique-clickable absolute left-[3.2%] top-[1.4%] z-30 h-[5.2%] w-[23%] bg-transparent"
          />

          {/* MENU */}
          <Link
            href="/menu"
            aria-label="Torna al menù"
            className="antique-clickable absolute right-[3.2%] top-[1.4%] z-30 h-[5.2%] w-[21%] bg-transparent"
          />

          {/* CERCA STUDENTE */}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca studente"
            aria-label="Cerca uno studente"
            className="font-entry-elegant absolute left-[6.2%] top-[21.3%] z-30 h-[6.2%] w-[59.5%] border-0 bg-transparent pl-[12%] pr-[3%] pt-[6%] text-[clamp(12px,3.4vw,16px)] text-sepia outline-none placeholder:text-[#8b6f5a]/75 focus:bg-transparent focus:placeholder:text-transparent"
          />

          {/* NUOVO STUDENTE */}
          <Link
            href="/studenti/nuovo"
            aria-label="Nuovo studente"
            className="antique-clickable absolute left-[67.5%] top-[21.3%] z-30 h-[6.2%] w-[28.4%] rounded-[16px] bg-transparent"
          />

          {/* CARD MATEMATICA */}
          <button
            type="button"
            onClick={() =>
              setSubject(
                subject === "Matematica"
                  ? "Tutte"
                  : "Matematica"
              )
            }
            aria-label="Filtra Matematica"
            aria-pressed={subject === "Matematica"}
            className="antique-clickable absolute left-[5.2%] top-[27.1%] z-30 h-[11.9%] w-[29.1%] rounded-[12px] bg-transparent"
          />

          {/* CARD FISICA */}
          <button
            type="button"
            onClick={() =>
              setSubject(
                subject === "Fisica"
                  ? "Tutte"
                  : "Fisica"
              )
            }
            aria-label="Filtra Fisica"
            aria-pressed={subject === "Fisica"}
            className="antique-clickable absolute left-[35.4%] top-[27.1%] z-30 h-[11.9%] w-[29.1%] rounded-[12px] bg-transparent"
          />

          {/* CARD CHIMICA */}
          <button
            type="button"
            onClick={() =>
              setSubject(
                subject === "Chimica"
                  ? "Tutte"
                  : "Chimica"
              )
            }
            aria-label="Filtra Chimica"
            aria-pressed={subject === "Chimica"}
            className="antique-clickable absolute right-[5.2%] top-[27.1%] z-30 h-[11.9%] w-[29.1%] rounded-[12px] bg-transparent"
          />

          {/* CONTATORI STUDENTI */}
          <div className="pointer-events-none absolute left-[5.2%] top-[39.6%] z-30 w-[29.1%] text-center font-entry-elegant text-[clamp(8px,1.9vw,10px)] text-sepia-soft">
            Studenti n° {subjectCounts.Matematica}
          </div>

          <div className="pointer-events-none absolute left-[35.4%] top-[39.6%] z-30 w-[29.1%] text-center font-entry-elegant text-[clamp(8px,1.9vw,10px)] text-sepia-soft">
            Studenti n° {subjectCounts.Fisica}
          </div>

          <div className="pointer-events-none absolute right-[5.2%] top-[39.6%] z-30 w-[29.1%] text-center font-entry-elegant text-[clamp(8px,1.9vw,10px)] text-sepia-soft">
            Studenti n° {subjectCounts.Chimica}
          </div>

          {/* AREA ELENCO STUDENTI */}
          <section className="absolute bottom-[15.4%] left-[3.5%] right-[3.5%] top-[39.4%] z-20 overflow-hidden bg-transparent">

            {/* FILTRI */}
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

              {/* ORDINA */}
              <select
                value={sortMode}
                onChange={(event) =>
                  setSortMode(event.target.value as SortMode)
                }
                aria-label="Ordina studenti"
                className="absolute right-[2%] top-[2%] h-[42%] w-[31%] cursor-pointer opacity-0"
              >
                <option value="az">A–Z</option>
                <option value="lesson">Prossima lezione</option>
                <option value="recent">Più recenti</option>
              </select>

            </div>

            {/* LISTA STUDENTI */}
            <div className="absolute bottom-0 left-0 right-0 top-[26%] overflow-y-auto overscroll-contain px-[2%] [scrollbar-color:#9a7657_transparent] [scrollbar-width:thin]">

              {visibleStudents.map((student) => (
                <StudentRow
                  key={student.id}
                  student={student}
                />
              ))}

              {visibleStudents.length === 0 && (
                <div className="flex min-h-36 items-center justify-center px-6 text-center">
                  <p className="font-entry-elegant text-sm text-sepia-soft">
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

/* =========================================================
   RIGA STUDENTE
   NOME - MATERIA - PROSSIMA LEZIONE
   ========================================================= */

function StudentRow({
  student,
}: {
  student: StudentRecord;
}) {
  const subjects =
    student.subjects.map(normalizeSubject);

  const subjectLabel =
    subjects.length > 0
      ? subjects.join(" · ")
      : "—";

  return (
    <div className="grid min-h-[58px] grid-cols-[1.45fr_1fr_1.15fr] items-center gap-1 border-b border-[#a8886e]/18 px-3 py-2 text-sepia">

      {/* NOME E COGNOME */}
      <div className="min-w-0 pl-[24px]">
        <Link
          href={`/studenti/${student.id}`}
          className="block truncate font-entry-elegant text-[clamp(11px,2.9vw,14px)] font-medium text-[#4b3024] underline decoration-[#7a5842]/40 decoration-1 underline-offset-[3px]"
        >
          {student.firstName} {student.lastName}
        </Link>
      </div>

      {/* MATERIA */}
      <div className="min-w-0 text-center">
        <div className="truncate font-entry-elegant text-[clamp(9px,2.3vw,11px)] font-medium text-[#5a4030]">
          {subjectLabel}
        </div>
      </div>

      {/* PROSSIMA LEZIONE */}
      <div className="min-w-0 text-center">
        <div className="font-entry-elegant text-[clamp(9px,2.2vw,10.5px)] font-medium leading-tight text-[#5a4030]">
          {formatLesson(student.nextLesson)}
        </div>
      </div>

    </div>
  );
}