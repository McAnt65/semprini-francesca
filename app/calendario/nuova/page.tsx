"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { checkLessonAvailability } from "../../data/calendario/calendar-availability";
import { isLocalDate, isLocalTime, toLocalDate } from "../../data/calendario/calendar-dates";
import { loadCalendarAppointments, loadCalendarSeries, upsertCalendarAppointmentResult, upsertCalendarSeriesResult } from "../../data/calendario/calendar-storage";
import { TEMPORARY_SAVE_WARNING } from "../../data/save-result";
import type { CalendarAppointment, CalendarSeries, LessonMode, LessonStatus } from "../../data/calendario/calendar-types";
import { loadStoredStudents } from "../../data/student-storage";
import type { StudentRecord } from "../../data/students";
import { loadTariffs } from "../../data/tariffario/tariff-storage";
import type { Tariff } from "../../data/tariffario/tariff-types";
import styles from "./nuova.module.css";
import { calendarSelectionHref, clearNewLessonDraft, compatibleLessonTariff, formatItalianLessonDate, loadNewLessonDraft, newLessonAmountCents, saveNewLessonDraft, studentLessonProposal, supportedSubjectsForStudent, validSelectionToken, type NewLessonDraft } from "./lesson-selection";

function canonicalSubject(value: string) {
  return supportedSubjectsForStudent([value])[0];
}

export default function NewLessonPage() {
  return <Suspense fallback={<main className={styles.page} />}><NewLessonForm /></Suspense>;
}

