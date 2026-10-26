"use client";

import Link from "next/link";
import { useState } from "react";
import { loadStoredStudents, removeStoredStudentsByIds, saveStoredStudent, STUDENTS_STORAGE_KEY } from "../data/student-storage";
import type { StudentRecord } from "../data/students";
import { loadTariffs, saveTariffs } from "../data/tariffario/tariff-storage";
import {
  loadCalendarAppointments, loadCalendarSeries, saveCalendarAppointments, saveCalendarSeries,
} from "../data/calendario/calendar-storage";
import { selectOccurrencesInRange } from "../data/calendario/calendar-selectors";
import { createSingleOccurrenceException } from "../data/calendario/calendar-recurrence";
import { TEST_MANIFEST, TEST_MANIFEST_KEY, TRANSFER_MANIFEST, TRANSFER_MANIFEST_KEY, testAppointments, testSeries, testStudentAddresses, testStudents, testTariffs, transferLorenzoAppointment } from "./fixtures";
import { browserProgramSources, readProgramArchive } from "../materie/programmi/program-storage";
import { TEST_PROGRAM_PERSONAL_ID } from "./program-fixtures";
import { seedTestPrograms } from "./seed-test-programs";

type Manifest = typeof TEST_MANIFEST;

function readManifest(): Manifest | null {
  const raw = window.localStorage.getItem(TEST_MANIFEST_KEY);
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  return JSON.stringify(parsed) === JSON.stringify(TEST_MANIFEST) ? TEST_MANIFEST : null;
}

function matchingRecords() {
  const students = loadStoredStudents().filter((item) => TEST_MANIFEST.students.some((id) => id === item.id));
  const tariffs = loadTariffs().filter((item) => TEST_MANIFEST.tariffs.some((id) => id === item.id));
  const appointments = loadCalendarAppointments().filter((item) => TEST_MANIFEST.appointments.some((id) => id === item.id));
  const series = loadCalendarSeries().filter((item) => TEST_MANIFEST.series.some((id) => id === item.id));
  return { students, tariffs, appointments, series };
}

function assertOwned(records: ReturnType<typeof matchingRecords>) {
  if (records.students.some((item) => !item.lastName.endsWith("[TEST]")) ||
    records.tariffs.some((item) => !["TEST_STD", "TEST_ADV"].includes(item.code)) ||
    records.appointments.some((item) => !TEST_MANIFEST.students.some((id) => id === item.studentId)) ||
    records.series.some((item) => !TEST_MANIFEST.students.some((id) => id === item.studentId))) {
    throw new Error("Un ID di prova è occupato da un record diverso: operazione interrotta.");
  }
}

function persistentTestStudents(): StudentRecord[] {
  const raw = window.localStorage.getItem(STUDENTS_STORAGE_KEY);
  if (raw === null) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error("Archivio studenti non leggibile: nessun programma inserito."); }
  if (!Array.isArray(parsed)) throw new Error("Archivio studenti non leggibile: nessun programma inserito.");
  const selected = parsed.filter((item): item is StudentRecord => item !== null && typeof item === "object" &&
    TEST_MANIFEST.students.some((id) => id === item.id));
  if (selected.some((student) => typeof student.firstName !== "string" || typeof student.lastName !== "string" ||
    !Array.isArray(student.subjects) || !student.subjects.every((subject) => typeof subject === "string"))) {
    throw new Error("Studente TEST non leggibile: nessun programma inserito.");
  }
  return selected;
}

