import {
  CALENDAR_APPOINTMENTS_STORAGE_KEY, CALENDAR_SERIES_STORAGE_KEY,
  loadCalendarAppointments, loadCalendarSeries, normalizeCalendarAppointment, normalizeCalendarSeries,
} from "../data/calendario/calendar-storage";
import { inspectSavedLessonLocation } from "../data/lesson-location";
import { inspectStoredStudentsReadOnly } from "../data/student-storage";
import { inspectTariffsReadOnly } from "../data/tariffario/tariff-storage";
import { selectStudentsForSubject } from "../materie/studenti/student-selection";

export type CheckStatus = "completed" | "todo" | "unreadable";
export type SetupCheck = { label: string; status: CheckStatus; href: string; action: string };

function status(readable: boolean, done: boolean): CheckStatus {
  return !readable ? "unreadable" : done ? "completed" : "todo";
}

/** Check structure with the same normalizers used by calendar pages, without any save. */
function calendarArchiveReadable(key: string, normalize: (value: unknown) => unknown): boolean {
  if (typeof window === "undefined") return false;
  let available = false;
  let valid = true;
  for (const name of ["localStorage", "sessionStorage"] as const) {
    let raw: string | null;
    try {
      raw = window[name].getItem(key);
      available = true;
    } catch { continue; }
    if (raw === null) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.some((item) => !normalize(item))) valid = false;
    } catch { valid = false; }
  }
  return available && valid;
}

export function readSetupChecks(): SetupCheck[] {
  const studentArchive = inspectStoredStudentsReadOnly();
  const activeStudents = studentArchive.students.filter((item) => item.status !== "archived");
  const hasSubject = ["Matematica", "Fisica", "Chimica"].some((title) =>
    selectStudentsForSubject(activeStudents, title, false).length > 0);
  const tariffArchive = inspectTariffsReadOnly();
  const appointmentReadable = calendarArchiveReadable(CALENDAR_APPOINTMENTS_STORAGE_KEY, normalizeCalendarAppointment);
  const seriesReadable = calendarArchiveReadable(CALENDAR_SERIES_STORAGE_KEY, normalizeCalendarSeries);
  const lessons = appointmentReadable && seriesReadable
    ? [...loadCalendarAppointments(), ...loadCalendarSeries()] : [];
  const location = inspectSavedLessonLocation();

  return [
    { label: "Almeno uno studente attivo valido", status: status(studentArchive.readable, activeStudents.length > 0),
      href: "/studenti", action: "Apri STUDENTI" },
    { label: "Una materia associata a uno studente", status: status(studentArchive.readable, hasSubject),
      href: "/studenti", action: "Apri STUDENTI" },
    { label: "Una tariffa attiva utilizzabile", status: status(tariffArchive.readable,
      tariffArchive.tariffs.some((item) => item.active && item.hourlyRateCents > 0)),
      href: "/pagamenti/tariffario", action: "Apri TARIFFARIO" },
    { label: "Una lezione valida in calendario", status: status(appointmentReadable && seriesReadable,
      lessons.some((item) => item.status !== "annullata")),
      href: "/lezioni", action: "Apri LEZIONI" },
    { label: "Sede delle lezioni salvata", status: status(location.readable, location.configured),
      href: "/impostazioni", action: "Apri IMPOSTAZIONI" },
  ];
}
