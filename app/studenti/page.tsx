"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { students, type StudentRecord } from "../data/students";
import { demoStudents } from "../data/demo-students";
import { loadStoredStudents } from "../data/student-storage";
import artwork from "../../design-reference/studenti-v2/01c-studenti-lista-clean-approved.png";
import StudentSurface from "./StudentSurface";
import styles from "./students.module.css";
import type { LessonMode } from "../data/calendario/calendar-types";
import {
  formatLesson,
  formatMode,
  loadStudentLessonSummary,
  normalizeSubject,
} from "./student-utils";
import iconBooks from "../../design-reference/studenti-v2/card-icons/01-libri-fiori.png";
import iconGlobe from "../../design-reference/studenti-v2/card-icons/02-mappamondo-libri.png";
import iconBook from "../../design-reference/studenti-v2/card-icons/03-libro-aperto-fiori.png";
import iconBag from "../../design-reference/studenti-v2/card-icons/04-zaino-cartella.png";
import iconDrawing from "../../design-reference/studenti-v2/card-icons/05-strumenti-disegno.png";
import iconBrushes from "../../design-reference/studenti-v2/card-icons/06-matite-pennelli.png";
import iconArchive from "../../design-reference/studenti-v2/card-icons/07-archivio-documenti.png";
import iconInk from "../../design-reference/studenti-v2/card-icons/08-penna-calamaio.png";

type SubjectFilter = "Tutte" | "Matematica" | "Fisica" | "Chimica";
type SortMode = "az" | "lesson" | "recent";

const cardIllustrations = [
  iconBooks,
  iconGlobe,
  iconBook,
  iconBag,
  iconDrawing,
  iconBrushes,
  iconArchive,
  iconInk,
];

function illustrationForStudent(id: string) {
  let hash = 0;

  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }

  return cardIllustrations[Math.abs(hash) % cardIllustrations.length];
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