export default function TestDataControls() {
  const [message, setMessage] = useState("Nessun dato viene inserito all'apertura della pagina.");
  const [busy, setBusy] = useState(false);

  function insertPrograms() {
    setBusy(true);
    try {
      const result = seedTestPrograms(browserProgramSources(), persistentTestStudents());
      const model = result.model === "created" ? "Modello TEST inserito" : "Modello TEST già presente";
      const personal = result.personal === "no-test-student"
        ? "Nessuno studente TEST di Matematica nell'archivio persistente: programma personale non creato."
        : result.personal === "created"
          ? `Programma personale inserito per ${result.studentName}.`
          : `Programma personale di ${result.studentName} già presente; stati e modifiche conservati.`;
      setMessage(`${model}. ${personal} Verifica i risultati in PROGRAMMI.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Inserimento dei programmi TEST non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  function insert() {
    setBusy(true);
    try {
      const manifest = readManifest();
      const records = matchingRecords();
      if (!manifest && Object.values(records).some((items) => items.length)) {
        throw new Error("Esistono già ID riservati ai dati di prova senza manifesto: inserimento interrotto.");
      }
      assertOwned(records);
      const existingTariffs = loadTariffs();
      if (existingTariffs.some((item) =>
        testTariffs.some((fixture) => item.code === fixture.code && item.id !== fixture.id)
      )) {
        throw new Error("Una tariffa usa già un codice TEST riservato: inserimento interrotto.");
      }
      // The manifest is written before any record, so an interrupted insertion can be resumed or removed.
      window.localStorage.setItem(TEST_MANIFEST_KEY, JSON.stringify(TEST_MANIFEST));
      const studentIds = new Set(records.students.map((item) => item.id));
      for (const student of testStudents) {
        if (!studentIds.has(student.id) && !saveStoredStudent(student, { requirePersistent: true })) {
          throw new Error(`Salvataggio non riuscito: ${student.firstName}.`);
        }
      }
      const tariffs = loadTariffs();
      const tariffIds = new Set(tariffs.map((item) => item.id));
      if (testTariffs.some((item) => !tariffIds.has(item.id)) &&
        !saveTariffs([...tariffs, ...testTariffs.filter((item) => !tariffIds.has(item.id))])) {
        throw new Error("Salvataggio delle tariffe non riuscito.");
      }
      const appointments = loadCalendarAppointments();
      const appointmentIds = new Set(appointments.map((item) => item.id));
      if (testAppointments.some((item) => !appointmentIds.has(item.id)) &&
        !saveCalendarAppointments([...appointments, ...testAppointments.filter((item) => !appointmentIds.has(item.id))])) {
        throw new Error("Salvataggio delle lezioni non riuscito.");
      }
      const series = loadCalendarSeries();
      const seriesIds = new Set(series.map((item) => item.id));
      if (testSeries.some((item) => !seriesIds.has(item.id)) &&
        !saveCalendarSeries([...series, ...testSeries.filter((item) => !seriesIds.has(item.id))])) {
        throw new Error("Salvataggio della ricorrenza non riuscito.");
      }
      const saved = matchingRecords();
      const occurrences = selectOccurrencesInRange(saved.appointments, saved.series, "2026-10-01", "2026-11-09");
      if (saved.students.length !== 3 || saved.tariffs.length !== 2 || saved.appointments.length !== 8 || saved.series.length !== 1 || occurrences.length !== 12) {
        throw new Error("Dati salvati solo in parte. Premi di nuovo INSERISCI DATI DI PROVA per completare.");
      }
      setMessage("Pronti nel browser: 3 studenti, 2 tariffe, 8 lezioni singole e 4 occorrenze settimanali (12 lezioni visibili). Nessun duplicato creato.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operazione non riuscita.");
    } finally {
      setBusy(false);
    }
  }

  function updateAddresses() {
    setBusy(true);
    try {
      if (!readManifest()) throw new Error("Manifesto non trovato: inserisci prima i dati di prova in questo browser.");
      const records = matchingRecords();
      assertOwned(records);
      if (records.students.length !== testStudentAddresses.length ||
        records.students.some((student) => {
          const fixture = testStudents.find((item) => item.id === student.id);
          return !fixture || student.firstName !== fixture.firstName || student.lastName !== fixture.lastName;
        })) {
        throw new Error("I tre studenti [TEST] non sono tutti presenti: nessun profilo nuovo creato.");
      }
      const lessonsBefore = JSON.stringify([loadCalendarAppointments(), loadCalendarSeries()]);
      let updated = 0;
      for (const location of testStudentAddresses) {
        const current = records.students.find((student) => student.id === location.id)!;
        if (current.address === location.address && current.postalCode === location.postalCode &&
          current.city === location.city && current.province === location.province) continue;
        if (!saveStoredStudent(location, { requirePersistent: true })) {
          throw new Error(`Aggiornamento non riuscito per ${current.firstName}. Puoi riprovare senza duplicazioni.`);
        }
        updated += 1;
      }
      const saved = matchingRecords().students;
      if (testStudentAddresses.some((location) => {
        const student = saved.find((item) => item.id === location.id);
        return !student || student.address !== location.address || student.postalCode !== location.postalCode ||
          student.city !== location.city || student.province !== location.province;
      }) || JSON.stringify([loadCalendarAppointments(), loadCalendarSeries()]) !== lessonsBefore) {
        throw new Error("Verifica dell'aggiornamento non riuscita. Controlla i dati nel browser.");
      }
      setMessage(updated ? `Indirizzi aggiornati per ${updated} studenti [TEST]. ID, lezioni e pagamenti conservati.` : "Indirizzi già aggiornati: nessuna modifica necessaria.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Aggiornamento non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  function prepareTransfer() {
    setBusy(true);
    try {
      if (!readManifest()) throw new Error("Inserisci prima i dati [TEST] in questo browser.");
      const students = loadStoredStudents();
      const giulia = students.find((student) => student.id === TEST_MANIFEST.students[0]);
      const lorenzo = students.find((student) => student.id === TEST_MANIFEST.students[1]);
      if (giulia?.firstName !== "Giulia" || giulia.lastName !== "Rossi [TEST]" ||
        lorenzo?.firstName !== "Lorenzo" || lorenzo.lastName !== "Bianchi [TEST]") {
        throw new Error("Gli studenti [TEST] richiesti non sono presenti: nessun dato creato.");
      }
      if (giulia.address !== testStudentAddresses[0].address || giulia.city !== testStudentAddresses[0].city ||
        lorenzo.address !== testStudentAddresses[1].address || lorenzo.city !== testStudentAddresses[1].city) {
        throw new Error("Aggiorna prima gli indirizzi [TEST] con il comando dedicato.");
      }
      const series = loadCalendarSeries().find((item) => item.id === TEST_MANIFEST.series[0]);
      if (!series || series.studentId !== giulia.id || series.startsOn !== "2026-10-19") {
        throw new Error("La ricorrenza [TEST] di Giulia non è disponibile.");
      }
      const existing = loadCalendarAppointments();
      const conflictingException = existing.find((item) => item.seriesId === series.id &&
        item.originalOccurrenceDate === "2026-10-19" && item.id !== TRANSFER_MANIFEST.giuliaExceptionId);
      if (conflictingException) throw new Error("Il 19 ottobre ha già un'eccezione diversa per Giulia: nessuna modifica.");
      const giuliaPrevious = existing.find((item) => item.id === TRANSFER_MANIFEST.giuliaExceptionId);
      const lorenzoPrevious = existing.find((item) => item.id === TRANSFER_MANIFEST.lorenzoAppointmentId);
      const transferMarker = window.localStorage.getItem(TRANSFER_MANIFEST_KEY);
      if ((transferMarker !== null && transferMarker !== JSON.stringify(TRANSFER_MANIFEST)) ||
        (!transferMarker && (giuliaPrevious || lorenzoPrevious)) ||
        (giuliaPrevious && (giuliaPrevious.studentId !== giulia.id || giuliaPrevious.seriesId !== series.id)) ||
        (lorenzoPrevious && lorenzoPrevious.studentId !== lorenzo.id)) {
        throw new Error("Un ID della prova è già occupato da un altro record.");
      }
      const giuliaLesson = createSingleOccurrenceException(
        series, "2026-10-19", TRANSFER_MANIFEST.giuliaExceptionId,
        { startTime: "15:00", durationMinutes: 60, mode: "domicilio", status: "confermata", hourlyRateCents: 2000, lessonAmountCents: 2000 },
      );
      if (!giuliaLesson) throw new Error("Impossibile preparare l'occorrenza di Giulia.");
      const lorenzoLesson = { ...transferLorenzoAppointment };
      const sameSchedule = giuliaPrevious?.date === "2026-10-19" && giuliaPrevious.startTime === "15:00" &&
        giuliaPrevious.durationMinutes === 60 && giuliaPrevious.mode === "domicilio" && giuliaPrevious.status === "confermata" &&
        giuliaPrevious.subject === "Matematica" && giuliaPrevious.lessonAmountCents === 2000 &&
        lorenzoPrevious?.date === "2026-10-19" && lorenzoPrevious.startTime === "16:30" &&
        lorenzoPrevious.durationMinutes === 60 && lorenzoPrevious.mode === "domicilio" && lorenzoPrevious.status === "confermata" &&
        lorenzoPrevious.subject === "Fisica" && lorenzoPrevious.lessonAmountCents === 2500;
      const proposed = selectOccurrencesInRange(
        [...existing.filter((item) => item.id !== giuliaLesson.id && item.id !== lorenzoLesson.id), giuliaLesson, lorenzoLesson],
        loadCalendarSeries(), "2026-10-19", "2026-10-19",
      );
      const giuliaIndex = proposed.findIndex((item) => item.appointmentId === giuliaLesson.id);
      if (giuliaIndex < 0 || proposed[giuliaIndex + 1]?.appointmentId !== lorenzoLesson.id) {
        throw new Error("Un'altra lezione cade tra le due lezioni [TEST]: nessuna modifica eseguita.");
      }
      if (sameSchedule) {
        setMessage("Prova trasferimento già pronta: le due lezioni conservano gli stessi ID.");
        return;
      }
      window.localStorage.setItem(TRANSFER_MANIFEST_KEY, JSON.stringify(TRANSFER_MANIFEST));
      const next = existing.filter((item) => item.id !== giuliaLesson.id && item.id !== lorenzoLesson.id);
      if (!saveCalendarAppointments([
        ...next,
        { ...giuliaLesson, paidAmountCents: giuliaPrevious?.paidAmountCents ?? giuliaLesson.paidAmountCents,
          paymentStatus: giuliaPrevious?.paymentStatus ?? giuliaLesson.paymentStatus },
        { ...lorenzoLesson, paidAmountCents: lorenzoPrevious?.paidAmountCents ?? lorenzoLesson.paidAmountCents,
          paymentStatus: lorenzoPrevious?.paymentStatus ?? lorenzoLesson.paymentStatus },
      ])) throw new Error("Salvataggio delle due lezioni non riuscito.");
      const occurrences = selectOccurrencesInRange(loadCalendarAppointments(), loadCalendarSeries(), "2026-10-19", "2026-10-19");
      const first = occurrences.find((item) => item.appointmentId === giuliaLesson.id);
      const second = occurrences.find((item) => item.appointmentId === lorenzoLesson.id);
      if (!first || !second || first.startTime !== "15:00" || second.startTime !== "16:30") {
        throw new Error("Verifica delle occorrenze non riuscita. Il manifesto resta disponibile.");
      }
      setMessage("Prova pronta: Giulia 15:00–16:00 e Lorenzo 16:30–17:30, lunedì 19 ottobre. Intervallo: 30 min.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Preparazione non riuscita.");
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    setBusy(true);
    try {
      if (!readManifest()) throw new Error("Manifesto non trovato: nessuna rimozione eseguita.");
      const programArchive = readProgramArchive(browserProgramSources());
      if (programArchive.status === "error") throw new Error("Archivio programmi non leggibile: nessuna rimozione eseguita.");
      if (programArchive.programs.some((program) => program.id === TEST_PROGRAM_PERSONAL_ID &&
        program.kind === "personal" && TEST_MANIFEST.students.some((id) => id === program.studentId))) {
        throw new Error("Rimuovi prima il programma personale TEST da PROGRAMMI per evitare un'associazione senza studente.");
      }
      const records = matchingRecords();
      assertOwned(records);
      const transferIds = window.localStorage.getItem(TRANSFER_MANIFEST_KEY) === JSON.stringify(TRANSFER_MANIFEST)
        ? [TRANSFER_MANIFEST.giuliaExceptionId, TRANSFER_MANIFEST.lorenzoAppointmentId]
        : [];
      const transferRecords = loadCalendarAppointments().filter((item) => transferIds.some((id) => id === item.id));
      if (transferRecords.some((item) => !TEST_MANIFEST.students.some((id) => id === item.studentId))) {
        throw new Error("Un record della prova trasferimento non appartiene agli studenti [TEST].");
      }
      const lines = [
        ...records.students.map((item) => `Studente: ${item.firstName} ${item.lastName} (${item.id})`),
        ...records.tariffs.map((item) => `Tariffa: ${item.code} (${item.id})`),
        ...records.appointments.map((item) => `Lezione: ${item.date} (${item.id})`),
        ...transferRecords.map((item) => `Lezione trasferimento: ${item.date} (${item.id})`),
        ...records.series.map((item) => `Ricorrenza: ${item.startsOn} (${item.id})`),
      ];
      if (!lines.length) {
        window.localStorage.removeItem(TEST_MANIFEST_KEY);
        window.localStorage.removeItem(TRANSFER_MANIFEST_KEY);
        setMessage("Nessun record di prova rimasto.");
        return;
      }
      if (!window.confirm(`Eliminare soltanto questi record di prova?\n\n${lines.join("\n")}`)) {
        setMessage("Eliminazione annullata: nessun dato modificato.");
        return;
      }
      if (!saveCalendarAppointments(loadCalendarAppointments().filter((item) => !TEST_MANIFEST.appointments.some((id) => id === item.id) && !transferIds.some((id) => id === item.id))) ||
        !saveCalendarSeries(loadCalendarSeries().filter((item) => !TEST_MANIFEST.series.some((id) => id === item.id))) ||
        !saveTariffs(loadTariffs().filter((item) => !TEST_MANIFEST.tariffs.some((id) => id === item.id))) ||
        !removeStoredStudentsByIds(TEST_MANIFEST.students)) {
        throw new Error("Rimozione incompleta. Il manifesto resta disponibile: riprova.");
      }
      if (Object.values(matchingRecords()).some((items) => items.length) ||
        loadCalendarAppointments().some((item) => transferIds.some((id) => id === item.id))) {
        throw new Error("Alcuni record risultano ancora presenti. Il manifesto resta disponibile.");
      }
      window.localStorage.removeItem(TEST_MANIFEST_KEY);
      window.localStorage.removeItem(TRANSFER_MANIFEST_KEY);
      setMessage("Rimossi soltanto i record elencati nel manifesto. Gli altri dati sono rimasti invariati.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rimozione non riuscita.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 620, margin: "3rem auto", padding: "1.5rem", color: "#51392f", fontFamily: "Georgia, serif" }}>
      <h1>Dati di prova del registro</h1>
      <p>Questa pagina locale di sviluppo inserisce dati sintetici soltanto nel browser in uso.</p>
      <p>Preparati: 3 studenti, 2 tariffe, 8 lezioni singole e una ricorrenza settimanale di 4 date. I recapiti sono fittizi.</p>
      <p>Gli indirizzi dei tre studenti [TEST] sono punti pubblici usati solo per simulare spostamenti; non rappresentano le loro abitazioni.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", margin: "1.5rem 0" }}>
        <button type="button" onClick={insert} disabled={busy}>INSERISCI DATI DI PROVA</button>
        <button type="button" onClick={insertPrograms} disabled={busy}>INSERISCI PROGRAMMI TEST</button>
        <button type="button" onClick={updateAddresses} disabled={busy}>AGGIORNA INDIRIZZI [TEST]</button>
        <button type="button" onClick={prepareTransfer} disabled={busy}>PREPARA PROVA TRASFERIMENTO</button>
        <button type="button" onClick={remove} disabled={busy}>ELIMINA DATI DI PROVA</button>
      </div>
      <p role="status" aria-live="polite">{message}</p>
      <p>Controlla i risultati in <Link href="/studenti/elenco">I miei studenti</Link>, <Link href="/lezioni/in-programma">In programma</Link>, <Link href="/studenti/diario">Diario studenti</Link>, <Link href="/tariffario">Tariffario</Link> e <Link href="/materie/programmi">Programmi</Link>.</p>
    </main>
  );
}
