"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { students, type StudentRecord } from "../../data/students";
import { loadStoredStudents } from "../../data/student-storage";
import { loadCalendarAppointments, loadCalendarSeries } from "../../data/calendario/calendar-storage";
import contentStyles from "../students.module.css";
import styles from "./archivio.module.css";
import { fullName, loadStudentArchiveOverview } from "../student-utils";
import { restoreStudentAfterConfirmation } from "../archive-actions";
import { TEMPORARY_SAVE_WARNING } from "../../data/save-result";

export default function StudentsArchivePage() {
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [lessonCounts, setLessonCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState("");

  function load() {
    const stored = loadStoredStudents();
    const storedIds = new Set(stored.map((student) => student.id));
    const all = [...stored, ...students.filter((student) => !storedIds.has(student.id))]
      .filter((student) => (student.status ?? "active") === "archived");
    const counts: Record<string, number> = {};
    const source = { appointments: loadCalendarAppointments(), series: loadCalendarSeries() };
    const now = new Date();
    for (const student of all) {
      counts[student.id] = loadStudentArchiveOverview(student.id, now, source).lessons
        .filter((lesson) => lesson.status === "svolta").length;
    }
    setRecords(all);
    setLessonCounts(counts);
    const requestedId = new URLSearchParams(window.location.search).get("id") ?? "";
    setSelectedId(all.some((student) => student.id === requestedId) ? requestedId : "");
  }

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const visible = useMemo(() => records
    .filter((student) => {
      const haystack = [fullName(student), student.school, student.gradeClass, ...student.subjects].join(" ").toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    })
    .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "it", { sensitivity: "base" })),
  [records, query]);

  function restore(id: string) {
    const student = records.find((record) => record.id === id);
    if (!student) return;
    const result = restoreStudentAfterConfirmation(student);
    if (result === "cancelled") return;
    if (result === "failed") {
      setMessage("Ripristino non riuscito. Riprova.");
      return;
    }
    if (result === "temporary") { setMessage(TEMPORARY_SAVE_WARNING); return; }
    load();
    setMessage(`${fullName(student)} è stato ripristinato tra gli studenti attivi.`);
  }

  return (
    <main className={styles.page}>
      <div className={styles.sheet}>
        <Image src="/SfondoArchivioStudenti.png" alt="" fill priority unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
        <h1 className="sr-only">Archivio Studenti</h1>
        <nav className={styles.navigation} aria-label="Navigazione Archivio Studenti">
          <Link href="/oggi">OGGI</Link>
          {selectedId
            ? <Link href={`/studenti/${encodeURIComponent(selectedId)}`}>CARD STUDENTE</Link>
            : <span aria-disabled="true">CARD STUDENTE</span>}
          <Link href="/menu">MENU</Link>
        </nav>
        <section className={styles.workspace} aria-label="Studenti archiviati">
          <label className={styles.search}>
            <span className="sr-only">Cerca negli studenti archiviati</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca archivio" />
          </label>
          <div className={styles.list}>
            {message && <p role="status" className={contentStyles.archiveMessage}>{message}</p>}
            {visible.map((student) => (
              <article key={student.id} className={contentStyles.archiveCard}>
                <Link href={`/studenti/${encodeURIComponent(student.id)}`} onFocus={() => setSelectedId(student.id)} onMouseEnter={() => setSelectedId(student.id)}>
                  <strong>{fullName(student)}</strong>
                  <span>{student.gradeClass || "—"} · {student.subjects.join(" · ") || "—"}</span>
                  <span>{lessonCounts[student.id] ?? 0} lezioni nello storico</span>
                </Link>
                <Link className={contentStyles.archiveDiaryLink} href={`/studenti/${encodeURIComponent(student.id)}/lezioni`}>STORIA DELLE LEZIONI</Link>
                <button type="button" onClick={() => restore(student.id)}>RIPRISTINA STUDENTE</button>
              </article>
            ))}
            {!visible.length && <p className={styles.empty}>Nessuno studente archiviato</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
