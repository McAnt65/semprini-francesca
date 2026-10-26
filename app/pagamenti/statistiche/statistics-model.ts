import { compareLocalDateTimes, endOfLocalMonth, formatLocalDate, isLocalDate, isLocalTime } from "../../data/calendario/calendar-dates";
import { inspectLessonPayment, selectReceiptMonthTotals } from "../../data/calendario/calendar-payments";
import { selectOccurrencesInRange } from "../../data/calendario/calendar-selectors";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries, LessonMode, LocalDate, LocalTime } from "../../data/calendario/calendar-types";

export interface StatisticsPeriod { year: number; month: number | null }
export interface LessonStatistics {
  lessonCount: number;
  durationMinutes: number;
  valueCents: number;
  paidAttributedCents: number;
  outstandingCents: number;
}
export interface StudentStatistics extends LessonStatistics { studentId: string; name: string }
export interface StatisticsResult extends LessonStatistics {
  receivedCents: number;
  receiptCount: number;
  invalidLedgerIds: string[];
  students: StudentStatistics[];
  subjects: { name: string; count: number }[];
  modes: Record<LessonMode, number>;
  travelMinutesRecorded: number;
  lessonsWithTravelMinutes: number;
  kilometersRecorded: null;
  travelExpenseCents: null;
}

const emptyLessons = (): LessonStatistics => ({ lessonCount: 0, durationMinutes: 0,
  valueCents: 0, paidAttributedCents: 0, outstandingCents: 0 });

function periodBounds(period: StatisticsPeriod): { from: LocalDate; to: LocalDate } {
  if (!Number.isInteger(period.year) || period.year < 1 || period.year > 9999 ||
      (period.month !== null && (!Number.isInteger(period.month) || period.month < 1 || period.month > 12)))
    throw new Error("Periodo statistico non valido");
  const from = formatLocalDate({ year: period.year, month: period.month ?? 1, day: 1 });
  const to = period.month === null
    ? formatLocalDate({ year: period.year, month: 12, day: 31 }) : endOfLocalMonth(from);
  return { from, to };
}

/** Keep one saved version of each recurring exception before expanding occurrences or receipts. */
function uniqueAppointments(appointments: CalendarAppointment[]): CalendarAppointment[] {
  const byKey = new Map<string, CalendarAppointment>();
  for (const appointment of appointments) {
    const key = appointment.seriesId && appointment.originalOccurrenceDate
      ? `series:${appointment.seriesId}:${appointment.originalOccurrenceDate}` : `appointment:${appointment.id}`;
    const previous = byKey.get(key);
    if (!previous || appointment.updatedAt >= previous.updatedAt) byKey.set(key, appointment);
  }
  return [...byKey.values()];
}

function addLesson(total: LessonStatistics, lesson: CalendarOccurrence) {
  const payment = inspectLessonPayment(lesson);
  total.lessonCount += 1;
  total.durationMinutes += lesson.durationMinutes;
  total.valueCents += lesson.lessonAmountCents;
  total.paidAttributedCents += payment.allocatedPaidCents;
  total.outstandingCents += payment.outstandingCents;
}

/** Completed activity follows the effective local occurrence date; cash follows movement dates. */
export function selectPaymentStatistics(appointments: CalendarAppointment[], series: CalendarSeries[],
  period: StatisticsPeriod, today: LocalDate, nowTime: LocalTime): StatisticsResult {
  if (!isLocalDate(today) || !isLocalTime(nowTime)) throw new Error("Data o ora non valida");
  const { from, to } = periodBounds(period);
  const saved = uniqueAppointments(appointments);
  const result: StatisticsResult = { ...emptyLessons(), receivedCents: 0, receiptCount: 0,
    invalidLedgerIds: [], students: [], subjects: [], modes: { casa: 0, domicilio: 0, online: 0 },
    travelMinutesRecorded: 0, lessonsWithTravelMinutes: 0,
    kilometersRecorded: null, travelExpenseCents: null };
  const byStudent = new Map<string, StudentStatistics>();
  const bySubject = new Map<string, number>();

  for (const lesson of selectOccurrencesInRange(saved, series, from, to)) {
    if (lesson.status !== "svolta" || compareLocalDateTimes(lesson.date, lesson.startTime, today, nowTime) > 0) continue;
    addLesson(result, lesson);
    result.modes[lesson.mode] += 1;
    if (lesson.travelMinutes && lesson.travelMinutes > 0) {
      result.travelMinutesRecorded += lesson.travelMinutes;
      result.lessonsWithTravelMinutes += 1;
    }
    const subject = lesson.subject.trim();
    bySubject.set(subject, (bySubject.get(subject) ?? 0) + 1);
    const student = byStudent.get(lesson.studentId) ??
      { studentId: lesson.studentId, name: lesson.studentNameSnapshot, ...emptyLessons() };
    addLesson(student, lesson);
    byStudent.set(lesson.studentId, student);
  }
  result.students = [...byStudent.values()].sort((a, b) => a.name.localeCompare(b.name, "it"));
  result.subjects = [...bySubject].map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "it"));

  const receiptMonths = period.month === null ? Array.from({ length: 12 }, (_, index) => index + 1) : [period.month];
  const invalidIds = new Set<string>();
  for (const month of receiptMonths) {
    const date = formatLocalDate({ year: period.year, month, day: 1 });
    const receipts = selectReceiptMonthTotals(saved, date);
    result.receivedCents += receipts.receivedCents;
    result.receiptCount += receipts.movementCount;
    receipts.invalidLedgerIds.forEach((id) => invalidIds.add(id));
  }
  result.invalidLedgerIds = [...invalidIds];
  return result;
}

export function shiftStatisticsPeriod(period: StatisticsPeriod, offset: number): StatisticsPeriod {
  periodBounds(period);
  if (!Number.isInteger(offset)) throw new Error("Spostamento non valido");
  if (period.month === null) {
    const shifted = { year: period.year + offset, month: null };
    periodBounds(shifted);
    return shifted;
  }
  const index = period.year * 12 + period.month - 1 + offset;
  const shifted = { year: Math.floor(index / 12), month: index % 12 + 1 };
  periodBounds(shifted);
  return shifted;
}
