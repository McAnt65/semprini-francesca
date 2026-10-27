"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import SetupChecklist from "../../assistenza/SetupChecklist";
import { HELP_TOPICS, TOURS, type TourId } from "../../assistenza/content";
import { readProgress, requestTour, type AssistanceProgress } from "../../assistenza/progress";
import styles from "../../assistenza/guide.module.css";
import studentsIcon from "../../assets/today-icon-students.webp";
import subjectsIcon from "../../assets/today-icon-subjects.webp";
import lessonsIcon from "../../assets/today-icon-lessons.webp";
import paymentsIcon from "../../assets/today-icon-payments.webp";
import calendarIcon from "../../assets/today-icon-calendar.webp";

const tourOrder: TourId[] = ["primi-passi", "studenti", "materie", "lezioni", "pagamenti"];
const tourIcons = { "primi-passi": calendarIcon, studenti: studentsIcon, materie: subjectsIcon,
  lezioni: lessonsIcon, pagamenti: paymentsIcon };

function highlight(text: string, term: string): ReactNode {
  if (!term) return text;
  const lower = text.toLocaleLowerCase("it-IT");
  const needle = term.toLocaleLowerCase("it-IT");
  const parts: ReactNode[] = [];
  let cursor = 0;
  let index = lower.indexOf(needle);
  while (index !== -1) {
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(<mark key={index}>{text.slice(index, index + term.length)}</mark>);
    cursor = index + term.length;
    index = lower.indexOf(needle, cursor);
  }
  parts.push(text.slice(cursor));
  return parts;
}

export default function GuidePage() {
  const [query, setQuery] = useState("");
  const [progress, setProgress] = useState<AssistanceProgress | null>(null);
  useEffect(() => {
    const refresh = () => setProgress(readProgress());
    queueMicrotask(refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("pageshow", refresh); };
  }, []);
  const term = query.trim();
  const visible = useMemo(() => {
    const needle = term.toLocaleLowerCase("it-IT");
    return needle ? HELP_TOPICS.filter((topic) =>
      [topic.title, topic.summary, topic.keywords, ...topic.details].join(" ").toLocaleLowerCase("it-IT").includes(needle)) : HELP_TOPICS;
  }, [term]);

  function launch(id: TourId, resume = false) {
    requestTour(id, resume);
    setProgress(readProgress());
  }

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <nav className={styles.navigation} aria-label="Navigazione guida"><Link href="/oggi">OGGI</Link><Link href="/menu">MENU</Link></nav>
      <header className={styles.header}>
        <p>IL REGISTRO DI FRANCESCA</p><h1>Manuale e tour guidati</h1>
        <p>Cerca una procedura, apri la sezione indicata e procedi con i tuoi dati. Puoi riprendere o ricominciare ogni tour.</p>
      </header>
      <nav className={styles.jumps} aria-label="Vai a una parte della guida">
        <a href="#manual-title">Manuale</a><a href="#tour-title">Tour</a><a href="#setup-title">Checklist</a>
      </nav>
      <section className={styles.section} aria-labelledby="manual-title">
        <h2 id="manual-title">Manuale</h2>
        <label htmlFor="manual-search" className={styles.searchLabel}>CERCA NEL MANUALE</label>
        <input id="manual-search" className={styles.searchInput} type="search" value={query}
          onChange={(event) => setQuery(event.target.value)} placeholder="Es. lezione, tariffa, programma"
          aria-controls="manual-topics" />
        <p className={styles.resultCount} role="status" aria-live="polite">
          {term ? `${visible.length} ${visible.length === 1 ? "risultato trovato" : "risultati trovati"}`
            : `${HELP_TOPICS.length} argomenti disponibili`}
        </p>
        <div id="manual-topics" className={styles.topics}>
          {visible.length === 0 ? <p className={styles.empty}>Nessun argomento trovato. Prova un altro termine.</p> :
            visible.map((topic) => <article id={topic.id} key={topic.id} className={styles.topic}>
              <h3>{highlight(topic.title, term)}</h3><p className={styles.topicSummary}>{highlight(topic.summary, term)}</p>
              {topic.details.map((line) => <p key={line}>{highlight(line, term)}</p>)}
              <div className={styles.links}>{topic.links.map((link) => <Link key={link.href} href={link.href}>{link.label} →</Link>)}</div>
            </article>)}
        </div>
      </section>
      <section className={styles.section} aria-labelledby="tour-title">
        <h2 id="tour-title">Tour guidati</h2>
        <div className={styles.tours}>{tourOrder.map((id) => <article key={id} className={styles.tour}>
          <Image src={tourIcons[id]} alt="" width={38} height={38} className={styles.tourIcon} />
          <h3>{TOURS[id].title}</h3>
          <p>{TOURS[id].steps.length} {TOURS[id].steps.length === 1 ? "passo" : "passi"}{progress?.activeTour === id ? ` · in corso al passo ${progress.steps[id] + 1}` : progress?.pausedTours.includes(id) ? ` · interrotto al passo ${progress.steps[id] + 1}` : progress?.completedTours.includes(id) ? " · completato" : ""}</p>
          <div className={styles.tourActions}>
            {(progress?.pausedTours.includes(id) || progress?.activeTour === id) && <button type="button" onClick={() => launch(id, true)}>Riprendi</button>}
            <button type="button" onClick={() => launch(id)}>{progress?.completedTours.includes(id) || progress?.pausedTours.includes(id) || progress?.activeTour === id ? "Ricomincia" : "Inizia"}</button>
          </div>
        </article>)}</div>
      </section>
      <SetupChecklist />
      <p className={styles.settingsLink}><Link href="/impostazioni">Impostazioni</Link></p>
    </div>
  </main>;
}
