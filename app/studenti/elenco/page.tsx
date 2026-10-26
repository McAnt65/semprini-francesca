"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { students, type StudentRecord } from "../../data/students";
import { loadStoredStudents } from "../../data/student-storage";
import { loadCalendarAppointments, loadCalendarSeries } from "../../data/calendario/calendar-storage";
import { selectOccurrencesInRange } from "../../data/calendario/calendar-selectors";
import { addDays, toLocalDate, toLocalTime } from "../../data/calendario/calendar-dates";
import styles from "./elenco.module.css";
import type { LessonMode } from "../../data/calendario/calendar-types";

type StudentRow = StudentRecord & { nextLessonMode?: LessonMode };

function lessonModeLabel(mode?: LessonMode) {
  if (mode === "casa") return "A casa";
  if (mode === "domicilio") return "A domicilio";
  if (mode === "online") return "Online";
  return "";
}

type SubjectFilter = "Tutte" | "Matematica" | "Fisica" | "Chimica";
type SortMode = "az" | "lesson" | "recent";
type SearchField = "Nome" | "Materia" | "Scuola";

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
  const [allStudents, setAllStudents] = useState<StudentRow[]>(students);
  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<SearchField | "">("");
  const [subject, setSubject] = useState<SubjectFilter>("Tutte");
  const [sortMode, setSortMode] = useState<SortMode>("az");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    const storedStudents = loadStoredStudents();
    const storedIds = new Set(storedStudents.map((student) => student.id));
    const now = new Date();
    const today = toLocalDate(now);
    const currentTime = toLocalTime(now);
    const nextByStudent = new Map<string, string>();
    const nextModeByStudent = new Map<string, LessonMode>();
    const upcoming = selectOccurrencesInRange(
      loadCalendarAppointments(),
      loadCalendarSeries(),
      today,
      addDays(today, 366)
    );
    for (const lesson of upcoming) {
      if (lesson.status === "annullata" || (lesson.date === today && lesson.startTime < currentTime)) continue;
      const next = `${lesson.date}T${lesson.startTime}`;
      const previous = nextByStudent.get(lesson.studentId);
      if (!previous || next < previous) {
        nextByStudent.set(lesson.studentId, next);
        nextModeByStudent.set(lesson.studentId, lesson.mode);
      }
    }
    const availableStudents = [
      ...storedStudents,
      ...students.filter((student) => !storedIds.has(student.id)),
    ].filter((student) => (student.status ?? "active") === "active")
      .map((student) => ({
        ...student,
        nextLesson: nextByStudent.get(student.id),
        nextLessonMode: nextModeByStudent.get(student.id),
      }));
    const requestedId = new URLSearchParams(window.location.search).get("id");
    queueMicrotask(() => {
      setAllStudents(availableStudents);
      setSelectedStudentId(requestedId && availableStudents.some((student) => student.id === requestedId) ? requestedId : null);
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

      const searchValues = searchField === "Nome"
        ? [student.firstName, student.lastName]
        : searchField === "Materia"
          ? normalizedSubjects
          : [student.school, student.schoolName, student.schoolType, student.gradeClass, student.section];
      const haystack = searchValues
        .filter(Boolean)
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
  }, [allStudents, query, searchField, subject, sortMode]);

  return (
    <main className={styles.page}>
      <div className={styles.sheet}>
        <Image src="/SfondoMieiStudenti.png" alt="" fill preload unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
        <div className={styles.content}>
          <header className={styles.header}>
            <h1 className="sr-only">I miei studenti</h1>
            <nav className={styles.navigation} aria-label="Navigazione I miei studenti">
              <Link href="/oggi">OGGI</Link>
              {selectedStudentId ? <Link href={`/studenti/${encodeURIComponent(selectedStudentId)}`}>CARD STUDENTE</Link> : <span aria-disabled="true">CARD STUDENTE</span>}
              <Link href="/menu">MENU</Link>
            </nav>
          </header>
          <section className={styles.workspace} aria-label="Ricerca ed elenco degli studenti">
            <div className={styles.controls}>
              <div className={styles.controlRow}>
                <label className={styles.control}>CERCA
                  <select value={searchField} onChange={(event) => { setSearchField(event.target.value as SearchField | ""); setQuery(""); setSubject("Tutte"); }} aria-label="Campo in cui cercare">
                    <option value="" disabled>Seleziona</option><option value="Nome">Nome</option><option value="Materia">Materia</option><option value="Scuola">Scuola</option>
                  </select>
                </label>
                <label className={styles.control}>ORDINA
                  <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} aria-label="Ordina studenti">
                    <option value="az">A–Z</option><option value="lesson">Prossima lezione</option><option value="recent">Aggiornamento recente</option>
                  </select>
                </label>
              </div>
              <div className={styles.contextualControl} hidden={!searchField}>
                {searchField === "Materia"
                  ? <select value={subject} onChange={(event) => setSubject(event.target.value as SubjectFilter)} aria-label="Filtra per materia">
                      {(["Tutte", "Matematica", "Fisica", "Chimica"] as SubjectFilter[]).map((filter) => <option key={filter} value={filter}>{filter}</option>)}
                    </select>
                  : <input type="search" aria-label={`Cerca per ${searchField.toLowerCase()}`} placeholder={`Cerca per ${searchField.toLowerCase()}`} value={query} onChange={(event) => setQuery(event.target.value)} />}
              </div>
            </div>
            <div className={`${styles.scroll} ${visibleStudents.length > 0 ? styles.rowsBackdrop : ""}`} role="region" tabIndex={0} aria-label="Elenco degli studenti">
              {visibleStudents.map((student) => (
                <Link key={student.id} href={"/studenti/" + encodeURIComponent(student.id)}
                  aria-label={"Apri il profilo di " + student.firstName + " " + student.lastName}
                  className={styles.studentRow}>
                  <span className={styles.studentInfo}>
                    <span className={styles.studentName}>{student.firstName} {student.lastName}</span>
                    <span className={styles.details}>{[student.schoolName || student.school, student.gradeClass, student.section].filter(Boolean).join(" · ") || "Informazioni scolastiche non indicate"}</span>
                    <span className={styles.details}>{student.subjects.map(normalizeSubject).join(" · ") || "Materie non indicate"}</span>
                  </span>
                  <span className={styles.lessonInfo}>
                    <span className={styles.lessonLabel}>Prossima lezione</span>
                    <span className={styles.nextLesson}>{formatLesson(student.nextLesson)}</span>
                    {(student.nextLesson ? student.nextLessonMode : student.lessonMode) && (
                      <span className={styles.lessonMode}>{lessonModeLabel(student.nextLesson ? student.nextLessonMode : student.lessonMode)}</span>
                    )}
                  </span>
                </Link>
              ))}
              {visibleStudents.length === 0 && (
                <p className={styles.empty}>{allStudents.length === 0 ? "Nessuno studente inserito. Inizia con Nuovo studente." : "Nessuno studente corrisponde alla ricerca."}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
