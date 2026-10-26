import { createSingleOccurrenceException } from "./calendar-recurrence";
import { selectDayOccurrences } from "./calendar-selectors";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries } from "./calendar-types";

/** Updates one appointment or one recurring occurrence without touching its lesson details. */
export function appointmentWithChangedStatus(
  selected: CalendarOccurrence,
  status: "svolta" | "confermata" | "attesa" | "richiesta",
  appointments: CalendarAppointment[],
  series: CalendarSeries[],
  exceptionId: string,
  timestamp: string,
): CalendarAppointment | null {
  const current = selectDayOccurrences(appointments, series, selected.date)
    .find((lesson) => lesson.occurrenceId === selected.occurrenceId);
  if (!current || current.status === "annullata") return null;
  if (current.appointmentId) {
    const source = appointments.find((lesson) => lesson.id === current.appointmentId);
    return source ? { ...source, status, updatedAt: timestamp } : null;
  }
  const source = series.find((lesson) => lesson.id === current.seriesId);
  return source && current.originalOccurrenceDate
    ? createSingleOccurrenceException(source, current.originalOccurrenceDate, exceptionId, { status }, timestamp)
    : null;
}

export function restoredLessonStatus(lesson: CalendarOccurrence, series: CalendarSeries[]) {
  const source = series.find((item) => item.id === lesson.seriesId);
  return source && source.status !== "svolta" && source.status !== "annullata"
    ? source.status : "confermata";
}
