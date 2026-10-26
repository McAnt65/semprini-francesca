"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { loadCalendarAppointments, loadCalendarSeries } from "../../data/calendario/calendar-storage";
import { coveredTopicOf, unclassifiedHistoricalTopicOf } from "../../data/calendario/calendar-topics";
import type { CalendarAppointment, CalendarSeries } from "../../data/calendario/calendar-types";
import { lessonEditHref } from "../../calendario/lesson-navigation";
import { contentKey, subjects, type SubjectSlug } from "../materie-data";
import { useLocalText } from "../local-text";
import { calendarArchiveReadable, lessonTopics } from "./topic-selection";
import { topicNoteKey, type Topic } from "../topic-catalog";
import { useTopicCatalog } from "../use-topic-catalog";
import styles from "./argomenti.module.css";

const slugs: SubjectSlug[] = ["matematica", "fisica", "chimica"];
type Archive = { status: "loading" } | { status: "error" } |
  { status: "ready"; appointments: CalendarAppointment[]; series: CalendarSeries[]; loadedAt: Date };

function readArchive(): Archive {
  try {
    if (!calendarArchiveReadable([window.localStorage, window.sessionStorage])) return { status: "error" };
    return { status: "ready", appointments: loadCalendarAppointments(),
      series: loadCalendarSeries(), loadedAt: new Date() };
  } catch { return { status: "error" }; }
}

function TopicRow({ subject, topic }: { subject: SubjectSlug; topic: Topic }) {
  const note = useLocalText(topicNoteKey(subject, topic));
  return <li><Link className={styles.topicLink} href={`/materie/${subject}/argomento?id=${encodeURIComponent(topic.id)}`}>
    <span className={styles.topicName}>{topic.name}</span>
    <span className={styles.topicDetail}>{note.trim() && <span className={styles.noteBadge}>Appunti presenti</span>}
      <span aria-hidden="true">→</span></span>
  </Link></li>;
}

export default function ArgomentiMateriePage() {
  const catalog = useTopicCatalog();
  const [subject, setSubject] = useState<SubjectSlug>("matematica");
  const [query, setQuery] = useState("");
  const [archive, setArchive] = useState<Archive>({ status: "loading" });
  const [notesReadable, setNotesReadable] = useState(true);
  const workspace = useRef<HTMLElement>(null);

  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      if (!mounted) return;
      setArchive(readArchive());
      try { window.localStorage.getItem(contentKey("matematica", "topic:Algebra")); setNotesReadable(true); }
      catch { setNotesReadable(false); }
    };
    queueMicrotask(refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      mounted = false;
      window.removeEventListener("storage", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const predefined = catalog?.status === "ready" ? catalog.topics[subject].filter((topic) =>
    topic.name.toLocaleLowerCase("it").includes(query.trim().toLocaleLowerCase("it"))) : [];
  const lessonResult = archive.status === "ready"
    ? lessonTopics(archive.appointments, archive.series, archive.loadedAt, subject, query) : null;

  function chooseSubject(slug: SubjectSlug) {
    setSubject(slug);
    setQuery("");
    workspace.current?.scrollTo({ top: 0 });
  }

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/SfondoArgomentiMaterie.png" alt="" fill preload unoptimized
        sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Argomenti</h1>
      <nav className={styles.navigation} aria-label="Navigazione Argomenti">
        <Link href="/oggi">OGGI</Link><Link href="/materie">← MATERIE</Link><Link href="/menu">MENU</Link>
      </nav>
      <section ref={workspace} className={styles.workspace} aria-label="Argomenti per materia">
        <div className={styles.subjectPicker} role="group" aria-label="Scegli la materia">
          {slugs.map((slug) => <button key={slug} type="button" aria-pressed={subject === slug}
            onClick={() => chooseSubject(slug)}>{subjects[slug].title.toLocaleUpperCase("it")}</button>)}
        </div>
        <label className={styles.searchLabel} htmlFor="cerca-argomenti">Cerca per nome in {subjects[subject].title}</label>
        <input id="cerca-argomenti" className={styles.search} type="search" value={query}
          onChange={(event) => setQuery(event.target.value)} placeholder="Cerca un argomento" />

        <section className={styles.group} aria-labelledby="materia-heading">
          <h2 id="materia-heading">Argomenti della materia</h2>
          {catalog === null && <p className={styles.message} role="status">Caricamento argomenti…</p>}
          {catalog?.status === "error" && <p className={styles.message} role="alert">Archivio argomenti non leggibile.</p>}
          {!notesReadable && <p className={styles.message} role="alert">Gli appunti non sono leggibili su questo dispositivo.</p>}
          {catalog?.status === "ready" && (predefined.length ? <ul className={styles.topicList}>
            {predefined.map((topic) => <TopicRow key={topic.id} subject={subject} topic={topic} />)}
          </ul> : <p className={styles.message} role="status">
            {query ? "Nessun argomento corrisponde alla ricerca." : "Nessun argomento per questa materia."}
          </p>)}
        </section>

        <section className={styles.group} aria-labelledby="lessons-heading">
          <h2 id="lessons-heading">Argomenti registrati nelle lezioni svolte</h2>
          {archive.status === "loading" && <p className={styles.message} role="status">Caricamento lezioni…</p>}
          {archive.status === "error" && <div className={styles.message} role="alert">
            <p>L’archivio delle lezioni non è leggibile su questo dispositivo.</p>
            <button type="button" onClick={() => setArchive(readArchive())}>RIPROVA</button>
          </div>}
          {lessonResult && (lessonResult.lessons.length ? <ul className={styles.lessonList}>
            {lessonResult.lessons.map((lesson) => <li key={lesson.occurrenceId}>
              <Link className={styles.lessonLink} href={lessonEditHref(lesson, "/lezioni/storico")}>
                <span className={styles.lessonTopic}>{coveredTopicOf(lesson) || unclassifiedHistoricalTopicOf(lesson)}</span>
                {unclassifiedHistoricalTopicOf(lesson) && <span className={styles.lessonMeta}>Storico: non distinto fra previsto e affrontato</span>}
                <span className={styles.lessonMeta}>{new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" })
                  .format(new Date(`${lesson.date}T12:00:00`))} · {lesson.studentNameSnapshot}</span>
                {lesson.notes.trim() && <span className={styles.lessonNotes}>{lesson.notes.trim()}</span>}
                <span className={styles.lessonAction}>Apri la lezione →</span>
              </Link>
            </li>)}
          </ul> : <p className={styles.message} role="status">
            {query ? "Nessun argomento delle lezioni corrisponde alla ricerca." : "Nessuna lezione svolta con argomento registrato per questa materia."}
          </p>)}
          {lessonResult && lessonResult.withoutTopic > 0 && <p className={styles.footnote}>
            {lessonResult.withoutTopic} {lessonResult.withoutTopic === 1 ? "lezione svolta senza argomento affrontato registrato" : "lezioni svolte senza argomento affrontato registrato"}.
          </p>}
        </section>
      </section>
    </div>
  </main>;
}
