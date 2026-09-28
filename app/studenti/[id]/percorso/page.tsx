"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import StudentJourney from "../../../components/StudentJourney";
import { getStudentById, type StudentRecord } from "../../../data/students";
import { getStoredStudentById } from "../../../data/student-storage";

export default function StudentJourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [student, setStudent] = useState<StudentRecord | null | undefined>(undefined);
  useEffect(() => { queueMicrotask(() => setStudent(getStoredStudentById(id) ?? getStudentById(id) ?? null)); }, [id]);
  if (student === undefined) return <main className="min-h-dvh bg-[#efe3ce]" aria-label="Caricamento percorso" />;
  if (!student) return <main className="flex min-h-dvh items-center justify-center bg-[#efe3ce] text-[#762b3b]">Studente non trovato. <Link href="/studenti" className="ml-2 underline">Torna agli studenti</Link></main>;
  return <StudentJourney student={student} />;
}
