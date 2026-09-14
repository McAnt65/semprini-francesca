"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { students, type StudentRecord } from "../data/students";

type SubjectFilter = "Tutte" | "Matematica" | "Fisica" | "Chimica";
type SortMode = "az" | "lesson" | "recent";

const SUBJECTS: SubjectFilter[] = ["Tutte", "Matematica", "Fisica", "Chimica"];

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

  const subjectCounts = useMemo(() => {
    const counts = { Matematica: 0, Fisica: 0, Chimica: 0 };

    students.forEach((student) => {
      const unique = new Set(student.subjects.map(normalizeSubject));
      if (unique.has("Matematica")) counts.Matematica += 1;
      if (unique.has("Fisica")) counts.Fisica += 1;
      if (unique.has("Chimica")) counts.Chimica += 1;
    });

    return counts;
  }, []);

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
            src="/students-register-bg.png?v=20260912-2"
            alt="Registro illustrato degli studenti"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Indietro"
            className="absolute left-[3.2%] top-[1.4%] z-30 h-[5.2%] w-[23%] bg-transparent"
          />

          <Link
            href="/menu"
            aria-label="Torna al menù"
            className="absolute right-[3.2%] top-[1.4%] z-30 h-[5.2%] w-[21%] bg-transparent"
          />

          <div className="absolute left-[4.2%] right-[4.2%] top-[21.3%] z-20 flex items-center gap-2.5">
            <div className="relative flex-1 rounded-[14px] border border-[#a98663]/35 bg-[#f8ecd6]/94 px-4 py-2 shadow-[0_3px_10px_rgba(79,52,31,0.08)]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#71503b]">⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca uno studente…"
                aria-label="Cerca uno studente"
                className="w-full bg-transparent pl-6 pr-1 font-serif text-[clamp(12px,3.4vw,16px)] italic text-[#4b3024] outline-none placeholder:text-[#8b6f5a]/70"
              />
            </div>

            <Link
              href="/studenti/nuovo"
              className="shrink-0 rounded-[14px] border border-[#a98663]/40 bg-[#f1dfbf]/94 px-3 py-2 font-serif text-[clamp(11px,3.1vw,15px)] italic text-[#4b3024] shadow-[0_3px_10px_rgba(79,52,31,0.08)]"
            >
              + Nuovo
            </Link>
          </div>

          <div className="absolute left-[5.4%] right-[5.4%] top-[30.4%] z-20 grid grid-cols-3 gap-2">
            <SubjectCard
              label="Matematica"
              count={subjectCounts.Matematica}
              active={subject === "Matematica"}
              tone="sage"
              onClick={() => setSubject(subject === "Matematica" ? "Tutte" : "Matematica")}
            />
            <SubjectCard
              label="Fisica"
              count={subjectCounts.Fisica}
              active={subject === "Fisica"}
              tone="blue"
              onClick={() => setSubject(subject === "Fisica" ? "Tutte" : "Fisica")}
            />
            <SubjectCard
              label="Chimica"
              count={subjectCounts.Chimica}
              active={subject === "Chimica"}
              tone="rose"
              onClick={() => setSubject(subject === "Chimica" ? "Tutte" : "Chimica")}
            />
          </div>

          <section className="absolute bottom-[15.4%] left-[3.5%] right-[3.5%] top-[39.4%] z-20 overflow-hidden rounded-[18px] border border-[#8d684a]/45 bg-[#f7ead2]/95 shadow-[inset_0_0_20px_rgba(104,72,45,0.06)]">
            <div className="border-b border-[#9b7658]/30 bg-[#f5e6ca]/95 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-serif text-[clamp(9px,2.5vw,12px)] italic text-[#725542]">
                  {visibleStudents.length} {visibleStudents.length === 1 ? "studente" : "studenti"}
                  {subject !== "Tutte" ? ` · ${subject}` : ""}
                </p>

                <label className="flex items-center gap-1 font-serif text-[clamp(8px,2.3vw,11px)] italic text-[#725542]">
                  <span>Ordina:</span>
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as SortMode)}
                    aria-label="Ordina studenti"
                    className="max-w-[128px] bg-transparent font-serif text-[#4b3024] outline-none"
                  >
                    <option value="az">A–Z</option>
                    <option value="lesson">Prossima lezione</option>
                    <option value="recent">Più recenti</option>
                  </select>
                </label>
              </div>

              <div className="mt-1.5 flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {SUBJECTS.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setSubject(item)}
                    className={`shrink-0 rounded-full border px-2 py-0.5 font-serif text-[clamp(8px,2.2vw,10px)] italic transition ${
                      subject === item
                        ? "border-[#74543f]/45 bg-[#dcc8a8]/75 text-[#493023]"
                        : "border-[#9e7b5f]/25 bg-[#f8ecd7]/55 text-[#80634d]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[1.18fr_1fr_.9fr_.92fr] gap-2 border-b border-[#9b7658]/25 px-3 py-1.5 font-serif text-[clamp(7px,2vw,9px)] uppercase tracking-[0.08em] text-[#765844]">
              <span>Nome</span>
              <span>Scuola</span>
              <span>Materie</span>
              <span>Lezione</span>
            </div>

            <div className="h-[calc(100%-76px)] overflow-y-auto overscroll-contain [scrollbar-color:#9a7657_transparent] [scrollbar-width:thin]">
              {visibleStudents.map((student) => (
                <StudentRow key={student.id} student={student} />
              ))}

              {visibleStudents.length === 0 && (
                <div className="flex h-full min-h-36 items-center justify-center px-6 text-center">
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

function SubjectCard({
  label,
  count,
  active,
  tone,
  onClick,
}: {
  label: "Matematica" | "Fisica" | "Chimica";
  count: number;
  active: boolean;
  tone: "sage" | "blue" | "rose";
  onClick: () => void;
}) {
  const tones = {
    sage: "bg-[#dfe3cf]/95",
    blue: "bg-[#d8e1e7]/95",
    rose: "bg-[#ead2c6]/95",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-w-0 rounded-[11px] border px-1.5 py-2 text-center shadow-[0_2px_7px_rgba(78,55,35,0.08)] transition ${tones[tone]} ${
        active ? "border-[#60412f]/65 ring-1 ring-[#6c4b36]/35" : "border-[#98765a]/25"
      }`}
    >
      <span className="sr-only">
        {label}: {count} {count === 1 ? "studente" : "studenti"}
      </span>
    </button>
  );
}

function StudentRow({ student }: { student: StudentRecord }) {
  const subjects = student.subjects.map(normalizeSubject);

  return (
    <div className="grid min-h-[58px] grid-cols-[1.18fr_1fr_.9fr_.92fr] gap-2 border-b border-[#a8886e]/22 px-3 py-2.5 text-[#4b3024]">
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
  const tone =
    subject === "Matematica"
      ? "bg-[#dce2ce]"
      : subject === "Fisica"
        ? "bg-[#d8e1e7]"
        : subject === "Chimica"
          ? "bg-[#ead1c5]"
          : "bg-[#e8dcc5]";

  return (
    <span className={`rounded-[5px] px-1.5 py-0.5 font-serif text-[clamp(7px,1.9vw,9px)] italic text-[#594234] ${tone}`}>
      {subject}
    </span>
  );
}
