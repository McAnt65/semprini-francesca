"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { getStoredStudentById } from "../../data/student-storage";
import { getStudentById, type StudentRecord } from "../../data/students";
import { archiveStudentAfterConfirmation } from "../archive-actions";
import { TEMPORARY_SAVE_WARNING } from "../../data/save-result";
import { fullName, formatLesson, formatMode, loadStudentArchiveOverview, loadStudentLessonSummary, summarizeStudentPayments } from "../student-utils";
import type { CalendarOccurrence } from "../../data/calendario/calendar-types";
import styles from "./cover.module.css";

type CardData = { student: StudentRecord; next?: CalendarOccurrence; payment: ReturnType<typeof summarizeStudentPayments>; suggestArchiving: boolean };

export default function StudentCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [card, setCard] = useState<CardData | null | undefined>(undefined);

  useEffect(() => {
    const student = getStoredStudentById(id) ?? getStudentById(id);
    if (!student) { queueMicrotask(() => setCard(null)); return; }
    const summary = loadStudentLessonSummary();
    const overview = loadStudentArchiveOverview(id);
    const payment = summarizeStudentPayments(overview.lessons);
    queueMicrotask(() => setCard({ student, next: summary.nextByStudent.get(id), payment, suggestArchiving: overview.suggestArchiving }));
  }, [id]);

  if (card === undefined) return <main className={styles.loading} aria-label="Caricamento Card Studente" />;
  if (card === null) return <main className={styles.missing}><p>Studente non trovato.</p><Link href="/studenti/elenco">Torna all’elenco</Link></main>;
  return <CardContent key={id} {...card} />;
}

function CardContent({ student, next, payment, suggestArchiving }: CardData) {
  const router = useRouter();
  const [archiveError, setArchiveError] = useState("");
  const name = fullName(student);
  const base = `/studenti/${encodeURIComponent(student.id)}`;

  const school = student.schoolName || student.school || student.schoolType;
  const grade = [student.gradeClass, student.section && `sezione ${student.section}`].filter(Boolean).join(" · ");
  const callNumber = student.phone.replace(/[^\d+]/g, "");
  const digits = (student.whatsapp || student.phone).replace(/\D/g, "");
  const whatsapp = digits && !digits.startsWith("39") ? `39${digits}` : digits;
  const email = /^\S+@\S+\.\S+$/.test(student.email.trim()) ? student.email.trim() : "";
  const address = [student.address, student.postalCode, student.city, student.province].filter(Boolean).join(", ");

  function archive() {
    const result = archiveStudentAfterConfirmation(student.id, payment.hasOutstanding);
    if (result === "cancelled") return;
    if (result === "failed") {
      setArchiveError("Archiviazione non riuscita. Riprova.");
      return;
    }
    if (result === "temporary") { setArchiveError(TEMPORARY_SAVE_WARNING); return; }
    router.push("/studenti/archivio");
  }

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/SfondoCardStudente.png" alt="" fill priority unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Card Studente: {name}</h1>
      <nav className={styles.navigation} aria-label="Navigazione Card Studente">
        <Link href="/oggi">OGGI</Link><span aria-current="page">CARD STUDENTE</span><Link href="/menu">MENU</Link>
      </nav>
      <section className={styles.workspace} aria-label={`Scheda operativa di ${name}`}>
        <p className={styles.name}>{name}</p>
        <div className={styles.details} tabIndex={0} aria-label="Informazioni dello studente">
          {(school || grade) && <div className={styles.group}><h2>Scuola e classe</h2>{school && <p className={styles.value}>{school}</p>}{grade && <p className={styles.value}>{grade}</p>}</div>}
          {student.subjects.length > 0 && <div className={styles.group}><h2>Materie</h2><p className={styles.value}>{student.subjects.join(" · ")}</p></div>}
          {next && <div className={styles.group}><h2>Prossima lezione</h2><p className={styles.value}>{formatLesson(`${next.date}T${next.startTime}`)}</p><p className={styles.value}>{formatMode(next.mode)}</p></div>}
          <div className={styles.group}><h2>Stato pagamenti</h2><p className={styles.value}>{payment.status}</p></div>
          {student.status !== "archived" && suggestArchiving && <p className={styles.archiveSuggestion}>Nessuna lezione recente. Vuoi valutare l&apos;archiviazione?</p>}
        </div>
        <div className={styles.footer}>
          <nav className={styles.actions} aria-label="Schede dello studente">
            <Link href={`/studenti/nuovo?id=${encodeURIComponent(student.id)}`}>SCHEDA NARRATA</Link>
            <Link href={`${base}/lezioni`}>DIARIO STUDENTE</Link>
            <Link href={`${base}/estesa`}>CARD ESTESA</Link>
          </nav>
          {student.status !== "archived" && <div className={styles.archiveAction}>
            <button type="button" onClick={archive}>ARCHIVIA STUDENTE</button>
            {archiveError && <p role="alert">{archiveError}</p>}
          </div>}
          {(callNumber || whatsapp || email || address) && <nav className={styles.contacts} aria-label="Contatti rapidi">
          {callNumber && <a href={`tel:${callNumber}`} aria-label="Chiama lo studente" title="Chiama"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 2.8c.5-.5 1.3-.6 1.9-.2l2.1 1.5c.6.4.8 1.1.5 1.8L10 8.4a15 15 0 0 0 5.6 5.6l2.5-1.1c.7-.3 1.4-.1 1.8.5l1.5 2.1c.4.6.3 1.4-.2 1.9l-1.5 1.5c-.8.8-2 1.1-3.1.8A20.6 20.6 0 0 1 4.3 7.4c-.3-1.1 0-2.3.8-3.1z" /></svg></a>}
          {whatsapp && <a href={`https://wa.me/${whatsapp}`} aria-label="Scrivi su WhatsApp allo studente" title="WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a9.5 9.5 0 0 0-8.2 14.3L2 22l5.9-1.7A9.5 9.5 0 1 0 12 2Zm0 2.4a7.1 7.1 0 1 1-3.6 13.2l-.5-.3-2.3.7.7-2.2-.3-.6A7.1 7.1 0 0 1 12 4.4Zm-3.1 2.8c-.4 0-.7.2-1 .6-.4.5-.7 1.1-.7 1.7 0 .6.3 1.3.8 2 .9 1.5 2.3 2.8 4 3.7 1 .5 1.8.7 2.4.5.7-.2 1.5-.8 1.7-1.5.1-.4.1-.7-.2-.8l-1.9-.9c-.3-.1-.5-.1-.7.2l-.8.9c-.1.2-.3.2-.6.1a7.8 7.8 0 0 1-3-2.7c-.2-.3 0-.5.1-.6l.6-.8c.1-.2.2-.4.1-.6l-.7-1.6c-.1-.3-.3-.4-.6-.4Z" /></svg></a>}
          {email && <a href={`mailto:${email}`} aria-label="Invia email allo studente" title="Email"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5h17A1.5 1.5 0 0 1 22 6.5v.8l-10 6.5L2 7.3v-.8A1.5 1.5 0 0 1 3.5 5ZM2 10l9.2 6a1.5 1.5 0 0 0 1.6 0L22 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 17.5z" /></svg></a>}
          {address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} aria-label="Apri l’indirizzo sulla mappa" title="Mappa"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 0 0-8-8Zm0 11.3a3.3 3.3 0 1 1 0-6.6 3.3 3.3 0 0 1 0 6.6Z" /></svg></a>}
          </nav>}
        </div>
      </section>
    </div>
  </main>;
}
