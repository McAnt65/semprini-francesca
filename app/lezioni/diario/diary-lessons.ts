import { createSingleOccurrenceException } from "../../data/calendario/calendar-recurrence";
import { selectDayOccurrences } from "../../data/calendario/calendar-selectors";
import { coveredTopicOf, plannedTopicOf, unclassifiedHistoricalTopicOf } from "../../data/calendario/calendar-topics";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries } from "../../data/calendario/calendar-types";

export type DiaryCriterion = "student" | "subject" | "text";
export type DiaryOrder = "recent" | "oldest";

export function filterAndSortDiary(lessons: CalendarOccurrence[], criterion: DiaryCriterion, query: string, order: DiaryOrder) {
  const term = query.trim().toLocaleLowerCase("it");
  return lessons.filter((lesson) => {
    const value = criterion === "student" ? lesson.studentNameSnapshot : criterion === "subject" ? lesson.subject
      : `${coveredTopicOf(lesson)} ${plannedTopicOf(lesson)} ${unclassifiedHistoricalTopicOf(lesson)} ${lesson.notes}`;
    return value.toLocaleLowerCase("it").includes(term);
  }).sort((a, b) => {
    const comparison = a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.occurrenceId.localeCompare(b.occurrenceId);
    return order === "recent" ? -comparison : comparison;
  });
}

export function appointmentWithUpdatedNotes(
  lesson: CalendarOccurrence,
  notes: string,
  appointments: CalendarAppointment[],
  series: CalendarSeries[],
  exceptionId: string,
  timestamp: string,
): CalendarAppointment | null {
  const current = selectDayOccurrences(appointments, series, lesson.date).find((item) => item.occurrenceId === lesson.occurrenceId);
  if (!current || current.status !== "svolta") return null;
  if (current.appointmentId) {
    const appointment = appointments.find((item) => item.id === current.appointmentId);
    return appointment ? { ...appointment, notes, updatedAt: timestamp } : null;
  }
  const source = series.find((item) => item.id === current.seriesId);
  return source && current.originalOccurrenceDate
    ? createSingleOccurrenceException(source, current.originalOccurrenceDate, exceptionId, { notes }, timestamp)
    : null;
}