export default function StudentsPage() {
  const [allStudents, setAllStudents] = useState<StudentRecord[]>(students);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<SubjectFilter>("Tutte");
  const [nextModes, setNextModes] = useState<Record<string, LessonMode>>({});
  const [showOptions, setShowOptions] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("az");
  const [studentsLoaded, setStudentsLoaded] = useState(false);

  useEffect(() => {
    const storedStudents = loadStoredStudents();
    const storedIds = new Set(storedStudents.map((student) => student.id));
    const demoIds = new Set(demoStudents.map((student) => student.id));

    const modes: Record<string, LessonMode> = {};
    const { nextByStudent } = loadStudentLessonSummary();

    for (const [studentId, lesson] of nextByStudent) {
      modes[studentId] = lesson.mode;
    }

    queueMicrotask(() => {
      setNextModes(modes);

      setAllStudents(
        [
          ...storedStudents,
          ...demoStudents.filter((student) => !storedIds.has(student.id)),
          ...students.filter(
            (student) => !storedIds.has(student.id) && !demoIds.has(student.id)
          ),
        ]
          .filter((student) => (student.status ?? "active") === "active")
          .map((student) => {
            const nextLesson = nextByStudent.get(student.id);

            return {
              ...student,
              nextLesson: nextLesson
                ? `${nextLesson.date}T${nextLesson.startTime}`
                : student.nextLesson,
            };
          })
      );
      setStudentsLoaded(true);
    });
  }, []);

  const visibleStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = allStudents.filter((student) => {
      const normalizedSubjects = student.subjects.map(normalizeSubject);

      const matchesSubject =
        subject === "Tutte" || normalizedSubjects.includes(subject);

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
    <StudentSurface
  artwork={artwork}
  current="list"
  className={styles.register}
  showTopHotspots={false}
>
      <h1 className="sr-only">I miei studenti</h1>

      <Link
        href="/oggi"
        aria-label="Oggi"
        className={styles.oggi}
      />
      <Link
        href="/menu"
        aria-label="Menu"
        className={styles.menu}
      />
      <Link
        href="/studenti/nuovo"
        aria-label="Nuovo studente"
        className={styles.newStudentControl}
      >Nuovo studente</Link>

      <div className={styles.controls}>
        <label className={styles.search}>
          <span className="sr-only">
            Cerca studente per nome, scuola, classe o materia
          </span>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca per nome, materia..."
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Cancella ricerca"
            >
              ×
            </button>
          )}
        </label>

        <div
          className={styles.filters}
          aria-label="Filtra per materia"
        >
          {(
            ["Tutte", "Matematica", "Fisica", "Chimica"] as SubjectFilter[]
          ).map((filter, index) => (
            <button
              key={filter}
              type="button"
              onClick={() => setSubject(filter)}
              aria-pressed={subject === filter}
              className={styles.filter}
              data-color={index}
              aria-label={
                filter === "Tutte"
                  ? "Tutti gli studenti"
                  : `Filtra ${filter}`
              }
            >{filter === "Tutte" ? "Tutti" : filter}</button>
          ))}

          <button
            type="button"
            className={styles.options}
            onClick={() => setShowOptions((value) => !value)}
            aria-expanded={showOptions}
            aria-controls="student-order"
            aria-label="Ordina e filtra"
          >Elenco</button>

          <button
            type="button"
            className={styles.gridView}
            aria-label="Vista griglia non disponibile"
            disabled
          >Griglia</button>
        </div>

        <span className={styles.orderCaption}>Ordina per</span>
        <button
          type="button"
          className={styles.orderTrigger}
          onClick={() => setShowOptions((value) => !value)}
          aria-expanded={showOptions}
          aria-controls="student-order"
          aria-label="Scegli ordinamento"
        >{sortMode === "az" ? "A-Z" : sortMode === "lesson" ? "Prossima lezione" : "Aggiornati di recente"}</button>

        {showOptions && (
          <label
            id="student-order"
            className={styles.order}
          >
            Ordina studenti

            <select
              value={sortMode}
              onChange={(event) => {
                setSortMode(event.target.value as SortMode);
                setShowOptions(false);
              }}
            >
              <option value="az">A-Z</option>
              <option value="lesson">Prossima lezione</option>
              <option value="recent">Aggiornati di recente</option>
            </select>
          </label>
        )}
      </div>

      <section
        aria-label="Elenco degli studenti"
        className={styles.list}
      >
        {visibleStudents.map((student) => (
          <Link
            key={student.id}
            href={`/studenti/${encodeURIComponent(student.id)}`}
            className={styles.card}
            aria-label={`Apri la scheda di ${student.firstName} ${student.lastName}`}
          >
            <div className={styles.cardIllustration}>
              <Image
                src={illustrationForStudent(student.id)}
                alt=""
                fill
                sizes="(max-width: 430px) 22vw, 95px"
              />
            </div>

            <div className={styles.details}>
              <h2>
                {student.firstName} {student.lastName}
              </h2>

              <p className={styles.schoolLine}>
                <span className="sr-only">Scuola e classe: </span>
                {[student.school, student.gradeClass].filter(Boolean).join(" · ") || "—"}
              </p>

              <p className={styles.subjectLine}>
                <span className="sr-only">Materie: </span>
                {student.subjects.map(normalizeSubject).join(" · ") || "—"}
              </p>
            </div>

            <div className={styles.nextLesson}>
              <strong>Prossima lezione</strong>
              <span>{formatLesson(student.nextLesson)}</span>
              <span>{formatMode(nextModes[student.id] ?? student.lessonMode)}</span>
            </div>
          </Link>
        ))}

        {studentsLoaded && !visibleStudents.length && (
          <p
            className={styles.empty}
            role="status"
          >
            {allStudents.length
              ? "Nessuno studente corrisponde alla ricerca."
              : "Nessuno studente inserito. Aggiungi un nuovo studente."}
          </p>
        )}
      </section>
    </StudentSurface>
  );
}
