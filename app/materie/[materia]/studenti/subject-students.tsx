"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { loadStoredStudents } from "../../../data/student-storage";
import type { StudentRecord } from "../../../data/students";
import type { SubjectSlug } from "../../materie-data";

export default function SubjectStudents({ slug, title }: { slug: SubjectSlug; title: string }) {
  const data = useSyncExternalStore(
    (listener) => { window.addEventListener("storage", listener); return () => window.removeEventListener("storage", listener); },
    () => { try { return window.localStorage.getItem("semprini:students") || ""; } catch { return ""; } },
    () => "",
  );
  const students: StudentRecord[] = data
    ? loadStoredStudents().filter((student) => student.subjects.some(
      (subject) => subject.toLocaleLowerCase("it") === title.toLocaleLowerCase("it"),
    )) : [];
  return <main className="min-h-screen bg-[#f8f2e7] px-4 py-8 font-serif text-[#49372f]">
    <section className="mx-auto max-w-[430px] rounded-lg border border-[#cbb99c] bg-[#fffbf2] p-6">
      <nav className="mb-8 flex justify-between text-[#8e2942]"><Link href={`/materie/${slug}`}>← Indietro</Link><Link href="/menu">Menu</Link></nav>
      <h1 className="mb-6 text-center text-2xl italic text-[#8e2942]">Studenti associati · {title}</h1>
      {students.length ? <ul className="space-y-3">{students.map((student) => <li key={student.id} className="border-b border-[#d8c9ae] pb-2">
        <Link className="block py-2 text-lg" href={`/studenti/${student.id}`}>{student.firstName} {student.lastName} →</Link>
      </li>)}</ul> : <p className="text-center italic">Nessuno studente associato a {title}.</p>}
    </section>
  </main>;
}
