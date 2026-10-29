"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { toLocalDate, toLocalTime } from "../../../data/calendario/calendar-dates";
import { coveredTopicOf, plannedTopicOf, unclassifiedHistoricalTopicOf } from "../../../data/calendario/calendar-topics";
import type { CalendarOccurrence } from "../../../data/calendario/calendar-types";
import { formatMode, fullName } from "../../student-utils";
import { readExtendedStudentCard, type ExtendedStudentCardRead } from "../card-estesa-read";
import styles from "./estesa.module.css";

function dateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function Field({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === null || !String(value).trim()) return null;
  return <div className={styles.field}><dt>{label}</dt><dd>{value}</dd></div>;
}

function paymentLabel(lesson: CalendarOccurrence) {
  return ({ pagata: "Pagamento registrato", parziale: "Pagamento parziale registrato", non_pagata: "Pagamento non registrato", non_dovuta: "Pagamento non dovuto" })[lesson.paymentStatus];
}

function Lesson({ lesson }: { lesson: CalendarOccurrence }) {
  return <li className={styles.lesson}>
    <div className={styles.lessonHead}><strong>{dateLabel(lesson.date)}, ore {lesson.startTime}</strong><span>{lesson.subject}</span></div>
    <p><b>Stato:</b> {lesson.status}</p>
    <p>{formatMode(lesson.mode)} · {lesson.durationMinutes} min{lesson.isRecurring ? " · Ricorrente" : ""}{lesson.isException ? " · Eccezione" : ""}</p>
    {coveredTopicOf(lesson) && <p><b>Argomento affrontato:</b> {coveredTopicOf(lesson)}</p>}
    {plannedTopicOf(lesson) && <p><b>Argomento previsto:</b> {plannedTopicOf(lesson)}</p>}
    {unclassifiedHistoricalTopicOf(lesson) && <p><b>Argomento storico:</b> {unclassifiedHistoricalTopicOf(lesson)}</p>}
    {lesson.notes && <p><b>Note:</b> {lesson.notes}</p>}
    {lesson.status === "svolta" && <p><b>Pagamento:</b> {paymentLabel(lesson)}</p>}
  </li>;
}

