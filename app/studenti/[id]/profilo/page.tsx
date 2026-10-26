"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useState, type ReactNode } from "react";
import StudentsNavigation from "../../StudentsNavigation";
import { getStudentById, type StudentRecord } from "../../../data/students";
import { getStoredStudentById } from "../../../data/student-storage";
import styles from "./profile.module.css";

const profileTabs = [
  "Profilo",
  "Scuola e materie",
  "Lezioni e note",
  "Famiglia e contatti",
] as const;

export default function StudentNarrativeProfilePage({
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
    return <main className={styles.loading} aria-label="Caricamento profilo dello studente" />;
  }

  if (student === null) {
    return (
      <main className={styles.notFound}>
        <section>
          <h1>Studente non trovato</h1>
          <Link href="/studenti/elenco">Torna a I miei studenti</Link>
        </section>
      </main>
    );
  }

  const fullName = [student.firstName, student.lastName].filter(Boolean).join(" ");

  return (
    <main className={styles.page}>
      <div className={styles.stage}>
        <Image
          src="/student-profile-interior-master.png"
          alt=""
          fill
          priority
          unoptimized
          sizes="(max-width: 430px) 100vw, 430px"
          className={styles.background}
        />

        <Link href="/oggi" aria-label="Vai a Oggi" className={styles.todayLink} />
        <Link href="/menu" aria-label="Apri Menu" className={styles.menuLink} />

        <h1 className={styles.title}>Profilo</h1>

        <nav aria-label="Pagine del profilo studente" className={styles.tabs}>
          {profileTabs.map((tab, index) => index === 0 ? (
            <span key={tab} aria-current="page" className={`${styles.tab} ${styles.currentTab}`}>
              {tab}
            </span>
          ) : (
            <span key={tab} aria-disabled="true" className={styles.tab}>
              {tab}
            </span>
          ))}
        </nav>

        <section className={styles.narrative} aria-label={`Profilo di ${fullName}`} tabIndex={0}>
          <Narrative student={student} />
        </section>

        <StudentsNavigation active="profilo" appearance="text" />
      </div>
    </main>
  );
}

function Narrative({ student }: { student: StudentRecord }) {
  const fullName = [student.firstName, student.lastName].filter(Boolean).join(" ");
  const school = [student.gradeClass, student.schoolName || student.schoolType || student.school]
    .filter(Boolean)
    .join(" presso ");
  const residence = [
    student.address,
    student.postalCode,
    [student.city, student.province].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ");
  const books = (student.books ?? [])
    .map((book) => [book.title, book.publisher].filter(Boolean).join(" — "))
    .filter(Boolean);
  const fallbackBooks = [student.textbooks.math, student.textbooks.physics, student.textbooks.chemistry]
    .filter((book): book is string => Boolean(book?.trim()));
  const savedBooks = books.length ? books : fallbackBooks;

  return (
    <div className={styles.prose}>
      {fullName && <p>Il suo nome è <Value>{fullName}</Value>.</p>}
      {student.birthDate && <p>La data di nascita è <Value>{formatDate(student.birthDate)}</Value>.</p>}
      {residence && <p>Abita a <Value>{residence}</Value>.</p>}
      {school && <p>Frequenta <Value>{school}</Value>.</p>}
      {student.subjects.length > 0 && <p>Segue <Value>{joinItalian(student.subjects)}</Value>.</p>}
      {savedBooks.length > 0 && <p>I libri di riferimento sono <Value>{joinItalian(savedBooks)}</Value>.</p>}
      {student.enrollmentDate && <p>Il percorso con Francesca è iniziato il <Value>{formatDate(student.enrollmentDate)}</Value>.</p>}
      {student.personalNotes?.trim() && <p className={styles.studentNote}><Value>{student.personalNotes.trim()}</Value></p>}
      {student.familyNotes?.trim() && <p className={styles.studentNote}><Value>{student.familyNotes.trim()}</Value></p>}
    </div>
  );
}

function Value({ children }: { children: ReactNode }) {
  return <span className={styles.value}>{children}</span>;
}

function formatDate(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
}

function joinItalian(values: string[]) {
  if (values.length < 2) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} e ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} e ${values.at(-1)}`;
}
