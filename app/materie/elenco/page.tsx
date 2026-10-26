"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadStoredStudents } from "../../data/student-storage";
import type { StudentRecord } from "../../data/students";
import { subjects, type SubjectSlug } from "../materie-data";
import { useTopicCatalog } from "../use-topic-catalog";
import styles from "./elenco.module.css";

const slugs: SubjectSlug[] = ["matematica", "fisica", "chimica"];

function activeStudentsForSubject(students: StudentRecord[], title: string) {
  return students.filter((student) => student.status !== "archived" && student.subjects.some((value) =>
    value.trim().localeCompare(title, "it", { sensitivity: "base" }) === 0)).length;
}

export default function ElencoMateriePage() {
  const catalog = useTopicCatalog();
  const [students, setStudents] = useState<StudentRecord[] | null>(null);

  useEffect(() => {
    const refresh = () => setStudents(loadStoredStudents());
    queueMicrotask(refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/SfondoLeMieMaterieMaterie.png" alt="" fill preload unoptimized
        sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Le mie materie</h1>
      <nav className={styles.navigation} aria-label="Navigazione Le mie materie">
        <Link href="/oggi">OGGI</Link>
        <Link href="/materie">← MATERIE</Link>
        <Link href="/menu">MENU</Link>
      </nav>
      <section className={styles.workspace} aria-label="Discipline">
        <ul className={styles.subjects}>
          {slugs.map((slug) => {
            const subject = subjects[slug];
            const activeCount = students && activeStudentsForSubject(students, subject.title);
            return <li key={slug}>
              <Link href={`/materie/${slug}`} className={styles.subjectLink}>
                <span className={styles.subjectName}>{subject.title}</span>
                <span className={styles.details}>
                  {activeCount !== null && <>{activeCount} {activeCount === 1 ? "studente attivo" : "studenti attivi"} · </>}
                  {catalog?.status === "ready" ? catalog.topics[slug].length : "…"} argomenti
                </span>
              </Link>
            </li>;
          })}
        </ul>
      </section>
    </div>
  </main>;
}