function Card({ data }: { data: Extract<ExtendedStudentCardRead, { status: "ready" }> }) {
  const { student, lessons } = data;
  const now = new Date(), today = toLocalDate(now), time = toLocalTime(now);
  const future = (lesson: CalendarOccurrence) => lesson.date > today || (lesson.date === today && lesson.startTime >= time);
  const upcoming = lessons.filter((lesson) => lesson.status === "confermata" && future(lesson));
  const completed = lessons.filter((lesson) => lesson.status === "svolta" && !future(lesson)).reverse();
  const other = lessons.filter((lesson) => !(lesson.status === "confermata" && future(lesson)) && !(lesson.status === "svolta" && !future(lesson)));
  const last = completed[0];
  const base = `/studenti/${encodeURIComponent(student.id)}`;
  const grade = [student.gradeClass, student.section && `sezione ${student.section}`].filter(Boolean).join(" · ");
  const address = [student.address, student.postalCode, student.city, student.province].filter(Boolean).join(", ");
  return <>
    <header className={styles.identity}><h2>{fullName(student)}</h2><span>{student.status === "archived" ? "In archivio" : "Studente"}</span></header>
    <div className={styles.scroll} role="region" tabIndex={0} aria-label={`Fascicolo di ${fullName(student)}`}>
      <section className={styles.section}><h3>Identità e scuola</h3><dl>
        <Field label="Nome" value={fullName(student)} /><Field label="Nascita" value={student.birthDate && dateLabel(student.birthDate)} />
        <Field label="Scuola" value={student.schoolName || student.school || student.schoolType} /><Field label="Tipo di scuola" value={student.schoolType} />
        <Field label="Classe" value={grade} /><Field label="Corso" value={student.studyCourse} />
        <Field label="Materie" value={student.subjects.join(" · ")} /><Field label="Iscrizione" value={student.enrollmentDate && dateLabel(student.enrollmentDate)} />
      </dl></section>
      <section className={styles.section}><h3>Contatti</h3><dl>
        <Field label="Telefono" value={student.phone} /><Field label="WhatsApp" value={student.whatsapp} />
        <Field label="Email" value={student.email} /><Field label="Indirizzo" value={address} />
        <Field label="Riferimenti" value={student.usefulReferences} />
      </dl></section>
      <section className={styles.section}><h3>Prossime lezioni confermate</h3>
        {upcoming.length ? <ul className={styles.lessonList}>{upcoming.map((lesson) => <Lesson key={lesson.occurrenceId} lesson={lesson} />)}</ul> : <p>Nessuna lezione confermata in programma.</p>}
      </section>
      <section className={styles.section}><h3>Lezioni svolte</h3>
        {completed.length ? <ul className={styles.lessonList}>{completed.map((lesson) => <Lesson key={lesson.occurrenceId} lesson={lesson} />)}</ul> : <p>Nessuna lezione svolta registrata.</p>}
        <Link href={`${base}/lezioni`}>Apri il Diario Studente</Link>
      </section>
      {other.length > 0 && <section className={styles.section}><h3>Altre lezioni ed eccezioni</h3><ul className={styles.lessonList}>
        {other.map((lesson) => <Lesson key={lesson.occurrenceId} lesson={lesson} />)}
      </ul></section>}
      <section className={styles.section}><h3>Percorso e note</h3><dl>
        <Field label="Inizio" value={student.learningStartDate && dateLabel(student.learningStartDate)} />
        <Field label="Obiettivi" value={student.learningGoals} /><Field label="Da approfondire" value={student.topicsToDeepen} />
        <Field label="Prime impressioni" value={student.firstImpressions} /><Field label="Punti di forza" value={student.strengths} />
        <Field label="Interessi" value={student.interests} /><Field label="Note personali" value={student.personalNotes} />
        <Field label="Note familiari" value={student.familyNotes} />
      </dl><Link href={`${base}/percorso`}>Apri il percorso</Link></section>
      <section className={styles.section}><h3>Pagamenti</h3><p>Stati registrati per le lezioni svolte:</p>
        {completed.length ? <ul className={styles.paymentList}>{completed.map((lesson) => <li key={lesson.occurrenceId}>{dateLabel(lesson.date)} · {lesson.subject}: {paymentLabel(lesson)}</li>)}</ul> : <p>Nessuna lezione svolta con stato di pagamento.</p>}
      </section>
      <section className={styles.section}><h3>Famiglia e referente</h3><dl>
        <Field label="Referente" value={student.primaryParent} /><Field label="Telefono" value={student.primaryParentPhone} />
        <Field label="WhatsApp" value={student.primaryParentWhatsapp} /><Field label="Email" value={student.primaryParentEmail} />
        <Field label="Altro referente" value={student.secondaryParent} /><Field label="Telefono" value={student.secondaryParentPhone} />
        <Field label="Email" value={student.secondaryParentEmail} /><Field label="Famiglia" value={student.householdMembers} />
      </dl>{student.familyContacts?.map((contact) => <div key={contact.id} className={styles.contact}><strong>{[contact.firstName, contact.lastName].filter(Boolean).join(" ")}</strong><dl>
        <Field label="Relazione" value={contact.relationship} /><Field label="Telefono" value={contact.phone} />
        <Field label="WhatsApp" value={contact.whatsapp} /><Field label="Email" value={contact.email} />
      </dl></div>)}</section>
      <section className={styles.section}><h3>Ultime attività</h3><dl>
        <Field label="Scheda aggiornata" value={student.updatedAt && !Number.isNaN(Date.parse(student.updatedAt)) ? new Date(student.updatedAt).toLocaleDateString("it-IT") : undefined} />
        <Field label="Ultima lezione" value={last && `${dateLabel(last.date)}, ore ${last.startTime}`} />
        <Field label="Argomento" value={last && coveredTopicOf(last)} />
      </dl></section>
    </div>
    <nav className={styles.contextNav} aria-label="Pagine dello studente"><Link href={base}>Card Studente</Link><Link href={`${base}/lezioni`}>Diario Studente</Link></nav>
  </>;
}

export default function ExtendedStudentCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ExtendedStudentCardRead | null>(null);
  useEffect(() => {
    let result: ExtendedStudentCardRead;
    try { result = readExtendedStudentCard(id); } catch { result = { status: "unreadable" }; }
    queueMicrotask(() => setData(result));
  }, [id]);
  return <main className={styles.page}><div className={styles.sheet}>
    <Image src="/SfondoCardEstesa.png" alt="" fill priority unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
    <h1 className="sr-only">Card Estesa</h1>
    <nav className={styles.topNav} aria-label="Navigazione principale"><Link href="/oggi">OGGI</Link><Link href="/menu">MENU</Link></nav>
    <section className={styles.workspace} aria-label="Card Estesa, sola consultazione">
      {!data && <p role="status">Caricamento del fascicolo…</p>}
      {data?.status === "missing" && <div className={styles.notice}><p>Studente non trovato.</p><Link href="/studenti/elenco">Apri l’elenco studenti</Link></div>}
      {data?.status === "unreadable" && <div className={styles.notice} role="alert"><p>Il fascicolo non è leggibile. Nessun dato è stato modificato.</p><Link href="/studenti/elenco">Apri l’elenco studenti</Link></div>}
      {data?.status === "conflict" && <div className={styles.notice} role="alert"><p>Esistono copie discordanti di questo studente. Consultazione sospesa.</p><Link href="/studenti/elenco">Apri l’elenco studenti</Link></div>}
      {data?.status === "ready" && <Card data={data} />}
    </section>
  </div></main>;
}
