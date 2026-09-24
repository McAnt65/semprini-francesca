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

  const field = "w-full rounded-none border-0 border-b border-[#a3836a]/55 bg-transparent px-1 py-2 font-entry-elegant text-[16px] text-[#4b3024] outline-none focus:border-[#792c40]";
  const label = "block font-field-label text-[14px] text-[#792c40]";

  return (
    <main className="min-h-dvh bg-[#e9d8bb] px-3 py-4 text-[#4b3024] sm:py-8">
      <article className="mx-auto max-w-[430px] rounded-[12px] border border-[#b79673] bg-[linear-gradient(145deg,#fff7e9,#f3e3c8)] px-5 pb-8 pt-5 shadow-[0_8px_28px_rgba(75,48,36,.18)] sm:px-8">
        <nav className="flex items-center justify-between font-entry-elegant text-[15px] text-[#6f2638]">
          <Link href={date ? `/calendario/giorno?data=${date}` : "/calendario"} className="py-2">← Calendario</Link>
          <Link href="/menu" className="py-2">Menu</Link>
        </nav>
        <div className="mt-3 text-center">
          <p className="font-entry-elegant text-[15px] italic text-[#8a6653]">Un nuovo appuntamento da custodire</p>
          <h1 className="mt-1 font-register text-[clamp(30px,8vw,40px)] italic text-[#6f2638]">Nuova lezione</h1>
          <div aria-hidden="true" className="mx-auto mt-3 w-28 border-b border-[#a77e66]">♡</div>
        </div>

        <form onSubmit={save} className="mt-7 space-y-5">
          <label className={label}>Studente
            <select required value={studentId} onChange={(event) => selectStudent(event.target.value)} className={field}>
              <option value="">Scegli uno studente</option>
              {students.map((item) => <option value={item.id} key={item.id}>{item.firstName} {item.lastName}</option>)}
            </select>
          </label>
          {studentsLoaded && students.length === 0 && <p className="font-entry-elegant text-[14px] text-[#694a3b]">Il registro è ancora vuoto. <Link href="/studenti/nuovo" className="underline">Aggiungi prima uno studente</Link>.</p>}
          <div className="grid grid-cols-2 gap-5">
            <label className={label}>Data
              <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className={field} />
            </label>
            <label className={label}>Ora
              <input required type="time" step="1800" value={time} onChange={(event) => setTime(event.target.value)} className={field} />
            </label>
          </div>
          <label className={label}>Materia
            <input required list="lesson-subjects" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Matematica, Fisica, Chimica…" className={field} />
            <datalist id="lesson-subjects">{availableSubjects.map((item) => <option key={item} value={item} />)}</datalist>
          </label>
          <div className="grid grid-cols-2 gap-5">
            <label className={label}>Durata (minuti)
              <input required type="number" min="15" max="480" step="15" inputMode="numeric" value={duration} onChange={(event) => setDuration(event.target.value)} className={field} />
            </label>
            <label className={label}>Tariffa oraria (€)
              <input type="text" inputMode="decimal" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} placeholder="Facoltativa" className={field} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <label className={label}>Modalità
              <select value={mode} onChange={(event) => setMode(event.target.value as LessonMode)} className={field}>
                <option value="casa">Casa / studio</option>
                <option value="domicilio">A domicilio</option>
                <option value="online">Online</option>
              </select>
            </label>
            <label className={label}>Stato
              <select value={status} onChange={(event) => setStatus(event.target.value as LessonStatus)} className={field}>
                <option value="confermata">Confermata</option>
                <option value="attesa">In attesa</option>
              </select>
            </label>
          </div>
          {error && <p role="alert" className="rounded-md bg-[#f3dfd8] px-3 py-2 font-entry-elegant text-[14px] text-[#802b38]">{error}</p>}
          <div className="flex items-center justify-between gap-4 pt-4 font-entry-elegant text-[17px]">
            <Link href={date ? `/calendario/giorno?data=${date}` : "/calendario"} className="py-3 text-[#725646]">Annulla</Link>
            <button disabled={saving || students.length === 0} type="submit" className="min-w-36 rounded-md border border-[#69313c] bg-[#703142] px-6 py-3 text-[#fff6e8] shadow-sm disabled:opacity-50">{saving ? "Salvataggio…" : "Salva lezione"}</button>
          </div>
        </form>
      </article>
    </main>
  );
}
