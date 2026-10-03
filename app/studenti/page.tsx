"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { students, type StudentRecord } from "../data/students";
import { loadStoredStudents } from "../data/student-storage";
import artwork from "../../design-approved-phase1/08-studenti-lista-clean.png";
import StudentSurface from "./StudentSurface";
import styles from "./students.module.css";
import type { LessonMode } from "../data/calendario/calendar-types";
import { formatLesson, formatMode, loadStudentLessonSummary, normalizeSubject } from "./student-utils";

type SubjectFilter = "Tutte" | "Matematica" | "Fisica" | "Chimica";
type SortMode = "az" | "lesson" | "recent";

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

  useEffect(() => {
    const storedStudents = loadStoredStudents();
    const storedIds = new Set(storedStudents.map((student) => student.id));
    const modes: Record<string, LessonMode> = {};
    const { nextByStudent } = loadStudentLessonSummary();
    for (const [studentId, lesson] of nextByStudent) {
      modes[studentId] = lesson.mode;
    }
    queueMicrotask(() => {
      setNextModes(modes);
      setAllStudents([
        ...storedStudents,
        ...students.filter((student) => !storedIds.has(student.id)),
      ].filter((student) => (student.status ?? "active") === "active").map((student) => ({
        ...student,
        nextLesson: nextByStudent.get(student.id) ? `${nextByStudent.get(student.id)?.date}T${nextByStudent.get(student.id)?.startTime}` : undefined,
      })));
    });
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
    <StudentSurface artwork={artwork} current="list" className={styles.register}>
        <h1 className="sr-only">I miei studenti</h1>

        <div className={styles.controls}>
          <label className={styles.search}>
            <span className="sr-only">Cerca studente per nome, scuola, classe o materia</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca per nome, materia..." />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Cancella ricerca">×</button>
            )}
          </label>

          <div className={styles.filters} aria-label="Filtra per materia">
            {(["Tutte", "Matematica", "Fisica", "Chimica"] as SubjectFilter[]).map((filter, index) => (
              <button
                key={filter}
                type="button"
                onClick={() => setSubject(filter)}
                aria-pressed={subject === filter}
                className={styles.filter}
                data-color={index}
                aria-label={filter === "Tutte" ? "Tutti gli studenti" : `Filtra ${filter}`}
              />
            ))}
            <button
              type="button"
              className={styles.options}
              onClick={() => setShowOptions((value) => !value)}
              aria-expanded={showOptions}
              aria-controls="student-order"
              aria-label="Ordina e filtra"
            />
          </div>

          {showOptions && (
            <label id="student-order" className={styles.order}>
              Ordina studenti
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                <option value="az">A-Z</option>
                <option value="lesson">Prossima lezione</option>
                <option value="recent">Aggiornati di recente</option>
              </select>
            </label>
          )}
        </div>

        <section aria-label="Elenco degli studenti" className={styles.list}>
          {visibleStudents.map((student) => (
            <Link
              key={student.id}
              href={`/studenti/${encodeURIComponent(student.id)}`}
              className={styles.card}
              aria-label={`Apri la scheda di ${student.firstName} ${student.lastName}`}
            >
              <div className={styles.photo}>
                {student.avatarUrl ? (
                  <Image src={student.avatarUrl} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <span aria-hidden="true">{student.firstName.charAt(0)}{student.lastName.charAt(0)}</span>
                )}
              </div>

              <div className={styles.details}>
                <h2>{student.firstName} {student.lastName}</h2>
                <p><span className="sr-only">Classe: </span>{student.gradeClass || "—"}</p>
                <p><span className="sr-only">Materie: </span>{student.subjects.map(normalizeSubject).join(" · ") || "—"}</p>
                <p>
                  <span className="sr-only">Modalità prossima lezione: </span>
                  {formatMode(nextModes[student.id] ?? student.lessonMode)}
                </p>
              </div>

              <div className={styles.nextLesson}>
                <span className="sr-only">Prossima lezione: </span>
                {formatLesson(student.nextLesson)}
              </div>
            </Link>
          ))}

          {!visibleStudents.length && (
            <p className={styles.empty} role="status">
              {allStudents.length
                ? "Nessuno studente corrisponde alla ricerca."
                : "Nessuno studente inserito. Aggiungi un nuovo studente."}
            </p>
          )}
        </section>
    </StudentSurface>
  );
}
