"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { students, type StudentRecord } from "../../data/students";
import { loadStoredStudents } from "../../data/student-storage";
import artwork from "../../../design-approved-phase3/11-studenti-diario-final.png";
import StudentSurface from "../StudentSurface";
import styles from "../students.module.css";
import { formatLesson, fullName, loadStudentLessonSummary, normalizeSubject } from "../student-utils";
import type { CalendarOccurrence } from "../../data/calendario/calendar-types";

type SubjectFilter = "Tutte" | "Matematica" | "Fisica" | "Chimica";

export default function StudentsDiaryPage() {
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [lastLessons, setLastLessons] = useState<Record<string, CalendarOccurrence | undefined>>({});
  const [nextLessons, setNextLessons] = useState<Record<string, CalendarOccurrence | undefined>>({});
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<SubjectFilter>("Tutte");

  useEffect(() => {
    const stored = loadStoredStudents();
    const storedIds = new Set(stored.map((student) => student.id));
    const { lastByStudent, nextByStudent } = loadStudentLessonSummary();
    const all = [...stored, ...students.filter((student) => !storedIds.has(student.id))]
      .filter((student) => (student.status ?? "active") === "active");
    const last: Record<string, CalendarOccurrence | undefined> = {};
    const next: Record<string, CalendarOccurrence | undefined> = {};
    for (const student of all) {
      last[student.id] = lastByStudent.get(student.id);
      next[student.id] = nextByStudent.get(student.id);
    }
    queueMicrotask(() => {
      setRecords(all);
      setLastLessons(last);
      setNextLessons(next);
    });
  }, []);

  const visible = useMemo(() => records.filter((student) => {
    const normalizedSubjects = student.subjects.map(normalizeSubject);
    if (subject !== "Tutte" && !normalizedSubjects.includes(subject)) return false;
    const haystack = [fullName(student), student.school, student.gradeClass, ...normalizedSubjects].join(" ").toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }), [records, query, subject]);

  return (
    <StudentSurface artwork={artwork} current="diary" className={styles.tallSurface}>
      <h1 className="sr-only">Diario studenti</h1>
      <div className={styles.diaryControls}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Cerca studente" placeholder="Cerca studente" />
        <select value={subject} onChange={(event) => setSubject(event.target.value as SubjectFilter)} aria-label="Filtra materia">
          <option>Tutte</option><option>Matematica</option><option>Fisica</option><option>Chimica</option>
        </select>
      </div>
      <section className={styles.diaryList} aria-label="Diario collettivo studenti">
        {visible.map((student) => {
          const last = lastLessons[student.id];
          const next = nextLessons[student.id];
          return (
            <Link key={student.id} href={`/studenti/${encodeURIComponent(student.id)}`} className={styles.diaryCard}>
              <strong>{fullName(student)}</strong>
              <span>Ultima lezione: {last ? formatLesson(`${last.date}T${last.startTime}`) : "—"}</span>
              <span>Appunti: {last?.notes || last?.topic || "Nessuna nota registrata."}</span>
              <span>Prossimo obiettivo: {next?.topic || "Da definire"}</span>
            </Link>
          );
        })}
        {!visible.length && <p className={styles.empty}>Nessuno studente trovato.</p>}
      </section>
    </StudentSurface>
  );
}