function NewLessonForm() {
  const router = useRouter();
  const params = useSearchParams();
  const requestedDate = params.get("data");
  const requestedStudent = params.get("studente");
  const origin = params.get("origine");
  const requestedTime = params.get("ora");
  const requestedToken = params.get("bozza");
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("15:00");
  const [duration, setDuration] = useState("60");
  const [mode, setMode] = useState<LessonMode>("casa");
  const [status, setStatus] = useState<LessonStatus>("confermata");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [tariffId, setTariffId] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [rateEdited, setRateEdited] = useState(false);
  const [weekly, setWeekly] = useState(false);
  const [intervalWeeks, setIntervalWeeks] = useState("1");
  const [endsOn, setEndsOn] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingLessonId, setPendingLessonId] = useState<string | null>(null);
  const [draftToken, setDraftToken] = useState("");
  const [draftOrigin, setDraftOrigin] = useState<string | null>(origin);
  const [draftStudent, setDraftStudent] = useState<string | null>(requestedStudent);

  useEffect(() => {
    const restored = validSelectionToken(requestedToken) ? loadNewLessonDraft(requestedToken) : null;
    const token = validSelectionToken(requestedToken) ? requestedToken : crypto.randomUUID();
    if (!validSelectionToken(requestedToken)) {
      const url = new URL(window.location.href);
      url.searchParams.set("bozza", token);
      window.history.replaceState(window.history.state, "", url);
    }
    const active = loadStoredStudents().filter((item) => item.status !== "archived")
      .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "it"));
    const availableTariffs = loadTariffs();
    queueMicrotask(() => {
      setStudents(active);
      setTariffs(availableTariffs);
      setAppointments(loadCalendarAppointments());
      setSeries(loadCalendarSeries());
      setDraftToken(token);
      setDraftOrigin(restored?.origin ?? origin);
      setDraftStudent(restored?.requestedStudent ?? requestedStudent);
      setDate(restored?.date ?? (isLocalDate(requestedDate) ? requestedDate : ""));
      setTime(restored?.time ?? (isLocalTime(requestedTime) ? requestedTime : ""));
      const initialStudent = restored?.studentId ?? requestedStudent;
      const selected = active.find((item) => item.id === initialStudent);
      if (selected) {
        setStudentId(selected.id);
        if (!restored) {
          const proposal = studentLessonProposal(selected, availableTariffs);
          setSubject(proposal.subject); setDuration(proposal.duration); setMode(proposal.mode);
          setTariffId(proposal.tariffId); setHourlyRate(proposal.hourlyRate);
        }
      }
      if (restored) {
        const restoredSubject = canonicalSubject(restored.subject) ?? "";
        const restoredTariff = availableTariffs.find((item) => item.id === restored.tariffId);
        const validRestoredTariff = restoredTariff && compatibleLessonTariff(restoredTariff, restoredSubject, restored.mode);
        setSubject(restoredSubject); setDuration(restored.duration); setMode(restored.mode);
        setStatus(restored.status); setTopic(restored.topic); setNotes(restored.notes);
        setTariffId(validRestoredTariff ? restored.tariffId : ""); setHourlyRate(restored.hourlyRate);
        setRateEdited(Boolean(restored.tariffId && !validRestoredTariff) || (restored.rateEdited ?? Boolean(restored.hourlyRate)));
        setWeekly(restored.weekly); setIntervalWeeks(restored.intervalWeeks); setEndsOn(restored.endsOn);
      }
      setLoaded(true);
    });
  }, [requestedToken, requestedDate, requestedStudent, requestedTime, origin]);

  const student = students.find((item) => item.id === studentId);
  const subjects = supportedSubjectsForStudent(student?.subjects ?? []);
  const compatibleTariffs = tariffs.filter((item) => compatibleLessonTariff(item, subject, mode));
  const recurrence = weekly ? { intervalWeeks: Number(intervalWeeks), endsOn: endsOn || undefined } : undefined;
  const availability = loaded
    ? checkLessonAvailability({ date, startTime: time, durationMinutes: Number(duration), recurrence },
        appointments.filter((item) => item.id !== pendingLessonId),
        series.filter((item) => item.id !== pendingLessonId))
    : { state: "incomplete" as const, reason: "Caricamento del Calendario…" };
  const draft: NewLessonDraft = useMemo(() => ({ studentId, subject, date, time, duration, mode, status, topic, notes,
    tariffId, hourlyRate, rateEdited, weekly, intervalWeeks, endsOn, origin: draftOrigin, requestedStudent: draftStudent }),
    [studentId, subject, date, time, duration, mode, status, topic, notes, tariffId, hourlyRate, rateEdited, weekly, intervalWeeks, endsOn, draftOrigin, draftStudent]);
  useEffect(() => {
    if (loaded && draftToken) saveNewLessonDraft(draftToken, draft);
  }, [loaded, draftToken, draft]);
  const selectionWarning = loaded && date && time && availability.state === "conflict"
    ? "La durata scelta si sovrappone a un'altra lezione. Scegli un altro orario dal Calendario." : "";
  const amountCents = newLessonAmountCents(hourlyRate, duration);
  const back = draftOrigin === "profilo" && draftStudent
    ? `/studenti/${encodeURIComponent(draftStudent)}`
    : draftOrigin === "oggi" ? "/oggi" : date ? `/calendario/giorno?data=${date}` : "/lezioni";

  function openCalendar() {
    if (!draftToken || !saveNewLessonDraft(draftToken, draft)) {
      setError("Non è possibile conservare temporaneamente il modulo in questo browser."); return;
    }
    router.push(calendarSelectionHref("week", isLocalDate(date) ? date : toLocalDate(new Date()), draftToken));
  }

  function chooseStudent(id: string) {
    setStudentId(id);
    const selected = students.find((item) => item.id === id);
    const proposal = selected ? studentLessonProposal(selected, tariffs) : null;
    setSubject(proposal?.subject ?? "");
    setDuration(proposal?.duration ?? "60");
    setMode(proposal?.mode ?? "casa");
    setTariffId(proposal?.tariffId ?? "");
    setHourlyRate(proposal?.hourlyRate ?? "");
    setRateEdited(false);
    setError("");
  }

  function chooseSubject(value: string) {
    setSubject(value);
    const proposal = student && value ? studentLessonProposal(student, tariffs, value, mode) : null;
    setTariffId(rateEdited ? "" : proposal?.tariffId ?? "");
    if (!rateEdited) setHourlyRate(proposal?.hourlyRate ?? "");
  }

  function chooseMode(value: LessonMode) {
    setMode(value);
    const proposal = student && subject ? studentLessonProposal(student, tariffs, subject, value) : null;
    setTariffId(rateEdited ? "" : proposal?.tariffId ?? "");
    if (!rateEdited) setHourlyRate(proposal?.hourlyRate ?? "");
  }

  function chooseTariff(id: string) {
    setTariffId(id);
    const selected = tariffs.find((item) => item.id === id);
    if (selected && compatibleLessonTariff(selected, subject, mode)) {
      setHourlyRate((selected.hourlyRateCents / 100).toFixed(2));
    }
    setRateEdited(true);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const selected = students.find((item) => item.id === studentId);
    const minutes = Number(duration);
    const rate = Number(hourlyRate.replace(",", "."));
    if (!selected) return setError("Scegli uno studente prima di salvare.");
    if (!subject.trim() || (selected.subjects.length > 0 && !selected.subjects.some((item) => canonicalSubject(item) === subject)))
      return setError("Scegli una materia associata allo studente.");
    if (amountCents === null) return setError("Controlla la tariffa oraria e la durata.");
    const rateCents = Math.round(rate * 100);
    const currentTariff = tariffId ? loadTariffs().find((item) => item.id === tariffId) : null;
    if (tariffId && (!currentTariff || !compatibleLessonTariff(currentTariff, subject, mode) || currentTariff.hourlyRateCents !== rateCents)) {
      setTariffs(loadTariffs());
      return setError("La tariffa è cambiata o non è più compatibile. Scegli una tariffa valida o usa un prezzo personalizzato.");
    }
    const fresh = checkLessonAvailability(
      { date, startTime: time, durationMinutes: minutes, recurrence },
      loadCalendarAppointments().filter((item) => item.id !== pendingLessonId),
      loadCalendarSeries().filter((item) => item.id !== pendingLessonId),
    );
    setAppointments(loadCalendarAppointments());
    setSeries(loadCalendarSeries());
    if (fresh.state === "incomplete") return setError(fresh.reason);
    if (fresh.state === "conflict") {
      const item = fresh.occurrence;
      return setError(`Orario non disponibile: ${item.studentNameSnapshot}, ${item.date} alle ${item.startTime}.`);
    }
    const now = new Date().toISOString();
    const snapshot = {
      studentId: selected.id, studentNameSnapshot: `${selected.firstName} ${selected.lastName}`.trim(),
      subject: subject.trim(), durationMinutes: minutes, mode, status, topic: topic.trim(), topicKind: "planned" as const,
      notes: notes.trim(),
      hourlyRateCents: rateCents, tariffId: currentTariff?.id,
      tariffCode: currentTariff?.code,
      paidAmountCents: 0, lessonAmountCents: amountCents,
      paymentStatus: "non_pagata" as const, source: "manuale" as const,
    };
    setSaving(true);
    const lessonId = pendingLessonId ?? crypto.randomUUID();
    setPendingLessonId(lessonId);
    const saved = weekly
      ? upsertCalendarSeriesResult({ ...snapshot, id: lessonId, startsOn: date, startTime: time,
          recurrence: { frequency: "weekly", ...recurrence! }, createdAt: now, updatedAt: now })
      : upsertCalendarAppointmentResult({ ...snapshot, id: lessonId, date, startTime: time,
          createdAt: now, updatedAt: now });
    if (saved.status !== "saved") { setSaving(false); setError(saved.status === "temporary" ? TEMPORARY_SAVE_WARNING : "Non è stato possibile salvare la lezione. Riprova."); return; }
    clearNewLessonDraft(draftToken);
    router.push(draftOrigin === "profilo" ? `/studenti/${encodeURIComponent(selected.id)}`
      : draftOrigin === "oggi" ? "/oggi" : `/calendario/giorno?data=${date}`);
  }

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/SfondoNuovaLezioneLezioni.png" alt="" fill priority unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Nuova lezione</h1>
      <nav aria-label="Navigazione principale" className={styles.navigation}>
        <Link href="/oggi">OGGI</Link><Link href="/lezioni">LEZIONI</Link><Link href="/menu">MENU</Link>
      </nav>
      <form id="new-lesson" onSubmit={save} className={styles.form}>
        <label>Studente<select required value={studentId} onChange={(e) => chooseStudent(e.target.value)}>
          <option value="">Scegli uno studente</option>
          {students.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}
        </select></label>
        <label>Materia<select required value={subject} onChange={(e) => chooseSubject(e.target.value)}>
          <option value="">Scegli la materia</option>
          {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
        </select></label>
        <div className={styles.calendarChoice}><button type="button" onClick={openCalendar}>DATA E ORA · SELEZIONA DAL CALENDARIO</button>
          <output>{isLocalDate(date) && isLocalTime(time) ? `${formatItalianLessonDate(date)} · ${time}` : "Nessun orario selezionato"}</output></div>
        <div className={styles.pair}><label>Durata<select value={duration} onChange={(e) => setDuration(e.target.value)}>
          {[30, 45, 60, 75, 90, 120, 150, 180].map((value) => <option key={value} value={value}>{value} minuti</option>)}
        </select></label><label>Modalità<select value={mode} onChange={(e) => chooseMode(e.target.value as LessonMode)}>
          <option value="casa">In studio</option><option value="domicilio">A domicilio</option><option value="online">Online</option>
        </select></label></div>
        {selectionWarning && <p className={styles.conflict} role="alert">{selectionWarning} <button type="button" onClick={openCalendar}>TORNA AL CALENDARIO</button></p>}
        {availability.state === "available" && availability.limited && <p className={styles.hint}>Ricorrenza verificata fino al {availability.checkedThrough}.</p>}
        <label>Tariffa<select value={tariffId} onChange={(e) => chooseTariff(e.target.value)}>
          <option value="">Tariffa personalizzata</option>
          {compatibleTariffs.map((item) => <option key={item.id} value={item.id}>{item.code} · {(item.hourlyRateCents / 100).toFixed(2)} €/h</option>)}
        </select></label>
        <label>Prezzo orario (€)<input required inputMode="decimal" value={hourlyRate} onChange={(e) => { setHourlyRate(e.target.value); setTariffId(""); setRateEdited(true); }} placeholder="0,00" /></label>
        <details className={styles.optionalDetails}>
          <summary>ARGOMENTO E ALTRE OPZIONI{weekly ? " · Ricorrenza attiva" : ""}</summary>
          {student?.preferences && <p className={styles.studentPreference}>Preferenze annotate: {student.preferences}</p>}
          <label>Argomento previsto (facoltativo)<input value={topic} onChange={(e) => setTopic(e.target.value)} /></label>
          <label>Annotazioni facoltative<textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          <label>Stato<select value={status} onChange={(e) => setStatus(e.target.value as LessonStatus)}><option value="confermata">Confermata</option><option value="attesa">In attesa</option></select></label>
          <label className={styles.check}><input type="checkbox" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} /> Ricorrenza settimanale</label>
          {weekly && <div className={styles.pair}><label>Ogni<select value={intervalWeeks} onChange={(e) => setIntervalWeeks(e.target.value)}>
            {[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value} {value === 1 ? "settimana" : "settimane"}</option>)}
          </select></label><label>Fino al (facoltativo)<input type="date" min={date} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} /></label></div>}
        </details>
        {students.length === 0 && loaded && <p>Il registro è vuoto. <Link href="/studenti/nuovo">Aggiungi uno studente</Link>.</p>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </form>
      <div className={styles.actions}><output className={styles.finalAmount} aria-live="polite">IMPORTO FINALE · {!subject || amountCents === null ? "da definire" : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(amountCents / 100)}</output><button form="new-lesson" type="submit" disabled={saving || !loaded || !students.length || availability.state !== "available"}>{saving ? "SALVATAGGIO…" : "SALVA"}</button><Link href={back} onClick={() => clearNewLessonDraft(draftToken)}>ANNULLA</Link></div>
    </div>
  </main>;
}
