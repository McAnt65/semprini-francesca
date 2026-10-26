import { endOfLocalMonth, formatLocalDate, parseLocalDate, startOfLocalMonth } from "../../data/calendario/calendar-dates";
import { inspectLessonPayment, selectLessonMonthPaymentTotals, selectReceiptMonthTotals } from "../../data/calendario/calendar-payments";
import { selectOccurrencesInRange } from "../../data/calendario/calendar-selectors";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries, LocalDate } from "../../data/calendario/calendar-types";

export type SummaryFilter = "tutti" | "dovuti" | "saldati" | "studente";

export function parseEuroCents(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [euros, cents = ""] = normalized.split(".");
  const amount = Number(euros) * 100 + Number(cents.padEnd(2, "0"));
  return Number.isSafeInteger(amount) ? amount : null;
}

export function shiftSummaryMonth(month: LocalDate, offset: number): LocalDate {
  const parsed = parseLocalDate(month);
  if (!parsed || !Number.isInteger(offset)) throw new Error("Mese non valido");
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1 + offset, 1));
  return formatLocalDate({ year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: 1 });
}

export function selectSummaryData(appointments: CalendarAppointment[], series: CalendarSeries[],
  month: LocalDate, today: LocalDate) {
  const monthly = selectLessonMonthPaymentTotals(appointments, series, month, today);
  const receipts = selectReceiptMonthTotals(appointments, month);
  const completed = selectOccurrencesInRange(appointments, series, startOfLocalMonth(month), endOfLocalMonth(month))
    .filter((item) => item.status === "svolta");
  return { monthly, receipts, completed };
}

export function filterSummaryLessons(lessons: CalendarOccurrence[], filter: SummaryFilter, studentId = "") {
  return lessons.filter((lesson) => {
    const payment = inspectLessonPayment(lesson);
    if (filter === "dovuti") return payment.outstandingCents > 0;
    if (filter === "saldati") return payment.dueCents > 0 && payment.outstandingCents === 0;
    if (filter === "studente") return !studentId || lesson.studentId === studentId;
    return true;
  });
}
