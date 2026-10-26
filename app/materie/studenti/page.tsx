"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { loadStoredStudents, STUDENTS_STORAGE_KEY } from "../../data/student-storage";
import type { StudentRecord } from "../../data/students";
import { subjects, type SubjectSlug } from "../materie-data";
import { selectStudentsForSubject } from "./student-selection";
import styles from "./studenti.module.css";

const slugs: SubjectSlug[] = ["matematica", "fisica", "chimica"];

type ArchiveState =
  | { status: "loading" }
  | { status: "ready"; students: StudentRecord[] }
  | { status: "error" };

function readStudents(): ArchiveState {
  let readable = false;
  let unavailable = false;
  let storedRecords = 0;

  for (const name of ["localStorage", "sessionStorage"] as const) {
    let raw: string | null;
    try {
      raw = window[name].getItem(STUDENTS_STORAGE_KEY);
      readable = true;
    } catch {
      unavailable = true;
      continue;
    }
    if (raw === null) continue;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.some((value) => {
        if (!value || typeof value !== "object") return true;
        const record = value as Record<string, unknown>;
        return typeof record.id !== "string" || !record.id.trim() ||
          typeof record.firstName !== "string" || !record.firstName.trim() ||
          (record.subjects !== undefined && (!Array.isArray(record.subjects) ||
            record.subjects.some((subject: unknown) => typeof subject !== "string")));
      })) return { status: "error" };
      storedRecords += parsed.length;
    } catch {
      return { status: "error" };
    }
  }

  if (!readable || unavailable) return { status: "error" };
  try {
    const students = loadStoredStudents();
    if (storedRecords > 0 && students.length === 0) return { status: "error" };
    return { status: "ready", students };
  } catch {
    return { status: "error" };
  }
}

export default function StudentiPerMateriaPage() {
  const [subject, setSubject] = useState<SubjectSlug>("matematica");
  const [showArchived, setShowArchived] = useState(false);
  const [archive, setArchive] = useState<ArchiveState>({ status: "loading" });
  const workspace = useRef<HTMLElement>(null);

  useEffect(() => {
    let mounted = true;
    const refresh = () => { if (mounted) setArchive(readStudents()); };
    queueMicrotask(refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      mounted = false;
      window.removeEventListener("storage", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  const title = subjects[subject].title;
  const visible = archive.status === "ready"
    ? selectStudentsForSubject(archive.students, title, showArchived)
    : [];

  function chooseSubject(slug: SubjectSlug) {
    setSubject(slug);
    workspace.current?.scrollTo({ top: 0 });
  }

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/SfondoStudentiPerMateriaMaterie.png" alt="" fill preload unoptimized
        sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Studenti per materia</h1>
      <nav className={styles.navigation} aria-label="Navigazione Studenti per materia">
        <Link href="/oggi">OGGI</Link>
        <Link href="/materie">← MATERIE</Link>
        <Link href="/menu">MENU</Link>
      </nav>
      <section ref={workspace} className={styles.workspace} aria-label="Studenti associati alla materia">
        <div className={styles.subjectPicker} role="group" aria-label="Scegli la materia">
          {slugs.map((slug) => <button key={slug} type="button" aria-pressed={subject === slug}
            onClick={() => chooseSubject(slug)}>{subjects[slug].title.toLocaleUpperCase("it")}</button>)}
        </div>
        <div className={styles.toolbar}>
          <h2>{title}</h2>
          <button type="button" aria-pressed={showArchived} onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? "NASCONDI ARCHIVIATI" : "MOSTRA ARCHIVIATI"}
          </button>
        </div>
        {archive.status === "loading" && <p className={styles.message} role="status">Caricamento studenti…</p>}
        {archive.status === "error" && <div className={styles.message} role="alert">
          <p>L’archivio studenti non è leggibile su questo dispositivo.</p>
          <button type="button" onClick={() => setArchive(readStudents())}>RIPROVA</button>
        </div>}
        {archive.status === "ready" && (visible.length ? <ul className={styles.students}>
          {visible.map((student) => {
            const school = student.schoolName?.trim() || student.school?.trim();
            const grade = student.gradeClass?.trim();
            const schoolLine = [grade && `Classe ${grade}`, school].filter(Boolean).join(" · ");
            return <li key={student.id}>
              <Link href={`/studenti/${encodeURIComponent(student.id)}`} className={styles.studentLink}>
                <span className={styles.studentHeading}>
                  <span>{student.firstName} {student.lastName}</span>
                  <span aria-hidden="true">→</span>
                </span>
                <span className={styles.school}>{schoolLine || "Classe e istituto non indicati"}</span>
                {student.topicsToDeepen?.trim() && <span className={styles.teaching}>
                  Dalla scheda: argomenti da approfondire — {student.topicsToDeepen.trim()}
                </span>}
                {student.status === "archived" && <span className={styles.archived}>ARCHIVIATO</span>}
              </Link>
            </li>;
          })}
        </ul> : <p className={styles.message} role="status">
          {showArchived ? `Nessuno studente associato a ${title}.` : `Nessuno studente attivo associato a ${title}.`}
        </p>)}
      </section>
    </div>
  </main>;
}
