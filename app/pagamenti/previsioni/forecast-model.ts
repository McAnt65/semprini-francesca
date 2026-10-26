import { compareLocalDateTimes, endOfLocalMonth, formatLocalDate, isLocalDate, isLocalTime, parseLocalDate, startOfLocalMonth } from "../../data/calendario/calendar-dates";
import { inspectLessonPayment } from "../../data/calendario/calendar-payments";
import { selectOccurrencesInRange } from "../../data/calendario/calendar-selectors";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries, LocalDate, LocalTime } from "../../data/calendario/calendar-types";

export interface ForecastTotals {
  lessonCount: number;
  durationMinutes: number;
  valueCents: number;
  paidCents: number;
  outstandingCents: number;
}

export interface ForecastStudent extends ForecastTotals {
  studentId: string;
  name: string;
}

export interface ForecastMonth extends ForecastTotals {
  month: LocalDate;
  students: ForecastStudent[];
}

const emptyTotals = (): ForecastTotals => ({
  lessonCount: 0, durationMinutes: 0, valueCents: 0, paidCents: 0, outstandingCents: 0,
});

export function shiftForecastMonth(month: LocalDate, offset: number): LocalDate {
  const parsed = parseLocalDate(month);
  if (!parsed || !Number.isInteger(offset)) throw new Error("Mese non valido");
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1 + offset, 1));
  return formatLocalDate({ year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: 1 });
}

function occurrenceKey(item: CalendarOccurrence): string {
  return item.seriesId && item.originalOccurrenceDate
    ? `series:${item.seriesId}:${item.originalOccurrenceDate}`
    : item.appointmentId ? `appointment:${item.appointmentId}` : item.occurrenceId;
}

/** A duplicate exception for one series date resolves to the latest saved appointment. */
function uniqueOccurrences(occurrences: CalendarOccurrence[], appointments: CalendarAppointment[]) {
  const updatedAt = new Map(appointments.map((item) => [item.id, item.updatedAt]));
  const unique = new Map<string, { item: CalendarOccurrence; savedAt: string }>();
  for (const item of occurrences) {
    const key = occurrenceKey(item);
    const savedAt = item.appointmentId ? updatedAt.get(item.appointmentId) ?? "" : "";
    const previous = unique.get(key);
    if (!previous || savedAt >= previous.savedAt) unique.set(key, { item, savedAt });
  }
  return [...unique.values()].map(({ item }) => item);
}

function addLesson(totals: ForecastTotals, lesson: CalendarOccurrence) {
  const payment = inspectLessonPayment(lesson);
  totals.lessonCount += 1;
  totals.durationMinutes += lesson.durationMinutes;
  totals.valueCents += lesson.lessonAmountCents;
  totals.paidCents += payment.allocatedPaidCents;
  totals.outstandingCents += payment.outstandingCents;
}

/** Expands only the six displayed months; amounts come from saved occurrences, not current tariffs. */
export function selectForecastMonths(
  appointments: CalendarAppointment[], series: CalendarSeries[],
  firstMonth: LocalDate, today: LocalDate, nowTime: LocalTime,
): ForecastMonth[] {
  if (!isLocalDate(firstMonth) || !isLocalDate(today) || !isLocalTime(nowTime))
    throw new Error("Intervallo di previsione non valido");

  const start = startOfLocalMonth(firstMonth);
  const months: ForecastMonth[] = Array.from({ length: 6 }, (_, index) => ({
    month: shiftForecastMonth(start, index), ...emptyTotals(), students: [],
  }));
  const lastDay = endOfLocalMonth(months[5].month);
  const rangeStart = start > today ? start : today;
  if (rangeStart > lastDay) return months;

  const byMonth = new Map(months.map((month) => [month.month, month]));
  const byStudent = new Map<LocalDate, Map<string, ForecastStudent>>();
  const occurrences = uniqueOccurrences(selectOccurrencesInRange(appointments, series, rangeStart, lastDay), appointments);
  for (const lesson of occurrences) {
    if (lesson.status !== "confermata" || lesson.paymentStatus === "non_dovuta" ||
      compareLocalDateTimes(lesson.date, lesson.startTime, today, nowTime) <= 0) continue;
    const month = byMonth.get(startOfLocalMonth(lesson.date));
    if (!month) continue;
    addLesson(month, lesson);
    const students = byStudent.get(month.month) ?? new Map<string, ForecastStudent>();
    let student = students.get(lesson.studentId);
    if (!student) {
      student = { studentId: lesson.studentId, name: lesson.studentNameSnapshot, ...emptyTotals() };
      students.set(lesson.studentId, student);
      byStudent.set(month.month, students);
    }
    addLesson(student, lesson);
  }
  for (const month of months) {
    month.students = [...(byStudent.get(month.month)?.values() ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name, "it"));
  }
  return months;
}
