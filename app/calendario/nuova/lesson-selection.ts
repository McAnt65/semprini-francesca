import type { LessonMode, LessonStatus } from "../../data/calendario/calendar-types";
import type { CalendarAppointment, CalendarSeries } from "../../data/calendario/calendar-types";
import { checkLessonAvailability } from "../../data/calendario/calendar-availability";
import { isLocalDate } from "../../data/calendario/calendar-dates";
import type { StudentRecord } from "../../data/students";
import type { Tariff } from "../../data/tariffario/tariff-types";

export interface NewLessonDraft {
  studentId: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
  mode: LessonMode;
  status: LessonStatus;
  topic: string;
  notes: string;
  tariffId: string;
  hourlyRate: string;
  rateEdited?: boolean;
  weekly: boolean;
  intervalWeeks: string;
  endsOn: string;
  origin?: string | null;
  requestedStudent?: string | null;
  editing?: {
    href: string;
    originalDate: string;
    record: CalendarAppointment;
    exclude: { appointmentId?: string; seriesId?: string; originalOccurrenceDate?: string };
  };
}

const prefix = "semprini:new-lesson-draft:";
const maxAge = 24 * 60 * 60 * 1000;
const canonicalSubjects = ["Matematica", "Fisica", "Chimica"];
export function supportedSubjectsForStudent(subjects: string[]) {
  if (!subjects.length) return canonicalSubjects;
  return canonicalSubjects.filter((supported) => subjects.some((value) =>
    supported.localeCompare(value.trim(), "it", { sensitivity: "base" }) === 0));
}
const allowedDurations = [30, 45, 60, 75, 90, 120, 150, 180];

export function compatibleLessonTariff(tariff: Tariff, subject: string, mode: LessonMode) {
  return tariff.format === "singola" && tariff.mode === mode &&
    supportedSubjectsForStudent([tariff.subject])[0] === subject;
}

export function studentLessonProposal(student: StudentRecord, tariffs: Tariff[], chosenSubject?: string, chosenMode?: LessonMode) {
  const availableSubjects = supportedSubjectsForStudent(student.subjects);
  const subject = chosenSubject && availableSubjects.includes(chosenSubject) ? chosenSubject
    : availableSubjects.length === 1 ? availableSubjects[0] : "";
  const mode = chosenMode ?? student.lessonMode ?? "casa";
  const duration = String(allowedDurations.includes(student.lessonDurationMinutes ?? 0) ? student.lessonDurationMinutes : 60);
  const preferred = tariffs.find((item) => item.id === student.tariffId);
  const tariff = preferred && compatibleLessonTariff(preferred, subject, mode) ? preferred : null;
  const rateCents = tariff?.hourlyRateCents ??
    (typeof student.lessonRateCents === "number" && Number.isFinite(student.lessonRateCents) && student.lessonRateCents > 0
      ? student.lessonRateCents : null);
  return { subject, duration, mode, tariffId: tariff?.id ?? "",
    hourlyRate: rateCents === null ? "" : (rateCents / 100).toFixed(2) };
}

export function newLessonAmountCents(hourlyRate: string, duration: string) {
  if (!hourlyRate.trim()) return null;
  const rate = Number(hourlyRate.replace(",", "."));
  const minutes = Number(duration);
  return Number.isFinite(rate) && rate >= 0 && rate <= 10000 &&
    allowedDurations.includes(minutes) ? Math.round(Math.round(rate * 100) * minutes / 60) : null;
}
export function formatItalianLessonDate(value: string) {
  if (!isLocalDate(value)) return "";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(year, month - 1, day));
}
export function validSelectionToken(value: string | null): value is string {
  return Boolean(value && /^[a-f0-9-]{36}$/i.test(value));
}
export function calendarSelectionHref(view: "month" | "week" | "day", date: string, token: string) {
  const path = view === "month" ? "/calendario/mese" : `/calendario/${view === "week" ? "settimana" : "giorno"}`;
  return `${path}?data=${encodeURIComponent(date)}&seleziona=${encodeURIComponent(token)}`;
}
export function returnToNewLessonHref(token: string, date?: string, time?: string) {
  const editing = loadNewLessonDraft(token)?.editing;
  if (editing?.href.startsWith("/calendario/") && isLocalDate(editing.originalDate)) {
    const query = new URLSearchParams({ data: editing.originalDate, bozza: token });
    if (date) query.set("sceltaData", date);
    if (time) query.set("sceltaOra", time);
    return `${editing.href}${editing.href.includes("?") ? "&" : "?"}${query.toString()}`;
  }
  const query = new URLSearchParams({ bozza: token });
  if (date) query.set("data", date);
  if (time) query.set("ora", time);
  return `/calendario/nuova?${query.toString()}`;
}
export function evaluateCalendarSelection(draft: NewLessonDraft, date: string, time: string,
  appointments: CalendarAppointment[], series: CalendarSeries[]) {
  return checkLessonAvailability({
    date, startTime: time, durationMinutes: Number(draft.duration),
    recurrence: draft.weekly ? { intervalWeeks: Number(draft.intervalWeeks), endsOn: draft.endsOn || undefined } : undefined,
  }, appointments, series, draft.editing?.exclude);
}
export function saveNewLessonDraft(token: string, draft: NewLessonDraft): boolean {
  if (!validSelectionToken(token) || typeof window === "undefined") return false;
  try { window.sessionStorage.setItem(prefix + token, JSON.stringify({ savedAt: Date.now(), draft })); return true; }
  catch { return false; }
}
export function loadNewLessonDraft(token: string): NewLessonDraft | null {
  if (!validSelectionToken(token) || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(prefix + token);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const record = value as { savedAt?: unknown; draft?: unknown };
    if (typeof record.savedAt !== "number" || Date.now() - record.savedAt > maxAge ||
        !record.draft || typeof record.draft !== "object") { clearNewLessonDraft(token); return null; }
    const draft = record.draft as NewLessonDraft;
    if (typeof draft.studentId !== "string" || typeof draft.subject !== "string" ||
        typeof draft.date !== "string" || typeof draft.time !== "string" ||
        typeof draft.duration !== "string" || typeof draft.weekly !== "boolean") return null;
    return draft;
  } catch { return null; }
}
export function clearNewLessonDraft(token: string) {
  if (!validSelectionToken(token) || typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(prefix + token); } catch { /* Storage unavailable. */ }
}
