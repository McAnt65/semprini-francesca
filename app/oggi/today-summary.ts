import { inspectLessonPayment } from "../data/calendario/calendar-payments";
import { appointmentWithChangedStatus } from "../data/calendario/calendar-status";
import { createSingleOccurrenceException } from "../data/calendario/calendar-recurrence";
import { selectDayOccurrences } from "../data/calendario/calendar-selectors";
import { loadCalendarAppointments, loadCalendarSeries, upsertCalendarAppointmentResult } from "../data/calendario/calendar-storage";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries } from "../data/calendario/calendar-types";

export type TodayLessonReference = Pick<CalendarOccurrence,
  "occurrenceId" | "date" | "appointmentId" | "seriesId" | "originalOccurrenceDate">;

/** Resolve the exact visible occurrence again before opening a read-only summary. */
export function findTodayLesson(reference: TodayLessonReference,
  appointments: CalendarAppointment[], series: CalendarSeries[]): CalendarOccurrence | null {
  return selectDayOccurrences(appointments, series, reference.date).find((lesson) =>
    lesson.status !== "annullata" && lesson.occurrenceId === reference.occurrenceId &&
    lesson.date === reference.date && lesson.appointmentId === reference.appointmentId &&
    lesson.seriesId === reference.seriesId &&
    lesson.originalOccurrenceDate === reference.originalOccurrenceDate) ?? null;
}

export function todayLessonSummary(lesson: CalendarOccurrence) {
  const payment = inspectLessonPayment(lesson);
  return {
    completed: lesson.status === "svolta",
    amountCents: lesson.lessonAmountCents,
    paidAmountCents: payment.paidAmountCents,
    outstandingCents: payment.outstandingCents,
    paymentReadable: payment.validLedger,
    paymentMismatch: payment.statusMismatch,
    notDue: lesson.paymentStatus === "non_dovuta",
  };
}

export type CompleteTodayLessonResult =
  | { status: "saved" | "temporary"; lesson: CalendarOccurrence }
  | { status: "unchanged"; lesson: CalendarOccurrence }
  | { status: "failed" | "stale" };

/** Re-read the exact occurrence before changing only its didactic status. */
export function completeTodayLesson(reference: TodayLessonReference): CompleteTodayLessonResult {
  const appointments = loadCalendarAppointments();
  const series = loadCalendarSeries();
  const current = findTodayLesson(reference, appointments, series);
  if (!current) return { status: "stale" };
  if (current.status === "svolta") return { status: "unchanged", lesson: current };

  const source = current.appointmentId
    ? appointments.find((item) => item.id === current.appointmentId)
    : series.find((item) => item.id === current.seriesId);
  const previousTime = source ? Date.parse(source.updatedAt) : 0;
  const timestamp = new Date(Math.max(Date.now(), Number.isFinite(previousTime) ? previousTime + 1 : 0)).toISOString();
  const updated = appointmentWithChangedStatus(
    current, "svolta", appointments, series, crypto.randomUUID(), timestamp,
  );
  if (!updated) return { status: "stale" };

  const result = upsertCalendarAppointmentResult(updated);
  if (result.status === "failed") return { status: "failed" };
  const saved = selectDayOccurrences(loadCalendarAppointments(), loadCalendarSeries(), updated.date)
    .find((item) => item.appointmentId === updated.id);
  return saved && saved.status === "svolta"
    ? { status: result.status, lesson: saved }
    : { status: "failed" };
}

export interface TodayTeachingDraft {
  originalCoveredTopic?: string;
  originalNotes: string;
  coveredTopic: string;
  notes: string;
}

export type SaveTodayTeachingResult =
  | { status: "saved" | "temporary" | "unchanged"; lesson: CalendarOccurrence }
  | { status: "failed" | "stale" | "conflict" };

/** Apply only fields edited in OGGI, rejecting concurrent edits to those same fields. */
export function saveTodayTeaching(reference: TodayLessonReference, draft: TodayTeachingDraft): SaveTodayTeachingResult {
  const appointments = loadCalendarAppointments();
  const series = loadCalendarSeries();
  const current = findTodayLesson(reference, appointments, series);
  if (!current) return { status: "stale" };

  const topic = draft.coveredTopic.trim();
  const notes = draft.notes.trim();
  const topicChanged = topic !== (draft.originalCoveredTopic ?? "");
  const notesChanged = notes !== draft.originalNotes;
  if (!topicChanged && !notesChanged) return { status: "unchanged", lesson: current };
  if ((topicChanged && current.coveredTopic !== draft.originalCoveredTopic) ||
      (notesChanged && current.notes !== draft.originalNotes)) return { status: "conflict" };

  const source = current.appointmentId
    ? appointments.find((item) => item.id === current.appointmentId)
    : series.find((item) => item.id === current.seriesId);
  if (!source) return { status: "stale" };
  const previousTime = Date.parse(source.updatedAt);
  const timestamp = new Date(Math.max(Date.now(), Number.isFinite(previousTime) ? previousTime + 1 : 0)).toISOString();
  const patch = { ...(topicChanged ? { coveredTopic: topic } : {}), ...(notesChanged ? { notes } : {}) };
  let updated: CalendarAppointment | null = null;
  if (current.appointmentId) {
    const appointment = appointments.find((item) => item.id === current.appointmentId);
    if (appointment) updated = { ...appointment, ...patch, updatedAt: timestamp };
  } else if (current.originalOccurrenceDate && current.seriesId) {
    const recurring = series.find((item) => item.id === current.seriesId);
    if (recurring) updated = createSingleOccurrenceException(recurring, current.originalOccurrenceDate,
      crypto.randomUUID(), patch, timestamp);
  }
  if (!updated) return { status: "stale" };

  const result = upsertCalendarAppointmentResult(updated);
  if (result.status === "failed") return { status: "failed" };
  const saved = selectDayOccurrences(loadCalendarAppointments(), loadCalendarSeries(), updated.date)
    .find((item) => item.appointmentId === updated.id);
  return saved ? { status: result.status, lesson: saved } : { status: "failed" };
}
