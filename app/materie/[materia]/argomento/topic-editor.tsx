"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { subjects, type SubjectSlug } from "../../materie-data";
import { saveLocalText, useLocalText } from "../../local-text";
import { findTopic, topicNoteKey, type Topic } from "../../topic-catalog";
import { useTopicCatalog } from "../../use-topic-catalog";
import styles from "./topic-editor.module.css";

export default function TopicEditor({ slug, topicId, legacyName }:
  { slug: SubjectSlug; topicId?: string; legacyName?: string }) {
  const catalog = useTopicCatalog();
  if (catalog?.status !== "ready") return <p role="status">
    {catalog?.status === "error" ? "Archivio argomenti non leggibile." : "Caricamento argomento…"}</p>;
  const topic = findTopic(catalog.topics[slug], topicId, legacyName);
  if (!topic) return <main className="min-h-screen bg-[#f8f2e7] p-6 text-[#49372f]">
    <p>Argomento non disponibile.</p><Link href={`/materie/${slug}`}>← Torna alla materia</Link></main>;
  return <TopicContent slug={slug} topic={topic} />;
}

function TopicContent({ slug, topic }: { slug: SubjectSlug; topic: Topic }) {
  const key = topicNoteKey(slug, topic);
  const text = useLocalText(key);
  const [saved, setSaved] = useState(true);

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/SfondoStandard.png" alt="" fill preload unoptimized
        sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <div className={styles.content}>
        <nav className={styles.navigation} aria-label={`Navigazione ${subjects[slug].title}`}>
          <Link href={`/materie/${slug}`}>← INDIETRO</Link>
          <Link href="/menu">MENU</Link>
        </nav>
        <header className={styles.heading}>
          <h1>{topic.name}</h1>
          <p>{subjects[slug].title}</p>
          <div className={styles.ornament} aria-hidden="true"><span /></div>
        </header>
        <h2 className={styles.notesHeading}>I miei appunti</h2>
        <div className={styles.writingArea}>
          <label className={styles.visuallyHidden} htmlFor="materia-appunti">Regole, schemi e appunti</label>
          <textarea id="materia-appunti" value={text}
            onChange={(event) => setSaved(saveLocalText(key, event.target.value))}
            placeholder="Scrivi qui i tuoi appunti..." />
          {!saved && <p role="alert" className={styles.saveError}>Impossibile salvare su questo dispositivo</p>}
        </div>
      </div>
    </div>
  </main>;
}
