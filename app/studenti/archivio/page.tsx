"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { students, type StudentRecord } from "../../data/students";
import { loadStoredStudents, restoreStoredStudent } from "../../data/student-storage";
import artwork from "../../../design-approved-phase3/12-studenti-archivio-final.png";
import StudentSurface from "../StudentSurface";
import styles from "../students.module.css";
import { fullName, loadStudentLessonSummary } from "../student-utils";

export default function StudentsArchivePage() {
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [lessonCounts, setLessonCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");

  function load() {
    const stored = loadStoredStudents();
    const storedIds = new Set(stored.map((student) => student.id));
    const { byStudent } = loadStudentLessonSummary();
    const all = [...stored, ...students.filter((student) => !storedIds.has(student.id))]
      .filter((student) => (student.status ?? "active") === "archived");
    const counts: Record<string, number> = {};
    for (const student of all) counts[student.id] = byStudent.get(student.id)?.length ?? 0;
    setRecords(all);
    setLessonCounts(counts);
  }

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const visible = useMemo(() => records.filter((student) => {
    const haystack = [fullName(student), student.school, student.gradeClass, ...student.subjects].join(" ").toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }), [records, query]);

  function restore(id: string) {
    if (restoreStoredStudent(id)) load();
  }

  return (
    <StudentSurface artwork={artwork} current="archive" className={styles.tallSurface}>
      <h1 className="sr-only">Archivio studenti</h1>
      <div className={styles.archiveSearch}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Cerca negli studenti archiviati" placeholder="Cerca archivio" />
      </div>
      <section className={styles.archiveList} aria-label="Studenti archiviati">
        {visible.map((student) => (
          <article key={student.id} className={styles.archiveCard}>
            <Link href={`/studenti/${encodeURIComponent(student.id)}`}>
              <strong>{fullName(student)}</strong>
              <span>{student.gradeClass || "—"} · {student.subjects.join(" · ") || "—"}</span>
              <span>{lessonCounts[student.id] ?? 0} lezioni nello storico</span>
            </Link>
            <button type="button" onClick={() => restore(student.id)}>Ripristina in Studenti</button>
          </article>
        ))}
        {!visible.length && <p className={styles.empty}>Nessuno studente archiviato.</p>}
      </section>
    </StudentSurface>
  );
}
