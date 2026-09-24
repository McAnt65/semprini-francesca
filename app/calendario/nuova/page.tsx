"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { isLocalDate, isLocalTime, toLocalDate } from "../../data/calendario/calendar-dates";
import { upsertCalendarAppointment } from "../../data/calendario/calendar-storage";
import type { CalendarAppointment, LessonMode, LessonStatus } from "../../data/calendario/calendar-types";
import { loadStoredStudents } from "../../data/student-storage";
import type { StudentRecord } from "../../data/students";

const subjects = ["Matematica", "Fisica", "Chimica"];

export default function NewLessonPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-[#f4eddf]" />}>
      <NewLessonForm />
    </Suspense>
  );
}

function NewLessonForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedDate = searchParams.get("data");
  const requestedStudent = searchParams.get("studente");
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("15:00");
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState("60");
  const [mode, setMode] = useState<LessonMode>("casa");
  const [status, setStatus] = useState<LessonStatus>("confermata");
  const [hourlyRate, setHourlyRate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const available = loadStoredStudents().sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "it")
    );
    queueMicrotask(() => {
      setStudents(available);
      setStudentsLoaded(true);
      setDate(isLocalDate(requestedDate) ? requestedDate : toLocalDate(new Date()));
      if (requestedStudent && available.some((item) => item.id === requestedStudent)) {
        setStudentId(requestedStudent);
      }
    });
  }, [requestedDate, requestedStudent]);

  const student = students.find((item) => item.id === studentId);
  const availableSubjects = useMemo(
    () => Array.from(new Set([...subjects, ...(student?.subjects ?? [])].filter(Boolean))),
    [student]
  );

  function selectStudent(id: string) {
    setStudentId(id);
    const selected = students.find((item) => item.id === id);
    if (selected?.subjects.length === 1) setSubject(selected.subjects[0]);
    else if (selected && !selected.subjects.includes(subject)) setSubject("");
    setError("");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const selected = students.find((item) => item.id === studentId);
    const minutes = Number(duration);
    const rate = hourlyRate.trim() ? Number(hourlyRate.replace(",", ".")) : 0;
    if (!selected) return setError("Scegli uno studente prima di salvare.");
    if (!isLocalDate(date) || !isLocalTime(time)) return setError("Controlla la data e l’ora della lezione.");
    if (!subject.trim()) return setError("Indica la materia della lezione.");
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 480)
      return setError("La durata deve essere tra 15 minuti e 8 ore.");
    if (!Number.isFinite(rate) || rate < 0 || rate > 10000)
      return setError("Controlla la tariffa oraria.");

    const now = new Date().toISOString();
    const rateCents = Math.round(rate * 100);
    const appointment: CalendarAppointment = {
      id: crypto.randomUUID(),
      studentId: selected.id,
      studentNameSnapshot: `${selected.firstName} ${selected.lastName}`.trim(),
      subject: subject.trim(),
      date,
      startTime: time,
      durationMinutes: minutes,
      mode,
      status,
      topic: "",
      notes: "",
      hourlyRateCents: rateCents,
      lessonAmountCents: Math.round((rateCents * minutes) / 60),
      paymentStatus: "non_pagata",
      source: "manuale",
      createdAt: now,
      updatedAt: now,
    };
    setSaving(true);
    if (!upsertCalendarAppointment(appointment)) {
      setSaving(false);
      setError("Non è stato possibile salvare la lezione sul telefono. Riprova.");
      return;
    }
    router.push(`/calendario/giorno?data=${date}`);
  }

  const field = "h-full w-full appearance-none border-0 bg-transparent px-1 font-entry-elegant text-[clamp(12px,3.5vw,17px)] text-[#4b3024] outline-none focus-visible:bg-[#fff8e8]/60 focus-visible:ring-1 focus-visible:ring-[#792c40]";
  const position = (top: string, left = "40%", width = "49%") => ({ top, left, width, height: "4.6%" });
  const back = date ? `/calendario/giorno?data=${date}` : "/calendario";

  return (
    <main className="min-h-dvh bg-[#f4eddf] text-[#4b3024]">
      <div className="relative mx-auto aspect-[941/1672] w-full max-w-[430px] min-h-dvh sm:min-h-0">
        {/* Lo sfondo è una tavola illustrata; tutti i dati restano elementi HTML. */}
        <img src="/calendar-new-lesson-bg-clean.png" alt="" className="absolute inset-0 h-full w-full" />
        <h1 className="sr-only">Nuova lezione</h1>
        <Link href={back} aria-label="Indietro al calendario" className="absolute left-[4%] top-[1%] h-[5%] w-[22%]" />
        <Link href="/menu" aria-label="Menu" className="absolute right-[4%] top-[1%] h-[5%] w-[22%]" />

        <form onSubmit={save} className="absolute inset-0 pointer-events-none">
          <label className="pointer-events-auto absolute" style={position("25.1%")}> <span className="sr-only">Studente</span>
            <select required value={studentId} onChange={(event) => selectStudent(event.target.value)} className={field}>
              <option value="">Scegli uno studente</option>
              {students.map((item) => <option value={item.id} key={item.id}>{item.firstName} {item.lastName}</option>)}
            </select>
          </label>
          <label className="pointer-events-auto absolute" style={position("32.4%")}><span className="sr-only">Data</span>
            <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className={field} />
          </label>
          <label className="pointer-events-auto absolute" style={position("39.5%")}><span className="sr-only">Ora</span>
            <input required type="time" step="1800" value={time} onChange={(event) => setTime(event.target.value)} className={field} />
          </label>
          <label className="pointer-events-auto absolute" style={position("46.8%")}><span className="sr-only">Materia</span>
            <input required list="lesson-subjects" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Matematica, Fisica, Chimica…" className={field} />
            <datalist id="lesson-subjects">{availableSubjects.map((item) => <option key={item} value={item} />)}</datalist>
          </label>
          <label className="pointer-events-auto absolute" style={position("54.0%", "42%", "47%") }><span className="sr-only">Durata in minuti</span>
            <select required value={duration} onChange={(event) => setDuration(event.target.value)} className={field}>
              {[30, 45, 60, 75, 90, 120, 150, 180].map((minutes) => <option key={minutes} value={minutes}>{minutes} minuti</option>)}
            </select>
          </label>
          <label className="pointer-events-auto absolute" style={position("61.1%") }><span className="sr-only">Modalità</span>
              <select value={mode} onChange={(event) => setMode(event.target.value as LessonMode)} className={field}>
                <option value="casa">Casa / studio</option>
                <option value="domicilio">A domicilio</option>
                <option value="online">Online</option>
              </select>
          </label>
          <label className="pointer-events-auto absolute" style={position("68.2%") }><span className="sr-only">Stato della lezione</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as LessonStatus)} className={field}>
                <option value="confermata">Confermata</option>
                <option value="attesa">In attesa</option>
              </select>
          </label>
          <label className="pointer-events-auto absolute" style={position("75.6%", "45%", "44%") }><span className="sr-only">Tariffa oraria in euro, facoltativa</span>
            <input type="text" inputMode="decimal" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} placeholder="Facoltativa (€)" className={field} />
          </label>
          {(error || (studentsLoaded && students.length === 0)) && <p role="alert" className="pointer-events-auto absolute left-[12%] top-[82%] w-[76%] rounded bg-[#fff5e5] px-2 py-1 text-center font-entry-elegant text-[clamp(11px,3vw,15px)] text-[#802b38]">{error || <>Il registro è vuoto. <Link href="/studenti/nuovo" className="underline">Aggiungi uno studente</Link>.</>}</p>}
          <button disabled={saving || students.length === 0} type="submit" aria-label={saving ? "Salvataggio della lezione" : "Salva lezione"} className="pointer-events-auto absolute left-[19%] top-[88%] h-[8.5%] w-[62%] rounded-md bg-transparent disabled:opacity-50"><span className="sr-only">{saving ? "Salvataggio…" : "Salva lezione"}</span></button>
        </form>
      </div>
    </main>
  );
}
