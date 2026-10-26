"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { contentKey, type SubjectSlug } from "../materie-data";
import { saveLocalText, useLocalText } from "../local-text";
import { loadStoredStudents, STUDENTS_STORAGE_KEY } from "../../data/student-storage";
import type { StudentRecord } from "../../data/students";
import { selectStudentsForSubject } from "../studenti/student-selection";
import StandardInterior, { StandardEmptyState, StandardLinkRow, StandardSection, standardInteriorStyles as styles } from "../StandardInterior";
import { useTopicCatalog } from "../use-topic-catalog";
import TopicList from "./TopicList";

type Subject = { title: string; image: string; topics: string[]; quick: string[] };

const subjectBackgrounds: Record<SubjectSlug, string> = {
  matematica: "/SfondoMatematica.png",
  fisica: "/SfondoFisica.png",
  chimica: "/SfondoChimica.png",
};

function QuickRule({ slug, section }: { slug: SubjectSlug; section: string }) {
  const key = contentKey(slug, `quick:${section}`);
  const value = useLocalText(key);
  const [saved, setSaved] = useState(true);

  return <li className={styles.note}>
    <label className={styles.noteLabel} htmlFor={`quick-${section}`}>{section}</label>
    <textarea id={`quick-${section}`} className={styles.noteInput} value={value}
      onChange={(event) => setSaved(saveLocalText(key, event.target.value))}
      placeholder="Scrivi una regola o un appunto" rows={2} />
    {!saved && <p className={styles.saveError} role="alert">Impossibile salvare su questo dispositivo.</p>}
  </li>;
}

export default function SubjectScreen({ slug, subject }: { slug: SubjectSlug; subject: Subject }) {
  const catalog = useTopicCatalog();
  const [students, setStudents] = useState<StudentRecord[] | null>(null);
  const [studentsError, setStudentsError] = useState(false);

  useEffect(() => {
    const refresh = () => {
      try {
        window.localStorage.getItem(STUDENTS_STORAGE_KEY);
        window.sessionStorage.getItem(STUDENTS_STORAGE_KEY);
        setStudents(loadStoredStudents());
        setStudentsError(false);
      } catch {
        setStudentsError(true);
      }
    };
    queueMicrotask(refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  const associated = students ? selectStudentsForSubject(students, subject.title, false) : [];

  return <StandardInterior title={subject.title} backHref="/materie" backLabel="MATERIE"
    backgroundSrc={subjectBackgrounds[slug]} illustratedTitle>
    {catalog?.status === "ready" ? <TopicList slug={slug} topics={catalog.topics[slug]} /> :
      <StandardSection title="ARGOMENTI"><StandardEmptyState>
        {catalog?.status === "error" ? "Archivio argomenti non leggibile su questo dispositivo." : "Caricamento argomenti…"}
      </StandardEmptyState></StandardSection>}
    <StandardSection title="REGOLE RAPIDE">
      {subject.quick.length ? <ul className={styles.noteList}>
        {subject.quick.map((section) => <QuickRule key={section} slug={slug} section={section} />)}
      </ul> : <StandardEmptyState>Nessuna regola disponibile.</StandardEmptyState>}
    </StandardSection>
    <StandardSection title="STUDENTI ASSOCIATI">
      {studentsError ? <StandardEmptyState>L’archivio studenti non è leggibile su questo dispositivo.</StandardEmptyState>
        : students === null ? <StandardEmptyState>Caricamento studenti…</StandardEmptyState>
          : associated.length ? <ul className={styles.list}>
            {associated.map((student) => <StandardLinkRow key={student.id}
              href={`/studenti/${encodeURIComponent(student.id)}`}>
              {student.firstName} {student.lastName}
            </StandardLinkRow>)}
          </ul> : <StandardEmptyState>Nessuno studente attivo associato a {subject.title}.</StandardEmptyState>}
      <Link className={styles.sectionAction} href={`/materie/${slug}/studenti`}>
        Apri elenco per materia <span aria-hidden="true">→</span>
      </Link>
    </StandardSection>
  </StandardInterior>;
}
