"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import StudentDetail from "../../components/StudentDetail";
import { getStudentById, type StudentRecord } from "../../data/students";
import { getStoredStudentById } from "../../data/student-storage";

export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [student, setStudent] = useState<StudentRecord | null | undefined>(undefined);

  useEffect(() => {
    queueMicrotask(() => setStudent(getStoredStudentById(id) ?? getStudentById(id) ?? null));
  }, [id]);

  if (student === undefined) {
    return <main className="min-h-dvh bg-[#f4eddf]" aria-label="Caricamento diario dello studente" />;
  }

  if (student === null) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f4eddf] px-6 text-center text-[#4b3024]">
        <section className="max-w-sm rounded-3xl border border-[#9b7658]/30 bg-[#f8ecd6] p-8">
          <h1 className="font-field-label text-xl text-[#6f1723]">Studente non trovato</h1>
          <Link href="/studenti" className="antique-clickable mt-6 inline-block rounded-full border border-[#8b6a50]/40 px-6 py-3 font-entry-elegant">Torna a I miei studenti</Link>
        </section>
      </main>
    );
  }

  return <StudentDetail student={student} />;
}
