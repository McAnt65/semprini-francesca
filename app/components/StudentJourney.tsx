"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import journeyBackground from "../assets/student-journey-watercolor.webp";
import { toLocalDate } from "../data/calendario/calendar-dates";
import { selectOccurrencesInRange } from "../data/calendario/calendar-selectors";
import { createSingleOccurrenceException } from "../data/calendario/calendar-recurrence";
import { loadCalendarAppointments, loadCalendarSeries, upsertCalendarAppointment } from "../data/calendario/calendar-storage";
import type { CalendarOccurrence } from "../data/calendario/calendar-types";
import type { StudentRecord } from "../data/students";

function readLessons(studentId: string) {
  const appointments = loadCalendarAppointments();
  const series = loadCalendarSeries();
  const today = toLocalDate(new Date());
  const from = [today, ...appointments.map(item => item.date), ...series.map(item => item.startsOn)].sort()[0];
  return selectOccurrencesInRange(appointments, series, from, today)
    .filter(item => item.studentId === studentId && item.status === "svolta")
    .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
}

const dateLabel = (date: string) => new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`));
const enrollmentLabel = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`))
  : value;

export default function StudentJourney({ student }: { student: StudentRecord }) {
  const name = `${student.firstName} ${student.lastName}`.trim();
  const [lessons, setLessons] = useState<CalendarOccurrence[]>([]);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { queueMicrotask(() => { setLessons(readLessons(student.id)); setReady(true); }); }, [student.id]);

  function begin(item: CalendarOccurrence) {
    setEditing(item.occurrenceId);
    setTopic(item.topic);
    setNotes(item.notes);
    setError("");
  }

  function save(item: CalendarOccurrence) {
    const appointments = loadCalendarAppointments();
    const existing = appointments.find(value => value.id === item.appointmentId);
    const series = loadCalendarSeries().find(value => value.id === item.seriesId);
    const update = existing
      ? { ...existing, topic: topic.trim(), notes: notes.trim(), updatedAt: new Date().toISOString() }
      : series
        ? createSingleOccurrenceException(series, item.originalOccurrenceDate ?? item.date, crypto.randomUUID(), { topic: topic.trim(), notes: notes.trim(), status: "svolta" })
        : null;
    if (!update || !upsertCalendarAppointment(update)) {
      setError("Impossibile salvare gli appunti. Riprova.");
      return;
    }
    setLessons(readLessons(student.id));
    setEditing(null);
    setError("");
  }

  return <main className="min-h-dvh w-full bg-[#efe3ce] text-[#51372a]">
    <div className="relative mx-auto aspect-[941/1672] min-h-dvh w-full max-w-[430px] overflow-hidden sm:min-h-0 sm:rounded-[28px]">
      <Image src={journeyBackground} alt="" fill priority unoptimized sizes="(max-width: 430px) 100vw, 430px" className="pointer-events-none object-fill" />
      <h1 className="sr-only">Percorso di {name} con Francesca</h1>
      <Link href={`/studenti/${encodeURIComponent(student.id)}`} aria-label="Torna alla scheda dello studente" className="absolute left-[2%] top-[1%] z-30 h-[6%] w-[25%]" />
      <Link href="/menu" aria-label="Menu" className="absolute right-[2%] top-[1%] z-30 h-[6%] w-[25%]" />
      <div className="absolute left-[4%] top-[8.5%] h-[20.5%] w-[32%] overflow-hidden -rotate-[4deg]">
        {student.avatarUrl && <Image src={student.avatarUrl} alt={`Fotografia di ${name}`} fill unoptimized className="object-cover" />}
      </div>
      <div className="absolute left-[38%] top-[22%] h-[12%] w-[52%] overflow-auto text-center font-entry-elegant">
        <p className="text-[clamp(18px,5vw,27px)] leading-tight text-[#762b3b]">{name}</p>
        <p className="mt-1 text-[clamp(11px,3vw,15px)]">{student.subjects.join(" · ")}</p>
        {student.enrollmentDate && <p className="text-[clamp(10px,2.8vw,14px)]">Mio studente da {enrollmentLabel(student.enrollmentDate)}</p>}
      </div>

      <section aria-label={`Appunti delle lezioni di ${name}`} className="absolute left-[10%] top-[37%] h-[51%] w-[80%] overflow-y-auto overscroll-contain pr-[2%] font-entry-elegant [scrollbar-width:thin]">
        {ready && lessons.length === 0 && <p className="mt-8 text-center text-[clamp(13px,3.5vw,17px)] italic">Qui compariranno gli appunti delle lezioni svolte.</p>}
        {lessons.map(item => <article key={item.occurrenceId} className="mb-5 border-b border-[#a78568]/45 pb-4">
          <h2 className="text-[clamp(15px,4vw,20px)] text-[#762b3b]">{dateLabel(item.date)} · {item.subject}</h2>
          {editing === item.occurrenceId ? <div className="mt-2 space-y-2 text-[clamp(12px,3.1vw,15px)]">
            <label className="block">Argomento<input value={topic} onChange={event => setTopic(event.target.value)} className="mt-1 w-full border-b border-[#98715b] bg-[#fff9ec]/70 px-2 py-1 outline-[#762b3b]" /></label>
            <label className="block">Appunti<textarea value={notes} onChange={event => setNotes(event.target.value)} rows={4} className="mt-1 w-full resize-y border-b border-[#98715b] bg-[#fff9ec]/70 px-2 py-1 outline-[#762b3b]" /></label>
            {error && <p role="alert" className="text-[#a2273c]">{error}</p>}
            <div className="flex gap-5 text-[#762b3b]"><button type="button" onClick={() => save(item)}>Salva</button><button type="button" onClick={() => setEditing(null)}>Annulla</button></div>
          </div> : <>
            <p className="mt-2 text-[clamp(13px,3.5vw,18px)] italic leading-[1.4]">{item.topic || "Argomento da annotare"}</p>
            {item.notes && <p className="mt-1 whitespace-pre-wrap text-[clamp(12px,3.2vw,16px)] leading-[1.45]">{item.notes}</p>}
            <button type="button" onClick={() => begin(item)} className="mt-2 text-[clamp(11px,2.9vw,14px)] text-[#762b3b] underline">{item.topic || item.notes ? "Modifica appunti" : "Scrivi appunti"}</button>
          </>}
        </article>)}
      </section>

      <nav aria-label="Azioni studente" className="absolute inset-x-[2%] bottom-[1%] h-[8%]">
        <Link href={`/calendario/nuova?studente=${encodeURIComponent(student.id)}&origine=profilo`} aria-label={`Nuova lezione per ${name}`} className="absolute inset-y-0 left-0 w-[33.3%]" />
        <Link href={`/studenti/${encodeURIComponent(student.id)}/lezioni`} aria-label={`Diario completo di ${name}`} className="absolute inset-y-0 left-[33.3%] w-[33.4%]" />
        <Link href={`/studenti/${encodeURIComponent(student.id)}/modifica`} aria-label={`Modifica ${name}`} className="absolute inset-y-0 right-0 w-[33.3%]" />
      </nav>
    </div>
  </main>;
}
