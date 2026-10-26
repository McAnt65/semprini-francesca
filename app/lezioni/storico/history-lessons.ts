import { addDays, toLocalDate } from "../../data/calendario/calendar-dates";
import { selectOccurrencesInRange } from "../../data/calendario/calendar-selectors";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries } from "../../data/calendario/calendar-types";
import { summarizeStudentPayments } from "../../studenti/student-utils";

export type HistoryCriterion = "student" | "subject" | "period";
export type HistoryOrder = "recent" | "oldest";

export function selectCompletedLessons(
  appointments: CalendarAppointment[],
  series: CalendarSeries[],
  now: Date,
): CalendarOccurrence[] {
  const today = toLocalDate(now);
  const dates = [...appointments.map((item) => item.date), ...series.map((item) => item.startsOn)];
  const first = dates.sort()[0];
  if (!first || first > today) return [];

  // The calendar expander caps a single series at 2,000 occurrences per call.
  // Short windows keep a long running weekly series complete in the archive.
  const occurrences: CalendarOccurrence[] = [];
  for (let from = first; from <= today;) {
    const through = addDays(from, 365 * 5) < today ? addDays(from, 365 * 5) : today;
    occurrences.push(...selectOccurrencesInRange(appointments, series, from, through));
    from = addDays(through, 1);
  }
  return occurrences.filter((item) => item.status === "svolta" && item.date <= today);
}

export function filterAndSortHistory(
  lessons: CalendarOccurrence[],
  criterion: HistoryCriterion,
  query: string,
  from: string,
  through: string,
  order: HistoryOrder,
) {
  const term = query.trim().toLocaleLowerCase("it");
  return lessons.filter((item) => {
    if (criterion === "student") return item.studentNameSnapshot.toLocaleLowerCase("it").includes(term);
    if (criterion === "subject") return !term || item.subject.toLocaleLowerCase("it") === term;
    return (!from || item.date >= from) && (!through || item.date <= through);
  }).sort((a, b) => {
    const comparison = a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) ||
      a.occurrenceId.localeCompare(b.occurrenceId);
    return order === "recent" ? -comparison : comparison;
  });
}

export function lessonPaymentLabel(lesson: CalendarOccurrence) {
  if (lesson.paymentStatus === "non_dovuta") return "Non dovuta";
  return summarizeStudentPayments([lesson]).status;
}
