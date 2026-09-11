"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { students } from "../data/students";

export default function StudentsPage() {
  const [query, setQuery] = useState("");

  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return students;

    return students.filter((student) => {
      const haystack = [
        student.firstName,
        student.lastName,
        student.school,
        student.gradeClass,
        ...student.subjects,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [query]);

  return (
    <main className="min-h-dvh w-full bg-[#f4eddf] px-4 py-6 text-[#3c2a21]">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="mb-6 text-center">
          <Link
            href="/menu"
            className="mb-4 inline-block font-serif text-sm italic text-[#705846]"
          >
            ← Torna al registro
          </Link>

          <h1 className="font-serif text-3xl italic">I miei studenti</h1>
          <p className="mt-2 font-serif text-sm italic text-[#806c5b]">
            Un elenco semplice per ritrovare subito ogni studente.
          </p>
        </header>

        <section className="mb-5 rounded-[22px] border border-[#bca88f]/45 bg-[#fffaf1]/75 p-4 shadow-[0_10px_28px_rgba(78,58,38,0.08)]">
          <label className="block font-serif text-xs uppercase tracking-[0.18em] text-[#8b7767]">
            Cerca
          </label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome, scuola, classe, materia…"
            className="mt-2 w-full border-b border-[#9f8975]/35 bg-transparent px-1 py-2 font-serif text-base outline-none placeholder:italic placeholder:text-[#9f8c7d]/55"
          />
        </section>

        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="font-serif text-sm italic text-[#705846]">
            {filteredStudents.length} {filteredStudents.length === 1 ? "studente" : "studenti"}
          </p>

          <button
            type="button"
            className="rounded-full border border-[#9b826d]/35 bg-[#efe1c8] px-4 py-2 font-serif text-sm italic shadow-sm"
          >
            + Nuovo studente
          </button>
        </div>

        <section className="space-y-4">
          {filteredStudents.map((student) => (
            <Link
              key={student.id}
              href={`/studenti/${student.id}`}
              className="block rounded-[24px] border border-[#bda98f]/45 bg-[#fffaf1]/85 p-5 shadow-[0_12px_30px_rgba(76,57,38,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(76,57,38,0.12)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl italic">
                    {student.firstName} {student.lastName}
                  </h2>

                  <p className="mt-2 font-serif text-sm text-[#6f5b4d]">
                    {[student.school, student.gradeClass].filter(Boolean).join(" · ") || "Scuola da inserire"}
                  </p>

                  <p className="mt-3 font-serif text-sm italic text-[#897363]">
                    {student.subjects.length > 0
                      ? student.subjects.join(" · ")
                      : "Materie da inserire"}
                  </p>
                </div>

                <span className="pt-2 font-serif text-2xl text-[#826b58]">›</span>
              </div>
            </Link>
          ))}

          {filteredStudents.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-[#bda98f]/50 bg-[#fffaf1]/55 p-8 text-center">
              <p className="font-serif italic text-[#806d5d]">Nessuno studente trovato.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
